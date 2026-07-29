from django.db import models
from accounts.models import User
from products.models import Product, ProductVariant

ORDER_STATUS_CHOICES = [
    ('pending', 'Pending'),
    ('confirmed', 'Confirmed'),
    ('processing', 'Processing'),
    ('shipped', 'Shipped'),
    ('delivered', 'Delivered'),
    ('cancelled', 'Cancelled'),
    ('refunded', 'Refunded'),
]

DELIVERY_CHOICES = [
    ('pickup', 'Pickup'),
    ('delivery', 'Delivery'),
]


class Cart(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='cart', null=True, blank=True)
    session_key = models.CharField(max_length=100, blank=True, null=True, help_text='For guest carts')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Cart - {self.user or self.session_key}"

    @property
    def total(self):
        return sum(item.subtotal for item in self.items.all())

    @property
    def item_count(self):
        return sum(item.quantity for item in self.items.all())


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    variant = models.ForeignKey(ProductVariant, on_delete=models.SET_NULL, null=True, blank=True)
    quantity = models.PositiveIntegerField(default=1)

    @property
    def unit_price(self):
        base = self.product.effective_price
        if self.variant:
            return base + self.variant.price_modifier
        return base

    @property
    def subtotal(self):
        return self.unit_price * self.quantity

    def __str__(self):
        return f"{self.quantity}x {self.product.name}"


class Order(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
    order_number = models.CharField(max_length=30, unique=True, blank=True)

    # Shipping / delivery
    delivery_mode = models.CharField(max_length=50, choices=DELIVERY_CHOICES, default='delivery')
    delivery_address = models.TextField(blank=True)
    delivery_town = models.CharField(max_length=100, blank=True)
    delivery_county = models.CharField(max_length=60, blank=True)
    delivery_phone = models.CharField(max_length=20, blank=True)

    status = models.CharField(max_length=20, choices=ORDER_STATUS_CHOICES, default='pending')
    notes = models.TextField(blank=True)

    # Buyer protection
    buyer_confirmed_at = models.DateTimeField(null=True, blank=True, help_text='When buyer confirmed receipt')
    payout_status = models.CharField(
        max_length=20,
        choices=[('holding', 'Holding'), ('released', 'Released')],
        default='holding',
        help_text='Funds held until buyer confirms or 7 days after delivery',
    )

    # Totals (denormalized for speed)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    delivery_fee = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.order_number or f"Order #{self.pk}"

    def save(self, *args, **kwargs):
        if not self.order_number:
            import uuid
            self.order_number = 'MK' + uuid.uuid4().hex[:8].upper()
        super().save(*args, **kwargs)


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True)
    variant = models.ForeignKey(ProductVariant, on_delete=models.SET_NULL, null=True, blank=True)
    vendor = models.ForeignKey(
        'vendors.Vendor', on_delete=models.SET_NULL, null=True, related_name='order_items'
    )
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    # For digital products
    download_url = models.URLField(blank=True)
    download_count = models.PositiveIntegerField(default=0)

    @property
    def subtotal(self):
        return self.unit_price * self.quantity

    def __str__(self):
        return f"{self.quantity}x {self.product}"


class Dispute(models.Model):
    REASON_CHOICES = [
        ('not_received', 'Item not received'),
        ('wrong_item', 'Wrong item delivered'),
        ('damaged', 'Item arrived damaged'),
        ('not_as_described', 'Not as described'),
        ('digital_not_working', 'Digital file not working'),
        ('no_ticket', 'Event ticket not received'),
        ('other', 'Other'),
    ]
    STATUS_CHOICES = [
        ('open', 'Open'),
        ('under_review', 'Under Review'),
        ('resolved_refund', 'Resolved — Refund Issued'),
        ('resolved_no_action', 'Resolved — No Action Taken'),
        ('closed', 'Closed'),
    ]

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='disputes')
    buyer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='disputes')
    reason = models.CharField(max_length=30, choices=REASON_CHOICES)
    description = models.TextField()
    status = models.CharField(max_length=25, choices=STATUS_CHOICES, default='open')
    created_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolution_notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Dispute #{self.pk} — {self.order.order_number}"
