from django.db import models
from orders.models import Order

PAYMENT_METHOD_CHOICES = [
    ('mpesa_stk', 'M-Pesa STK Push'),
    ('mpesa_paybill', 'M-Pesa PayBill'),
    ('mpesa_till', 'M-Pesa Till'),
    ('card', 'Card'),
    ('flutterwave', 'Flutterwave'),
    ('cash', 'Cash on Delivery'),
]

PAYMENT_STATUS_CHOICES = [
    ('pending', 'Pending'),
    ('initiated', 'Initiated'),
    ('completed', 'Completed'),
    ('failed', 'Failed'),
    ('cancelled', 'Cancelled'),
    ('refunded', 'Refunded'),
]


class Payment(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='payment')
    method = models.CharField(max_length=30, choices=PAYMENT_METHOD_CHOICES)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    commission_percent = models.DecimalField(max_digits=5, decimal_places=2, default=10)
    commission_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    vendor_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')

    # M-Pesa specific
    mpesa_phone = models.CharField(max_length=15, blank=True, help_text='Phone used for M-Pesa')
    mpesa_checkout_request_id = models.CharField(max_length=100, blank=True)
    mpesa_merchant_request_id = models.CharField(max_length=100, blank=True)
    transaction_reference = models.CharField(max_length=100, blank=True)
    mpesa_receipt_number = models.CharField(max_length=50, blank=True)

    processed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment for {self.order} — {self.status}"

    def calculate_split(self):
        self.commission_amount = round(self.total_amount * self.commission_percent / 100, 2)
        self.vendor_amount = round(self.total_amount - self.commission_amount, 2)


class MpesaCallback(models.Model):
    """Raw M-Pesa callback data for auditing"""
    checkout_request_id = models.CharField(max_length=100)
    result_code = models.IntegerField()
    result_desc = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    mpesa_receipt_number = models.CharField(max_length=50, blank=True)
    phone_number = models.CharField(max_length=15, blank=True)
    raw_payload = models.JSONField()
    received_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Callback {self.checkout_request_id} — {self.result_code}"
