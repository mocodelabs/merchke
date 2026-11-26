import os

import django_filters
from django.db import models as db_models
from django.db import transaction
from django.http import FileResponse, HttpResponseRedirect
from django.shortcuts import get_object_or_404
from rest_framework import filters, generics, permissions, status as drf_status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsVendor
from payments.mpesa import MpesaError, normalize_phone
from .models import Category, ListingFee, Product, ProductVariant, Report, Wishlist
from .serializers import (
    CategorySerializer, ListingFeeSerializer, ProductCreateSerializer, ProductSerializer,
    ProductVariantSerializer, WishlistSerializer,
)
from .services import expire_if_stale, request_listing_fee
from .variants import expand_variant_data


class CategoryListView(generics.ListAPIView):
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = Category.objects.filter(is_active=True, parent=None).prefetch_related('subcategories')
        product_type = self.request.query_params.get('product_type')
        if product_type:
            qs = qs.filter(product_type=product_type)
        return qs


class ProductFilter(django_filters.FilterSet):
    type = django_filters.CharFilter(field_name='vendor__vendor_type')
    category = django_filters.CharFilter(field_name='category__slug')
    vendor = django_filters.CharFilter(field_name='vendor__slug')
    featured = django_filters.BooleanFilter(field_name='is_featured')
    min_price = django_filters.NumberFilter(field_name='price', lookup_expr='gte')
    max_price = django_filters.NumberFilter(field_name='price', lookup_expr='lte')

    class Meta:
        model = Product
        fields = ['product_type', 'type', 'category', 'vendor', 'featured', 'min_price', 'max_price']


class ProductListView(generics.ListCreateAPIView):
    """
    GET: public catalogue (?search=, ?type=, ?product_type=, ?category=, ?min_price= ...)
    POST: vendor creates a product. It stays hidden until the KSh 130 listing
    fee STK push is paid; the response carries the fee to poll.
    """
    filterset_class = ProductFilter
    search_fields = ['name', 'description', 'short_description', 'vendor__brand_name', 'category__name']
    ordering_fields = ['price', 'created_at', 'sales_count', 'views_count']
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
        return Product.objects.filter(is_active=True).select_related('vendor', 'category') \
            .prefetch_related('images', 'variants', 'reviews')

    def create(self, request, *args, **kwargs):
        vendor = request.user.vendor_profile
        raw_phone = request.data.get('mpesa_phone') or vendor.mpesa_phone or vendor.phone_number
        try:
            phone = normalize_phone(raw_phone)
        except MpesaError:
            return Response(
                {'mpesa_phone': ['Enter the M-Pesa number to charge the KSh 130 listing fee.']},
                status=drf_status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            product = serializer.save(vendor=vendor, is_active=False)
            if not vendor.mpesa_phone:
                vendor.mpesa_phone = phone
                vendor.save(update_fields=['mpesa_phone'])
        fee = request_listing_fee(product, phone, request.user)
        product.refresh_from_db()

        data = dict(serializer.data)
        data['is_active'] = product.is_active
        data['listing_fee'] = ListingFeeSerializer(fee).data
        return Response(data, status=drf_status.HTTP_201_CREATED)


class ListingFeeStatusView(APIView):
    """Vendor polls this every few seconds after creating a product."""
    permission_classes = [permissions.IsAuthenticated, IsVendor]

    def get(self, request, pk):
        fee = get_object_or_404(
            ListingFee.objects.select_related('product', 'vendor'),
            product_id=pk, vendor=request.user.vendor_profile,
        )
        expire_if_stale(fee)
        fee.refresh_from_db()
        return Response(ListingFeeSerializer(fee).data)


class ListingFeeRetryView(APIView):
    """Resend the STK push for an unpaid / expired listing fee."""
    permission_classes = [permissions.IsAuthenticated, IsVendor]

    def post(self, request, pk):
        product = get_object_or_404(Product, pk=pk, vendor=request.user.vendor_profile)
        fee = getattr(product, 'listing_fee', None)
        if fee is None or fee.status == 'paid':
            return Response({'detail': 'This listing has no unpaid fee.'}, status=drf_status.HTTP_400_BAD_REQUEST)
        try:
            phone = normalize_phone(request.data.get('mpesa_phone') or fee.phone)
        except MpesaError as exc:
            return Response({'detail': str(exc)}, status=drf_status.HTTP_400_BAD_REQUEST)
        fee = request_listing_fee(product, phone, request.user)
        return Response(ListingFeeSerializer(fee).data)


class VendorOwnProductListView(generics.ListAPIView):
    """All of the authenticated vendor's products, including unpaid/hidden ones."""
    serializer_class = ProductSerializer
    permission_classes = [permissions.IsAuthenticated, IsVendor]

    def get_queryset(self):
        return Product.objects.filter(vendor=self.request.user.vendor_profile) \
            .select_related('vendor', 'category', 'listing_fee') \
            .prefetch_related('images', 'variants', 'reviews')


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

    MAX_COMBINATIONS = 60

    def create(self, request, *args, **kwargs):
        product = get_object_or_404(
            Product, id=self.kwargs['product_id'], vendor=request.user.vendor_profile
        )
        # "S, M, XL" + "Black, Red" becomes one variant per combination (see variants.py).
        data = {key: request.data.get(key) for key in request.data}
        items = list(expand_variant_data(
            data,
            ProductVariant._meta.get_field('size').max_length,
            ProductVariant._meta.get_field('color').max_length,
        ))
        if len(items) > self.MAX_COMBINATIONS:
            return Response(
                {'detail': f'That makes {len(items)} size/colour combinations; the limit is '
                           f'{self.MAX_COMBINATIONS}. Split it into fewer options.'},
                status=drf_status.HTTP_400_BAD_REQUEST,
            )
        serializers_ = [self.get_serializer(data=item) for item in items]
        for serializer in serializers_:
            serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            for serializer in serializers_:
                serializer.save(product=product)
        payload = [s.data for s in serializers_]
        return Response(payload[0] if len(payload) == 1 else payload, status=drf_status.HTTP_201_CREATED)


class ProductDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    queryset = Product.objects.filter(is_active=True).select_related('vendor', 'category')
    serializer_class = ProductSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        Product.objects.filter(pk=instance.pk).update(views_count=db_models.F('views_count') + 1)
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


class ProductVariantDetailView(generics.UpdateAPIView, generics.DestroyAPIView):
    """PATCH (e.g. restock) or DELETE a variant that belongs to the requesting vendor."""
    serializer_class = ProductVariantSerializer
    permission_classes = [permissions.IsAuthenticated, IsVendor]
    http_method_names = ['patch', 'delete', 'options']

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
    permission_classes = [permissions.AllowAny]

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
            order__status__in=['confirmed', 'processing', 'shipped', 'delivered'],
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
        f = product.digital_file
        filename = os.path.basename(f.name)
        try:
            return FileResponse(f.open('rb'), as_attachment=True, filename=filename)
        except (FileNotFoundError, NotImplementedError):
            # Remote storage (Cloudinary): hand the client the file URL instead.
            try:
                return HttpResponseRedirect(f.url)
            except Exception:
                return Response({'error': 'File not found on server'}, status=drf_status.HTTP_404_NOT_FOUND)
