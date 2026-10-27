from rest_framework import serializers
from .models import Vendor
from accounts.serializers import UserSerializer


class VendorSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    average_rating = serializers.ReadOnlyField()
    total_reviews = serializers.ReadOnlyField()
    products_count = serializers.SerializerMethodField()

    def get_products_count(self, obj):
        return obj.products.filter(is_active=True).count()

    class Meta:
        model = Vendor
        fields = [
            'id', 'user', 'vendor_type',
            'brand_name', 'store_name', 'slug', 'bio', 'tagline',
            'profile_image', 'logo', 'banner',
            'contact_email', 'phone_number', 'mpesa_phone',
            'instagram_handle', 'twitter_handle', 'tiktok_handle', 'website',
            'location', 'county',
            'payout_method', 'payout_account',
            'is_active', 'is_verified', 'is_featured',
            'average_rating', 'total_reviews', 'products_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['user', 'is_active', 'is_verified', 'is_featured', 'slug', 'created_at', 'updated_at']
