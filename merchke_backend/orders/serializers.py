from rest_framework import serializers
from .models import Cart, CartItem, Order, OrderItem, Dispute


class CartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_image = serializers.ImageField(source='product.image', read_only=True)
    unit_price = serializers.ReadOnlyField()
    subtotal = serializers.ReadOnlyField()

    class Meta:
        model = CartItem
        fields = ['id', 'product', 'product_name', 'product_image', 'variant', 'quantity', 'unit_price', 'subtotal']


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total = serializers.ReadOnlyField()
    item_count = serializers.ReadOnlyField()

    class Meta:
        model = Cart
        fields = ['id', 'items', 'total', 'item_count', 'updated_at']


class OrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    subtotal = serializers.ReadOnlyField()

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'variant', 'vendor', 'quantity', 'unit_price', 'subtotal', 'download_url']


class DisputeSerializer(serializers.ModelSerializer):
    reason_display = serializers.CharField(source='get_reason_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Dispute
        fields = [
            'id', 'order', 'reason', 'reason_display',
            'description', 'status', 'status_display',
            'created_at', 'resolved_at', 'resolution_notes',
        ]
        read_only_fields = ['id', 'status', 'created_at', 'resolved_at', 'resolution_notes']


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    has_dispute = serializers.SerializerMethodField()

    def get_has_dispute(self, obj):
        return obj.disputes.filter(status__in=['open', 'under_review']).exists()

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'user',
            'delivery_mode', 'delivery_address', 'delivery_town',
            'delivery_county', 'delivery_phone',
            'status', 'notes',
            'subtotal', 'delivery_fee', 'total_amount',
            'buyer_confirmed_at', 'payout_status', 'has_dispute',
            'items', 'created_at', 'updated_at',
        ]
        read_only_fields = ['order_number', 'user', 'created_at', 'updated_at', 'buyer_confirmed_at', 'payout_status']
