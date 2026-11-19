from rest_framework import serializers

from payments.serializers import EscrowSerializer
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
    product_name = serializers.CharField(source='product.name', read_only=True, default='(removed product)')
    product_image = serializers.ImageField(source='product.image', read_only=True, default=None)
    product_type = serializers.CharField(source='product.product_type', read_only=True, default=None)
    vendor_name = serializers.CharField(source='vendor.brand_name', read_only=True, default=None)
    variant_label = serializers.SerializerMethodField()
    subtotal = serializers.ReadOnlyField()

    def get_variant_label(self, obj):
        return str(obj.variant).split(' - ', 1)[-1] if obj.variant else None

    class Meta:
        model = OrderItem
        fields = [
            'id', 'product', 'product_name', 'product_image', 'product_type',
            'variant', 'variant_label', 'vendor', 'vendor_name',
            'quantity', 'unit_price', 'subtotal',
        ]


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
        read_only_fields = ['id', 'order', 'status', 'created_at', 'resolved_at', 'resolution_notes']


class OrderSerializer(serializers.ModelSerializer):
    from payments.serializers import EscrowSerializer  # noqa: E402 — avoids import cycle at module load

    items = OrderItemSerializer(many=True, read_only=True)
    escrow = EscrowSerializer(read_only=True, default=None)
    has_dispute = serializers.SerializerMethodField()
    is_ticket_order = serializers.SerializerMethodField()
    buyer_name = serializers.CharField(source='user.username', read_only=True)

    def get_has_dispute(self, obj):
        return any(d.status in ('open', 'under_review') for d in obj.disputes.all())

    def get_is_ticket_order(self, obj):
        return obj.tickets.exists()

    class Meta:
        model = Order
        fields = [
            'id', 'order_number', 'buyer_name',
            'delivery_mode', 'delivery_address', 'delivery_town',
            'delivery_county', 'delivery_phone',
            'status', 'notes',
            'subtotal', 'delivery_fee', 'total_amount',
            'buyer_confirmed_at', 'payout_status', 'has_dispute', 'is_ticket_order',
            'escrow', 'items', 'created_at', 'updated_at',
        ]
        read_only_fields = fields


class CheckoutLineSerializer(serializers.Serializer):
    product_id = serializers.IntegerField()
    variant_id = serializers.IntegerField(required=False, allow_null=True)
    quantity = serializers.IntegerField(min_value=1, max_value=50)


class CheckoutSerializer(serializers.Serializer):
    items = CheckoutLineSerializer(many=True)
    phone = serializers.CharField(max_length=20)
    delivery_mode = serializers.ChoiceField(choices=['delivery', 'pickup'], default='delivery')
    delivery_address = serializers.CharField(required=False, allow_blank=True, default='')
    delivery_town = serializers.CharField(required=False, allow_blank=True, default='')
    delivery_county = serializers.CharField(required=False, allow_blank=True, default='')
    delivery_phone = serializers.CharField(required=False, allow_blank=True, default='')
    notes = serializers.CharField(required=False, allow_blank=True, default='')
