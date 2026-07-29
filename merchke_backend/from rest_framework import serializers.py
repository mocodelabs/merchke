from rest_framework import serializers
from django.contrib.auth.models import User
from .models import (
    UserProfile, Vendor, ProductCategory, Product, 
    Order, OrderItem, Payment, DeliveryOption, Payout
)

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = UserProfile
        fields = ['id', 'user', 'phone_number', 'is_vendor', 'preferred_theme']

class VendorSerializer(serializers.ModelSerializer):
    user_profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = Vendor
        fields = ['id', 'user_profile', 'brand_name', 'bio', 'profile_image']

class ProductCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductCategory
        fields = ['id', 'name', 'slug']

class ProductSerializer(serializers.ModelSerializer):
    vendor = VendorSerializer(read_only=True)
    category = ProductCategorySerializer(read_only=True)

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'price', 'stock', 
            'image', 'category', 'vendor', 'slug', 'created_at'
        ]

class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'quantity', 'unit_price']

class OrderSerializer(serializers.ModelSerializer):
    user_profile = UserProfileSerializer(read_only=True)
    items = OrderItemSerializer(source='orderitem_set', many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'user_profile', 'items', 'total_amount', 
            'status', 'delivery_mode', 'created_at'
        ]

class PaymentSerializer(serializers.ModelSerializer):
    order = OrderSerializer(read_only=True)

    class Meta:
        model = Payment
        fields = ['id', 'order', 'payment_method', 'amount_paid', 'payment_status', 'transaction_id', 'timestamp']

class DeliveryOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DeliveryOption
        fields = ['id', 'name', 'description', 'fee']

class PayoutSerializer(serializers.ModelSerializer):
    vendor = VendorSerializer(read_only=True)

    class Meta:
        model = Payout
        fields = ['id', 'vendor', 'amount', 'status', 'timestamp']
