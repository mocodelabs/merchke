from rest_framework import serializers
from .models import Category, ListingFee, Product, ProductImage, ProductVariant, Wishlist


class ProductCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = [
            'id',
            'name', 'short_description', 'description',
            'product_type', 'category',
            'price', 'sale_price', 'stock',
            'image', 'is_active',
            'digital_file', 'download_limit',
        ]
        read_only_fields = ['id']

    def validate_is_active(self, value):
        # New listings only go live once the listing fee is paid.
        if value and self.instance is not None:
            fee = getattr(self.instance, 'listing_fee', None)
            if fee is not None and fee.status != 'paid':
                raise serializers.ValidationError('Pay the KSh 130 listing fee to publish this product.')
        return value


class ListingFeeSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_is_active = serializers.BooleanField(source='product.is_active', read_only=True)
    expires_at = serializers.SerializerMethodField()

    def get_expires_at(self, obj):
        from datetime import timedelta
        from django.conf import settings
        return obj.requested_at + timedelta(minutes=settings.LISTING_FEE_TIMEOUT_MINUTES)

    class Meta:
        model = ListingFee
        fields = ['id', 'product', 'product_name', 'product_is_active', 'amount', 'phone',
                  'status', 'error', 'requested_at', 'expires_at', 'paid_at']
        read_only_fields = fields


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'icon', 'image', 'description', 'parent', 'product_type']


class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'alt_text', 'is_primary', 'order']


class ProductVariantSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductVariant
        fields = ['id', 'size', 'color', 'custom_label', 'price_modifier', 'stock', 'sku']


class ProductSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)
    variants = ProductVariantSerializer(many=True, read_only=True)
    vendor_name = serializers.CharField(source='vendor.brand_name', read_only=True)
    vendor_slug = serializers.CharField(source='vendor.slug', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    effective_price = serializers.ReadOnlyField()
    discount_percent = serializers.ReadOnlyField()
    average_rating = serializers.ReadOnlyField()
    in_stock = serializers.ReadOnlyField()
    reviews_count = serializers.SerializerMethodField()
    has_digital_file = serializers.SerializerMethodField()
    digital_file_name = serializers.SerializerMethodField()
    vendor_type = serializers.CharField(source='vendor.vendor_type', read_only=True)
    listing_fee_status = serializers.SerializerMethodField()

    def get_listing_fee_status(self, obj):
        fee = getattr(obj, 'listing_fee', None)
        return fee.status if fee else None

    def get_reviews_count(self, obj):
        return obj.reviews.count()

    def get_has_digital_file(self, obj):
        return bool(obj.digital_file)

    def get_digital_file_name(self, obj):
        if obj.digital_file:
            return obj.digital_file.name.split('/')[-1]
        return None

    class Meta:
        model = Product
        fields = [
            'id', 'vendor_name', 'vendor_slug', 'vendor_type', 'category', 'category_name',
            'product_type', 'name', 'slug', 'description', 'short_description',
            'price', 'sale_price', 'effective_price', 'discount_percent',
            'stock', 'image', 'images', 'variants',
            'is_active', 'is_featured',
            'average_rating', 'reviews_count', 'in_stock',
            'views_count', 'sales_count',
            'download_limit', 'has_digital_file', 'digital_file_name',
            'listing_fee_status', 'created_at',
        ]
        read_only_fields = ['views_count', 'sales_count', 'created_at']


class WishlistSerializer(serializers.ModelSerializer):
    product_detail = ProductSerializer(source='product', read_only=True)

    class Meta:
        model = Wishlist
        fields = ['id', 'product', 'product_detail', 'added_at']
        read_only_fields = ['added_at']
