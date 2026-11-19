from rest_framework import serializers
from .models import Event, EventAd, Ticket, TicketType


class TicketTypeSerializer(serializers.ModelSerializer):
    tickets_remaining = serializers.ReadOnlyField()
    is_sold_out = serializers.ReadOnlyField()

    class Meta:
        model = TicketType
        fields = [
            'id', 'name', 'description', 'price',
            'total_quantity', 'tickets_sold', 'tickets_remaining',
            'is_sold_out', 'sale_start', 'sale_end',
        ]
        read_only_fields = ['id', 'tickets_sold']


class TicketTypeCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TicketType
        fields = ['id', 'name', 'description', 'price', 'total_quantity', 'sale_start', 'sale_end']
        read_only_fields = ['id']


class EventSerializer(serializers.ModelSerializer):
    ticket_types = TicketTypeSerializer(many=True, read_only=True)
    vendor_name = serializers.CharField(source='vendor.brand_name', read_only=True)
    vendor_slug = serializers.CharField(source='vendor.slug', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    total_tickets_sold = serializers.ReadOnlyField()
    is_sold_out = serializers.ReadOnlyField()
    is_past = serializers.ReadOnlyField()
    min_price = serializers.ReadOnlyField()

    class Meta:
        model = Event
        fields = [
            'id', 'title', 'slug', 'description', 'short_description',
            'banner_image', 'flyer', 'vendor_name', 'vendor_slug',
            'venue_name', 'venue_address', 'town', 'county', 'google_maps_link',
            'start_datetime', 'end_datetime', 'status', 'category', 'category_display',
            'is_featured', 'genre', 'ticket_types', 'min_price',
            'total_tickets_sold', 'is_sold_out', 'is_past', 'created_at',
        ]


class EventCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = [
            'id', 'slug', 'title', 'description', 'short_description',
            'banner_image', 'flyer',
            'venue_name', 'venue_address', 'town', 'county', 'google_maps_link',
            'start_datetime', 'end_datetime', 'status', 'category', 'genre',
        ]
        read_only_fields = ['id', 'slug']

    def validate(self, attrs):
        start = attrs.get('start_datetime') or getattr(self.instance, 'start_datetime', None)
        end = attrs.get('end_datetime')
        if start and end and end < start:
            raise serializers.ValidationError({'end_datetime': 'The event must end after it starts.'})
        return attrs


class TicketSerializer(serializers.ModelSerializer):
    event_title = serializers.CharField(source='ticket_type.event.title', read_only=True)
    event_slug = serializers.CharField(source='ticket_type.event.slug', read_only=True)
    event_start = serializers.DateTimeField(source='ticket_type.event.start_datetime', read_only=True)
    venue_name = serializers.CharField(source='ticket_type.event.venue_name', read_only=True)
    town = serializers.CharField(source='ticket_type.event.town', read_only=True)
    ticket_type_name = serializers.CharField(source='ticket_type.name', read_only=True)
    price = serializers.DecimalField(source='ticket_type.price', max_digits=10, decimal_places=2, read_only=True)
    order_number = serializers.CharField(source='order.order_number', read_only=True, default=None)
    buyer_name = serializers.CharField(source='buyer.username', read_only=True)

    class Meta:
        model = Ticket
        fields = [
            'id', 'ticket_number', 'qr_token', 'event_title', 'event_slug', 'event_start',
            'venue_name', 'town', 'ticket_type_name', 'price', 'order_number', 'buyer_name',
            'is_used', 'used_at', 'issued_at',
        ]
        read_only_fields = fields


class EventAdSerializer(serializers.ModelSerializer):
    event_title = serializers.CharField(source='event.title', read_only=True)
    event_slug = serializers.CharField(source='event.slug', read_only=True)

    class Meta:
        model = EventAd
        fields = [
            'id', 'event', 'event_title', 'event_slug', 'ad_image', 'ad_copy', 'budget_ksh', 'days',
            'impressions', 'clicks', 'is_active', 'payment_status', 'starts_at', 'ends_at', 'created_at',
        ]
        read_only_fields = fields
