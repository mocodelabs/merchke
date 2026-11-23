from django.db import models

SERVICE_CATEGORY_CHOICES = [
    ('makeup', 'Makeup Artists'),
    ('tattoo', 'Tattoo Artists'),
    ('props', 'Video Props for Rent'),
    ('models', 'Models & Video Vixens'),
    ('bikers', 'Bikers & Moto Shows'),
    ('photography', 'Photographers'),
    ('videography', 'Videographers'),
    ('other', 'Other Creative Services'),
]

PROP_TYPE_CHOICES = [
    ('car', 'Cars'),
    ('location', 'Locations'),
    ('house', 'Houses'),
    ('park', 'Parks / Outdoor'),
    ('wardrobe', 'Wardrobe'),
    ('other', 'Other'),
]

# Listings in these categories are only shown for vendors Merchke has verified.
VERIFIED_ONLY_CATEGORIES = {'models'}


class Service(models.Model):
    vendor = models.ForeignKey('vendors.Vendor', on_delete=models.CASCADE, related_name='services')
    title = models.CharField(max_length=150)
    category = models.CharField(max_length=20, choices=SERVICE_CATEGORY_CHOICES)
    prop_type = models.CharField(max_length=20, choices=PROP_TYPE_CHOICES, blank=True)
    description = models.TextField()
    price_from = models.PositiveIntegerField(help_text='KSh')
    price_to = models.PositiveIntegerField(null=True, blank=True, help_text='KSh (optional)')
    price_unit = models.CharField(max_length=40, blank=True, help_text='e.g. per look, per day, per hour')
    city = models.CharField(max_length=100, default='Nairobi')
    booking_url = models.URLField(blank=True, help_text='Optional external booking link')
    booking_deposit = models.PositiveIntegerField(null=True, blank=True, help_text='KSh deposit, e.g. for tattoos')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.get_category_display()})"


class ServiceImage(models.Model):
    """Portfolio photos: makeup looks, flash art, prop cars, locations..."""
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='services/')
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']


class ServiceBooking(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('declined', 'Declined'),
    ]

    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='bookings')
    client = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='service_bookings',
    )
    client_name = models.CharField(max_length=120)
    client_phone = models.CharField(max_length=20)
    client_email = models.EmailField()
    date_requested = models.DateField()
    message = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.client_name} -> {self.service} on {self.date_requested}"
