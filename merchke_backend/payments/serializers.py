from rest_framework import serializers
from .models import EscrowTransaction, MpesaTransaction, Payment


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'id', 'order', 'method', 'total_amount',
            'commission_percent', 'commission_amount', 'vendor_amount',
            'status', 'mpesa_phone', 'mpesa_receipt_number',
            'transaction_reference', 'processed_at', 'created_at',
        ]
        read_only_fields = fields


class MpesaTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MpesaTransaction
        fields = [
            'id', 'purpose', 'reference_id', 'phone', 'amount', 'status',
            'result_desc', 'receipt_number', 'is_simulated', 'created_at', 'completed_at',
        ]
        read_only_fields = fields


class EscrowSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    vendor_name = serializers.CharField(source='vendor.brand_name', read_only=True, default=None)

    class Meta:
        model = EscrowTransaction
        fields = [
            'id', 'order', 'order_number', 'vendor', 'vendor_name',
            'amount', 'commission_percent', 'commission_amount', 'vendor_amount',
            'status', 'auto_release_at', 'created_at', 'released_at', 'refunded_at',
        ]
        read_only_fields = fields
