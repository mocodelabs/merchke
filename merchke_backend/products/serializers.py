from rest_framework import serializers
from .models import Category, Product, ProductImage, ProductVariant, Wishlist


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
            'id', 'vendor_name', 'vendor_slug', 'category', 'category_name',
            'product_type', 'name', 'slug', 'description', 'short_description',
            'price', 'sale_price', 'effective_price', 'discount_percent',
            'stock', 'image', 'images', 'variants',
            'is_active', 'is_featured',
            'average_rating', 'reviews_count', 'in_stock',
            'views_count', 'sales_count',
            'download_limit', 'has_digital_file', 'digital_file_name',
            'created_at',
        ]
        read_only_fields = ['views_count', 'sales_count', 'created_at']


class WishlistSerializer(serializers.ModelSerializer):
    product_detail = ProductSerializer(source='product', read_only=True)

    class Meta:
        model = Wishlist
        fields = ['id', 'product', 'product_detail', 'added_at']
        read_only_fields = ['added_at']
