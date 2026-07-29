from rest_framework import generics, permissions, filters
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models.functions import TruncMonth
from django.db.models import Sum, Count
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


class IsVendor(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_vendor


class VendorProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = VendorSerializer
    permission_classes = [IsAuthenticated, IsVendor]
    parser_classes = [MultiPartParser, FormParser]

    def get_object(self):
        return self.request.user.vendor_profile


class VendorDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        vendor = request.user.vendor_profile
        products = Product.objects.filter(vendor=vendor)
        # Orders now linked via OrderItem.vendor
        orders = Order.objects.filter(items__vendor=vendor).distinct()

        total_revenue = sum(
            order.total_amount for order in orders if order.status == 'delivered'
        )
        pending_orders = orders.filter(status='pending').count()

        current_year = datetime.now().year
        monthly_data = (
            orders.filter(created_at__year=current_year)
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(order_count=Count('id'), revenue=Sum('total_amount'))
            .order_by('month')
        )

        stats = OrderedDict()
        for month in range(1, 13):
            key = datetime(current_year, month, 1).strftime("%b")
            stats[key] = {"orders": 0, "revenue": 0}

        for entry in monthly_data:
            month_str = entry["month"].strftime("%b")
            stats[month_str]["orders"] = entry["order_count"]
            stats[month_str]["revenue"] = float(entry["revenue"] or 0)

        return Response({
            "products_count": products.count(),
            "orders_count": orders.count(),
            "total_revenue": total_revenue,
            "pending_orders": pending_orders,
            "monthly_stats": stats,
        })
