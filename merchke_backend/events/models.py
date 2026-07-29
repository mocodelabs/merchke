from django.db import models
from django.utils.text import slugify
from vendors.models import Vendor

EVENT_STATUS_CHOICES = [
    ('draft', 'Draft'),
    ('published', 'Published'),
    ('sold_out', 'Sold Out'),
    ('cancelled', 'Cancelled'),
    ('completed', 'Completed'),
]


class Event(models.Model):
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='events')
    title = models.CharField(max_length=200)
    slug = models.SlugField(blank=True)
    description = models.TextField()
    short_description = models.CharField(max_length=300, blank=True)

    banner_image = models.ImageField(upload_to='events/')
    flyer = models.ImageField(upload_to='events/flyers/', blank=True, null=True)

    venue_name = models.CharField(max_length=200)
    venue_address = models.TextField()
    town = models.CharField(max_length=100, default='Nairobi')
    county = models.CharField(max_length=60, blank=True)
    google_maps_link = models.URLField(blank=True)

    start_datetime = models.DateTimeField()
    end_datetime = models.DateTimeField(null=True, blank=True)

    status = models.CharField(max_length=20, choices=EVENT_STATUS_CHOICES, default='draft')
    is_featured = models.BooleanField(default=False)

    # Categories/genres for discoverability
    genre = models.CharField(max_length=100, blank=True, help_text='e.g. Afrobeats, Comedy, Gospel')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['start_datetime']

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title) or "event"
            slug = base
            n = 1
            while Event.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{n}"
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title

    @property
    def total_tickets_sold(self):
        return sum(t.tickets_sold for t in self.ticket_types.all())

    @property
    def is_sold_out(self):
        return all(t.is_sold_out for t in self.ticket_types.all())


class TicketType(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='ticket_types')
    name = models.CharField(max_length=100, help_text='e.g. Early Bird, VIP, Regular')
    description = models.CharField(max_length=300, blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    total_quantity = models.PositiveIntegerField()
    tickets_sold = models.PositiveIntegerField(default=0)
    sale_start = models.DateTimeField(null=True, blank=True)
    sale_end = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.event.title} — {self.name}"

    @property
    def tickets_remaining(self):
        return self.total_quantity - self.tickets_sold

    @property
    def is_sold_out(self):
        return self.tickets_sold >= self.total_quantity


class Ticket(models.Model):
    """Individual ticket issued after payment"""
    ticket_type = models.ForeignKey(TicketType, on_delete=models.CASCADE, related_name='tickets')
    order_item = models.ForeignKey(
        'orders.OrderItem', on_delete=models.CASCADE, related_name='tickets', null=True, blank=True
    )
    buyer = models.ForeignKey('accounts.User', on_delete=models.CASCADE, related_name='tickets')
    ticket_number = models.CharField(max_length=30, unique=True, blank=True)
    qr_code = models.ImageField(upload_to='tickets/qr/', blank=True, null=True)
    is_used = models.BooleanField(default=False)
    used_at = models.DateTimeField(null=True, blank=True)
    issued_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.ticket_number or f"Ticket #{self.pk}"

    def save(self, *args, **kwargs):
        if not self.ticket_number:
            import uuid
            self.ticket_number = 'TKT' + uuid.uuid4().hex[:8].upper()
        super().save(*args, **kwargs)
