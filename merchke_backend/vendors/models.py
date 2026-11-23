from django.db import models
from django.conf import settings
from django.utils.text import slugify

VENDOR_TYPE_CHOICES = [
    ('artist', 'Artist / Musician'),
    ('dj', 'DJ'),
    ('creative', 'Creative (Podcast / Comedy / Content)'),
    ('jersey', 'Jersey Vendor'),
    ('brand', 'Local Brand'),
    ('events', 'Events Organizer'),
    ('digital', 'Digital Products'),
    ('makeup', 'Makeup Artist'),
    ('tattoo', 'Tattoo Artist'),
    ('biker', 'Biker / Moto Culture'),
    ('other', 'Other'),
]

class Vendor(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='vendor_profile'
    )
    vendor_type = models.CharField(
        max_length=30, choices=VENDOR_TYPE_CHOICES, default='brand'
    )
    brand_name = models.CharField(max_length=100)
    store_name = models.CharField(max_length=255, blank=True, null=True)
    slug = models.SlugField(unique=True, blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    tagline = models.CharField(max_length=200, blank=True, null=True)

    profile_image = models.ImageField(upload_to='vendor_profiles/', blank=True, null=True)
    logo = models.ImageField(upload_to='vendor_logos/', blank=True, null=True)
    banner = models.ImageField(upload_to='vendor_banners/', blank=True, null=True)

    contact_email = models.EmailField()
    phone_number = models.CharField(max_length=20, blank=True)
    mpesa_phone = models.CharField(
        max_length=20, blank=True,
        help_text='Safaricom number for listing fees and payouts',
    )
    instagram_handle = models.CharField(max_length=100, blank=True)
    twitter_handle = models.CharField(max_length=100, blank=True)
    tiktok_handle = models.CharField(max_length=100, blank=True)
    website = models.URLField(blank=True)

    location = models.CharField(max_length=100, blank=True, help_text='City/Town in Kenya')
    county = models.CharField(max_length=60, blank=True)

    payout_method = models.CharField(max_length=50, choices=[
        ('mpesa', 'M-Pesa'),
        ('paypal', 'PayPal'),
        ('flutterwave', 'Flutterwave'),
        ('bank', 'Bank Transfer')
    ], default='mpesa')
    payout_account = models.CharField(max_length=255, blank=True)

    commission_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=10.00,
        help_text='Platform commission % on sales'
    )

    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.brand_name or self.store_name or self.user.username) or "vendor"
            slug = base
            n = 1
            while Vendor.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{n}"
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.brand_name or self.store_name or self.user.username

    @property
    def display_name(self):
        return self.brand_name or self.store_name or self.user.username

    @property
    def average_rating(self):
        reviews = self.reviews.all()
        if not reviews.exists():
            return 0
        return round(sum(r.rating for r in reviews) / reviews.count(), 1)

    @property
    def total_reviews(self):
        return self.reviews.count()
