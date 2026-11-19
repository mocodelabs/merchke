from django.db import models
from django.utils import timezone

from core.storage import raw_file_storage
from vendors.models import Vendor

PRODUCT_TYPE_CHOICES = [
    ('physical', 'Physical Product'),
    ('digital', 'Digital Download'),
    ('ticket', 'Event Ticket'),
]

class Category(models.Model):
    PRODUCT_TYPE_CHOICES = [
        ('physical', 'Physical Product'),
        ('digital', 'Digital Download'),
        ('ticket', 'Event Ticket'),
    ]

    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    parent = models.ForeignKey(
        'self', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='subcategories'
    )
    icon = models.CharField(max_length=50, blank=True, help_text='Emoji or icon name')
    image = models.ImageField(upload_to='categories/', blank=True, null=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0)
    product_type = models.CharField(
        max_length=20, choices=PRODUCT_TYPE_CHOICES, blank=True, default='',
        help_text='Leave blank to show in all product types'
    )

    class Meta:
        verbose_name_plural = 'Categories'
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class Product(models.Model):
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='products')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='products')
    product_type = models.CharField(max_length=20, choices=PRODUCT_TYPE_CHOICES, default='physical')

    name = models.CharField(max_length=200)
    slug = models.SlugField(blank=True, null=True)
    description = models.TextField()
    short_description = models.CharField(max_length=300, blank=True)

    price = models.DecimalField(max_digits=10, decimal_places=2)
    sale_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    stock = models.PositiveIntegerField(default=0)

    image = models.ImageField(upload_to='products/')
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)

    # Digital product fields
    digital_file = models.FileField(
        upload_to='digital_products/', storage=raw_file_storage, blank=True, null=True,
    )
    download_limit = models.PositiveIntegerField(
        null=True, blank=True,
        help_text='Max downloads per purchase. Leave blank for unlimited.'
    )

    # Metrics
    views_count = models.PositiveIntegerField(default=0)
    sales_count = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    @property
    def effective_price(self):
        return self.sale_price if self.sale_price else self.price

    @property
    def discount_percent(self):
        if self.sale_price and self.price:
            return int(((self.price - self.sale_price) / self.price) * 100)
        return 0

    @property
    def average_rating(self):
        reviews = self.reviews.all()
        if not reviews.exists():
            return 0
        return round(sum(r.rating for r in reviews) / reviews.count(), 1)

    @property
    def in_stock(self):
        return self.stock > 0 or self.product_type == 'digital'


class ListingFee(models.Model):
    """KSh 130 a vendor pays (via STK push) before a new product goes live."""
    STATUS_CHOICES = [
        ('pending', 'Awaiting payment'),
        ('paid', 'Paid'),
        ('failed', 'Payment cancelled/failed'),
        ('expired', 'Expired'),
    ]

    product = models.OneToOneField(Product, on_delete=models.CASCADE, related_name='listing_fee')
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='listing_fees')
    amount = models.DecimalField(max_digits=8, decimal_places=2)
    phone = models.CharField(max_length=15, blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    mpesa_transaction = models.ForeignKey(
        'payments.MpesaTransaction', on_delete=models.SET_NULL, null=True, blank=True, related_name='+',
    )
    error = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    requested_at = models.DateTimeField(default=timezone.now, help_text='Last time an STK push was sent')
    paid_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Listing fee — {self.product.name} ({self.status})"


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='products/gallery/')
    alt_text = models.CharField(max_length=200, blank=True)
    is_primary = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.product.name} - Image {self.order}"


class ProductVariant(models.Model):
    """Size/colour variants for physical products (e.g. jerseys, merch)"""
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
    size = models.CharField(max_length=20, blank=True, help_text='e.g. S, M, L, XL, 2XL')
    color = models.CharField(max_length=50, blank=True)
    custom_label = models.CharField(max_length=100, blank=True, help_text='e.g. "Home Kit", "Away Kit"')
    price_modifier = models.DecimalField(
        max_digits=8, decimal_places=2, default=0,
        help_text='Additional cost on top of base price'
    )
    stock = models.PositiveIntegerField(default=0)
    sku = models.CharField(max_length=100, blank=True)

    def __str__(self):
        parts = [self.product.name]
        if self.size:
            parts.append(self.size)
        if self.color:
            parts.append(self.color)
        return ' - '.join(parts)


class Wishlist(models.Model):
    user = models.ForeignKey(
        'accounts.User', on_delete=models.CASCADE, related_name='wishlist'
    )
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'product')


class Report(models.Model):
    REASON_CHOICES = [
        ('counterfeit', 'Counterfeit / fake product'),
        ('scam', 'Suspected scam or fraud'),
        ('wrong_category', 'Listed in wrong category'),
        ('inappropriate', 'Inappropriate content'),
        ('not_delivered', 'Vendor not fulfilling orders'),
        ('other', 'Other'),
    ]

    reporter = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, related_name='reports'
    )
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='reports')
    reason = models.CharField(max_length=30, choices=REASON_CHOICES)
    description = models.TextField(blank=True)
    is_reviewed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Report on {self.product.name} — {self.reason}"
