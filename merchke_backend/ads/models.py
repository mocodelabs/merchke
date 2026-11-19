from django.db import models
from django.utils import timezone

AD_TYPE_CHOICES = [
    ('banner', 'Category page banner'),
    ('featured_listing', 'Featured listing'),
    ('homepage_spotlight', 'Homepage spotlight'),
]

TARGET_PAGE_CHOICES = [
    ('home', 'Homepage'),
    ('store', 'Store'),
    ('events', 'Events'),
    ('football', 'Football'),
    ('jobs', 'Jobs'),
    ('hire', 'Hire'),
    ('podcasts', 'Podcasts'),
    ('all', 'All pages'),
]

# Minimum prepaid budget per ad type (KSh)
MIN_BUDGET = {'banner': 500, 'featured_listing': 300, 'homepage_spotlight': 1000}


class Ad(models.Model):
    PAYMENT_STATUS_CHOICES = [('pending', 'Pending'), ('paid', 'Paid'), ('failed', 'Failed')]

    vendor = models.ForeignKey('vendors.Vendor', on_delete=models.CASCADE, related_name='ads')
    ad_type = models.CharField(max_length=20, choices=AD_TYPE_CHOICES)
    target_page = models.CharField(max_length=20, choices=TARGET_PAGE_CHOICES, default='home')
    title = models.CharField(max_length=80)
    tagline = models.CharField(max_length=140, blank=True)
    image = models.ImageField(upload_to='ads/')
    link = models.CharField(max_length=300, help_text='https://... or a Merchke path like /vendors/my-store')
    budget_ksh = models.PositiveIntegerField()
    impressions = models.PositiveIntegerField(default=0)
    clicks = models.PositiveIntegerField(default=0)
    start_date = models.DateField(default=timezone.localdate)
    end_date = models.DateField()
    is_active = models.BooleanField(default=False, help_text='Turns on once the budget is paid')
    payment_status = models.CharField(max_length=10, choices=PAYMENT_STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.title} ({self.get_ad_type_display()})'
