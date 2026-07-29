import os
from rest_framework import generics, permissions, filters, status as drf_status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import FileResponse
from django.db import models as db_models
from django.shortcuts import get_object_or_404
from .models import Category, Product, ProductVariant, Wishlist, Report
from .serializers import CategorySerializer, ProductSerializer, ProductCreateSerializer, ProductVariantSerializer, WishlistSerializer


class IsVendor(permissions.BasePermission):
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            request.user.is_vendor and
            hasattr(request.user, 'vendor_profile')
        )


class CategoryListView(generics.ListAPIView):
    serializer_class = CategorySerializer

    def get_queryset(self):
        qs = Category.objects.filter(is_active=True, parent=None).prefetch_related('subcategories')
        product_type = self.request.query_params.get('product_type')
        if product_type:
            qs = qs.filter(product_type=product_type)
        return qs


class ProductListView(generics.ListCreateAPIView):
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description', 'vendor__brand_name', 'category__name']
    ordering_fields = ['price', 'created_at', 'sales_count', 'average_rating']
    ordering = ['-created_at']
    parser_classes = [MultiPartParser, FormParser]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ProductCreateSerializer
        return ProductSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated(), IsVendor()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        qs = Product.objects.filter(is_active=True).select_related('vendor', 'category')
        vendor_type = self.request.query_params.get('type')
        if vendor_type:
            qs = qs.filter(vendor__vendor_type=vendor_type)
        product_type = self.request.query_params.get('product_type')
        if product_type:
            qs = qs.filter(product_type=product_type)
        category = self.request.query_params.get('category')
        if category:
            qs = qs.filter(category__slug=category)
        featured = self.request.query_params.get('featured')
        if featured:
            qs = qs.filter(is_featured=True)
        return qs

    def perform_create(self, serializer):
        serializer.save(vendor=self.request.user.vendor_profile)


class WishlistView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = WishlistSerializer

    def get_queryset(self):
        return Wishlist.objects.filter(user=self.request.user).select_related(
            'product', 'product__vendor', 'product__category'
        ).prefetch_related('product__images', 'product__variants', 'product__reviews')

    def create(self, request, *args, **kwargs):
        product_id = request.data.get('product')
        if Wishlist.objects.filter(user=request.user, product_id=product_id).exists():
            return Response({'detail': 'Already in wishlist'}, status=drf_status.HTTP_200_OK)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class WishlistRemoveView(generics.DestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return get_object_or_404(Wishlist, user=self.request.user, product_id=self.kwargs['product_id'])


class ProductVariantCreateView(generics.CreateAPIView):
    serializer_class = ProductVariantSerializer
    permission_classes = [permissions.IsAuthenticated, IsVendor]

    def perform_create(self, serializer):
        product = get_object_or_404(
            Product, id=self.kwargs['product_id'], vendor=self.request.user.vendor_profile
        )
        serializer.save(product=product)


class ProductDetailView(generics.RetrieveAPIView):
    queryset = Product.objects.filter(is_active=True).select_related('vendor', 'category')
    serializer_class = ProductSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.views_count += 1
        instance.save(update_fields=['views_count'])
        return super().retrieve(request, *args, **kwargs)


class ProductOwnerView(generics.RetrieveUpdateAPIView):
    """GET + PATCH for a vendor's own product (includes inactive)."""
    permission_classes = [permissions.IsAuthenticated, IsVendor]
    parser_classes = [MultiPartParser, FormParser]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return ProductCreateSerializer
        return ProductSerializer

    def get_queryset(self):
        return Product.objects.filter(
            vendor=self.request.user.vendor_profile
        ).select_related('vendor', 'category').prefetch_related('images', 'variants', 'reviews')


class ProductVariantDetailView(generics.DestroyAPIView):
    """DELETE a variant that belongs to the requesting vendor."""
    serializer_class = ProductVariantSerializer
    permission_classes = [permissions.IsAuthenticated, IsVendor]

    def get_object(self):
        return get_object_or_404(
            ProductVariant,
            id=self.kwargs['variant_id'],
            product__id=self.kwargs['product_id'],
            product__vendor=self.request.user.vendor_profile,
        )


class VendorProductListView(generics.ListAPIView):
    """Products belonging to a specific vendor slug."""
    serializer_class = ProductSerializer

    def get_queryset(self):
        slug = self.kwargs.get('vendor_slug')
        return Product.objects.filter(
            is_active=True, vendor__slug=slug
        ).select_related('vendor', 'category')


class ReportProductView(APIView):
    """Authenticated buyer reports a product listing."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        product = get_object_or_404(Product, id=pk, is_active=True)
        reason = request.data.get('reason', '')
        description = request.data.get('description', '')
        valid_reasons = [r[0] for r in Report.REASON_CHOICES]
        if reason not in valid_reasons:
            return Response({'error': 'Invalid reason.'}, status=400)
        Report.objects.create(
            reporter=request.user,
            product=product,
            reason=reason,
            description=description,
        )
        return Response({'detail': 'Report submitted. Thank you.'}, status=201)


class DigitalProductDownloadView(APIView):
    """Serve a digital product's file after verifying purchase."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        product = get_object_or_404(Product, id=pk, product_type='digital', is_active=True)

        if not product.digital_file:
            return Response({'error': 'No file available for this product'}, status=drf_status.HTTP_404_NOT_FOUND)

        # Vendor always has access to their own file
        if hasattr(request.user, 'vendor_profile') and product.vendor == request.user.vendor_profile:
            return self._serve(product)

        # Buyer: check for any valid (non-cancelled/refunded) order containing this product
        from orders.models import OrderItem
        order_item = OrderItem.objects.filter(
            order__user=request.user,
            order__status__in=['pending', 'confirmed', 'processing', 'shipped', 'delivered'],
            product=product,
        ).first()

        if not order_item:
            return Response({'error': 'Purchase required to download this file'}, status=drf_status.HTTP_403_FORBIDDEN)

        if product.download_limit and order_item.download_count >= product.download_limit:
            return Response(
                {'error': f'Download limit of {product.download_limit} reached for this purchase'},
                status=drf_status.HTTP_403_FORBIDDEN,
            )

        order_item.download_count = db_models.F('download_count') + 1
        order_item.save(update_fields=['download_count'])

        return self._serve(product)

    def _serve(self, product):
        file_path = product.digital_file.path
        if not os.path.exists(file_path):
            return Response({'error': 'File not found on server'}, status=drf_status.HTTP_404_NOT_FOUND)
        filename = os.path.basename(file_path)
        return FileResponse(open(file_path, 'rb'), as_attachment=True, filename=filename)
