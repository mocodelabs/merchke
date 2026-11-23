from django.conf import settings
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


class MpesaTransaction(models.Model):
    """
    Every STK push the platform sends, whatever it pays for.

    `purpose` + `reference_id` say what the money is for; when Safaricom's
    callback confirms payment, payments.services dispatches to that purpose's
    handler (see PURPOSE_HANDLERS there).
    """
    PURPOSE_CHOICES = [
        ('order', 'Order checkout'),
        ('tickets', 'Event tickets'),
        ('listing_fee', 'Product listing fee'),
        ('job_fee', 'Job listing fee'),
        ('ad', 'Advert'),
        ('event_boost', 'Event boost'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    purpose = models.CharField(max_length=20, choices=PURPOSE_CHOICES)
    reference_id = models.PositiveIntegerField(help_text='PK of the object being paid for')
    metadata = models.JSONField(default=dict, blank=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='mpesa_transactions',
    )

    phone = models.CharField(max_length=15)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    account_reference = models.CharField(max_length=20)
    description = models.CharField(max_length=100)

    checkout_request_id = models.CharField(max_length=100, blank=True, db_index=True)
    merchant_request_id = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    result_desc = models.CharField(max_length=255, blank=True)
    receipt_number = models.CharField(max_length=50, blank=True)
    is_simulated = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_purpose_display()} #{self.reference_id} — KSh {self.amount} ({self.status})"


class EscrowTransaction(models.Model):
    """
    Buyer protection: money for an order is held here until the buyer
    confirms receipt (or the auto-release date passes), then released to the
    vendor minus the platform commission.
    """
    STATUS_CHOICES = [
        ('held', 'Held'),
        ('released', 'Released'),
        ('refunded', 'Refunded'),
        ('disputed', 'Disputed'),
    ]

    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='escrow')
    vendor = models.ForeignKey(
        'vendors.Vendor', on_delete=models.SET_NULL, null=True, related_name='escrow_transactions',
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    commission_percent = models.DecimalField(max_digits=5, decimal_places=2, default=10)
    commission_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    vendor_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='held')

    auto_release_at = models.DateTimeField(
        null=True, blank=True,
        help_text='Set when the order ships; funds auto-release at this time if the buyer has not acted.',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    released_at = models.DateTimeField(null=True, blank=True)
    refunded_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Escrow {self.order} — KSh {self.amount} ({self.status})"

    def calculate_split(self):
        self.commission_amount = round(self.amount * self.commission_percent / 100, 2)
        self.vendor_amount = round(self.amount - self.commission_amount, 2)
