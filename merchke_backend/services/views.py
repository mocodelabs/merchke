import django_filters
from django.conf import settings
from django.core.mail import send_mail
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status as drf_status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsVendor
from .models import VERIFIED_ONLY_CATEGORIES, Service, ServiceBooking, ServiceImage
from .serializers import ServiceBookingSerializer, ServiceSerializer

MAX_IMAGES = 8


def public_services():
    return Service.objects.filter(is_active=True, vendor__is_active=True).exclude(
        Q(category__in=VERIFIED_ONLY_CATEGORIES) & Q(vendor__is_verified=False)
    ).select_related('vendor').prefetch_related('images')


class ServiceFilter(django_filters.FilterSet):
    category = django_filters.CharFilter(field_name='category')
    prop_type = django_filters.CharFilter(field_name='prop_type')
    city = django_filters.CharFilter(field_name='city', lookup_expr='icontains')
    max_price = django_filters.NumberFilter(field_name='price_from', lookup_expr='lte')

    class Meta:
        model = Service
        fields = ['category', 'prop_type', 'city', 'max_price']


def _save_images(service, files):
    start = service.images.count()
    for i, f in enumerate(files[:max(0, MAX_IMAGES - start)]):
        ServiceImage.objects.create(service=service, image=f, order=start + i)


class ServiceListCreateView(generics.ListCreateAPIView):
    """
    GET: browse services (?category=makeup&city=Nairobi&search=).
    POST (vendor, multipart): create a service; attach portfolio photos as repeated `images`.
    """
    serializer_class = ServiceSerializer
    filterset_class = ServiceFilter
    search_fields = ['title', 'description', 'city', 'vendor__brand_name']
    ordering_fields = ['price_from', 'created_at']
    ordering = ['-created_at']
    parser_classes = [MultiPartParser, FormParser]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsVendor()]
        return [AllowAny()]

    def get_queryset(self):
        return public_services()

    def perform_create(self, serializer):
        service = serializer.save(vendor=self.request.user.vendor_profile)
        _save_images(service, self.request.FILES.getlist('images'))


class ServiceDetailView(generics.RetrieveAPIView):
    serializer_class = ServiceSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return public_services()


class MyServicesView(generics.ListAPIView):
    serializer_class = ServiceSerializer
    permission_classes = [IsAuthenticated, IsVendor]
    filter_backends = []

    def get_queryset(self):
        return Service.objects.filter(vendor=self.request.user.vendor_profile).prefetch_related('images')


class ServiceManageView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ServiceSerializer
    permission_classes = [IsAuthenticated, IsVendor]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return Service.objects.filter(vendor=self.request.user.vendor_profile)

    def perform_update(self, serializer):
        service = serializer.save()
        _save_images(service, self.request.FILES.getlist('images'))


class ServiceBookView(APIView):
    """Client requests a booking; the vendor is emailed."""
    permission_classes = [AllowAny]

    def post(self, request, pk):
        service = get_object_or_404(public_services(), pk=pk)
        serializer = ServiceBookingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        booking = serializer.save(
            service=service, client=request.user if request.user.is_authenticated else None,
        )

        vendor = service.vendor
        if vendor.contact_email:
            send_mail(
                subject=f'New booking request: {service.title}',
                message=(
                    f'Hi {vendor.display_name},\n\n'
                    f'{booking.client_name} wants to book "{service.title}" on {booking.date_requested:%a %d %b %Y}.\n\n'
                    f'Phone: {booking.client_phone}\nEmail: {booking.client_email}\n\n'
                    f'{booking.message}\n\n'
                    f'Confirm or decline: {settings.FRONTEND_URL}/dashboard?tab=bookings\n\n- Merchke'
                ),
                from_email=None,
                recipient_list=[vendor.contact_email],
                fail_silently=True,
            )
        return Response(
            {'detail': f'Request sent to {vendor.display_name}. They will contact you to confirm.',
             'booking': ServiceBookingSerializer(booking).data},
            status=drf_status.HTTP_201_CREATED,
        )


class VendorBookingsView(generics.ListAPIView):
    serializer_class = ServiceBookingSerializer
    permission_classes = [IsAuthenticated, IsVendor]
    filter_backends = []

    def get_queryset(self):
        return ServiceBooking.objects.filter(service__vendor=self.request.user.vendor_profile) \
            .select_related('service')


class VendorBookingUpdateView(APIView):
    """Vendor confirms or declines: {status: 'confirmed'|'declined'}. Client gets an email."""
    permission_classes = [IsAuthenticated, IsVendor]

    def patch(self, request, pk):
        booking = get_object_or_404(
            ServiceBooking.objects.select_related('service__vendor'),
            pk=pk, service__vendor=request.user.vendor_profile,
        )
        new_status = request.data.get('status')
        if new_status not in ('confirmed', 'declined'):
            return Response({'detail': 'Status must be confirmed or declined.'},
                            status=drf_status.HTTP_400_BAD_REQUEST)
        booking.status = new_status
        booking.save(update_fields=['status'])
        send_mail(
            subject=f'Your booking for {booking.service.title} was {new_status}',
            message=(
                f'Hi {booking.client_name},\n\n'
                f'{booking.service.vendor.display_name} has {new_status} your request for '
                f'{booking.date_requested:%a %d %b %Y}.\n\n- Merchke'
            ),
            from_email=None,
            recipient_list=[booking.client_email],
            fail_silently=True,
        )
        return Response(ServiceBookingSerializer(booking).data)
