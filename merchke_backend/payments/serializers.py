from rest_framework import serializers
from .models import Payment, MpesaCallback


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            'id', 'order', 'method', 'total_amount',
            'commission_percent', 'commission_amount', 'vendor_amount',
            'status', 'mpesa_phone', 'mpesa_receipt_number',
            'transaction_reference', 'processed_at', 'created_at',
        ]
        read_only_fields = [
            'commission_amount', 'vendor_amount', 'mpesa_receipt_number',
            'transaction_reference', 'processed_at', 'created_at',
        ]
