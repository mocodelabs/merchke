from core.permissions import IsVendor
from rest_framework import generics, permissions, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models.functions import TruncMonth
from django.db.models import Sum, Count, Q
from django.utils import timezone
from datetime import datetime
from collections import OrderedDict

from .models import Vendor
from .serializers import VendorSerializer
from products.models import Product
from orders.models import Order


class VendorListView(generics.ListAPIView):
    serializer_class = VendorSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [filters.SearchFilter]
    search_fields = ['brand_name', 'store_name', 'bio', 'location', 'county']

    def get_queryset(self):
        qs = Vendor.objects.filter(is_active=True)
        if self.request.query_params.get('featured'):
            qs = qs.filter(is_featured=True)
        vendor_type = self.request.query_params.get('type')
        if vendor_type:
            qs = qs.filter(vendor_type=vendor_type)
        return qs.order_by('-is_featured', '-is_verified', '-created_at')


class VendorDetailBySlugView(generics.RetrieveAPIView):
    serializer_class = VendorSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'slug'
    queryset = Vendor.objects.filter(is_active=True)




class VendorProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = VendorSerializer
    permission_classes = [IsAuthenticated, IsVendor]
    parser_classes = [MultiPartParser, FormParser]

    def get_object(self):
        return self.request.user.vendor_profile


class VendorDashboardView(APIView):
    permission_classes = [IsAuthenticated, IsVendor]

    def get(self, request):
        from payments.models import EscrowTransaction

        vendor = request.user.vendor_profile
        products = Product.objects.filter(vendor=vendor)
        orders = Order.objects.filter(
            Q(items__vendor=vendor) | Q(escrow__vendor=vendor)
        ).exclude(status='pending').distinct()
        escrows = EscrowTransaction.objects.filter(vendor=vendor)

        def total(qs, field):
            return float(qs.aggregate(t=Sum(field))['t'] or 0)

        current_year = timezone.now().year
        monthly = (
            escrows.filter(created_at__year=current_year)
            .exclude(status='refunded')
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(order_count=Count('id'), revenue=Sum('vendor_amount'))
            .order_by('month')
        )
        stats = OrderedDict(
            (datetime(current_year, m, 1).strftime('%b'), {'orders': 0, 'revenue': 0})
            for m in range(1, 13)
        )
        for entry in monthly:
            stats[entry['month'].strftime('%b')] = {
                'orders': entry['order_count'],
                'revenue': float(entry['revenue'] or 0),
            }

        return Response({
            'products_count': products.count(),
            'pending_listing_fees': products.filter(listing_fee__status='pending').count(),
            'orders_count': orders.count(),
            'orders_to_ship': orders.filter(status__in=['confirmed', 'processing']).count(),
            'earnings': {
                'released': total(escrows.filter(status='released'), 'vendor_amount'),
                'held': total(escrows.filter(status='held'), 'vendor_amount'),
                'disputed': total(escrows.filter(status='disputed'), 'vendor_amount'),
                'commission_paid': total(escrows.filter(status='released'), 'commission_amount'),
            },
            # kept for the existing dashboard cards
            'total_revenue': total(escrows.filter(status='released'), 'vendor_amount'),
            'pending_orders': orders.filter(status__in=['confirmed', 'processing']).count(),
            'monthly_stats': stats,
        })
