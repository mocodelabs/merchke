from decimal import Decimal
from rest_framework import generics, filters, status as drf_status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, BasePermission
from django.shortcuts import get_object_or_404
from .models import Event, TicketType
from .serializers import EventSerializer, EventCreateSerializer, TicketTypeSerializer, TicketTypeCreateSerializer
from orders.models import Order


class IsVendor(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.is_vendor and
            hasattr(request.user, 'vendor_profile')
        )


# ── Public / Create ────────────────────────────────────────────────────────────

class EventListCreateView(generics.ListCreateAPIView):
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'venue_name', 'town', 'genre', 'vendor__brand_name']
    ordering_fields = ['start_datetime', 'created_at']
    ordering = ['start_datetime']
    parser_classes = [MultiPartParser, FormParser]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsVendor()]
        return [AllowAny()]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return EventCreateSerializer
        return EventSerializer

    def get_queryset(self):
        qs = Event.objects.filter(status='published').select_related('vendor').prefetch_related('ticket_types')
        town = self.request.query_params.get('town')
        if town:
            qs = qs.filter(town__iexact=town)
        genre = self.request.query_params.get('genre')
        if genre:
            qs = qs.filter(genre__icontains=genre)
        return qs

    def perform_create(self, serializer):
        serializer.save(vendor=self.request.user.vendor_profile)


class EventDetailView(generics.RetrieveAPIView):
    queryset = Event.objects.filter(status='published').select_related('vendor').prefetch_related('ticket_types')
    serializer_class = EventSerializer


# ── Vendor own-event management ────────────────────────────────────────────────

class EventOwnerListView(generics.ListAPIView):
    """All events belonging to the authenticated vendor (all statuses)."""
    permission_classes = [IsAuthenticated, IsVendor]
    serializer_class = EventSerializer

    def get_queryset(self):
        return Event.objects.filter(
            vendor=self.request.user.vendor_profile
        ).select_related('vendor').prefetch_related('ticket_types').order_by('-created_at')


class EventOwnerDetailView(generics.RetrieveUpdateAPIView):
    """GET + PATCH a vendor's own event."""
    permission_classes = [IsAuthenticated, IsVendor]
    parser_classes = [MultiPartParser, FormParser]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return EventCreateSerializer
        return EventSerializer

    def get_queryset(self):
        return Event.objects.filter(
            vendor=self.request.user.vendor_profile
        ).prefetch_related('ticket_types')


# ── Ticket type management ─────────────────────────────────────────────────────

class TicketTypeListCreateView(generics.ListCreateAPIView):
    """Add / list ticket types for an event owned by the authenticated vendor."""
    permission_classes = [IsAuthenticated, IsVendor]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TicketTypeCreateSerializer
        return TicketTypeSerializer

    def get_queryset(self):
        return TicketType.objects.filter(
            event__id=self.kwargs['event_id'],
            event__vendor=self.request.user.vendor_profile,
        )

    def perform_create(self, serializer):
        event = get_object_or_404(
            Event,
            id=self.kwargs['event_id'],
            vendor=self.request.user.vendor_profile,
        )
        serializer.save(event=event)


class TicketTypeDetailView(generics.DestroyAPIView):
    """Delete a ticket type owned by the authenticated vendor."""
    permission_classes = [IsAuthenticated, IsVendor]

    def get_object(self):
        return get_object_or_404(
            TicketType,
            id=self.kwargs['ticket_id'],
            event__id=self.kwargs['event_id'],
            event__vendor=self.request.user.vendor_profile,
        )


# ── Ticket purchase ────────────────────────────────────────────────────────────

class EventTicketPurchaseView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            event = Event.objects.get(id=pk, status='published')
        except Event.DoesNotExist:
            return Response({'error': 'Event not found'}, status=drf_status.HTTP_404_NOT_FOUND)

        ticket_type_id = request.data.get('ticket_type_id')
        quantity = int(request.data.get('quantity', 1))

        try:
            ticket_type = event.ticket_types.get(id=ticket_type_id)
        except TicketType.DoesNotExist:
            return Response({'error': 'Ticket type not found'}, status=drf_status.HTTP_404_NOT_FOUND)

        if ticket_type.is_sold_out:
            return Response({'error': 'This ticket type is sold out'}, status=drf_status.HTTP_400_BAD_REQUEST)

        if ticket_type.tickets_remaining < quantity:
            return Response(
                {'error': f'Only {ticket_type.tickets_remaining} ticket(s) remaining'},
                status=drf_status.HTTP_400_BAD_REQUEST,
            )

        total = Decimal(str(ticket_type.price)) * quantity
        order = Order.objects.create(
            user=request.user,
            subtotal=total,
            delivery_fee=Decimal('0'),
            total_amount=total,
            delivery_mode='pickup',
            notes=f'Event: {event.title} | {ticket_type.name} x{quantity}',
        )

        return Response({
            'order_id': order.id,
            'order_number': order.order_number,
            'total': str(total),
            'event_title': event.title,
            'ticket_type': ticket_type.name,
            'quantity': quantity,
        })
