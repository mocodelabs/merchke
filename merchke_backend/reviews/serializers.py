from rest_framework import serializers
from .models import ProductReview, VendorReview


class ProductReviewSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = ProductReview
        fields = ['id', 'username', 'rating', 'title', 'body', 'is_verified_purchase', 'helpful_votes', 'created_at']
        read_only_fields = ['is_verified_purchase', 'helpful_votes', 'created_at']


class VendorReviewSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = VendorReview
        fields = ['id', 'username', 'rating', 'body', 'created_at']
        read_only_fields = ['created_at']
