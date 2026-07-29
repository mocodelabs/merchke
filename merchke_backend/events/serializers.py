from rest_framework import serializers
from .models import Event, TicketType, Ticket


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
    total_tickets_sold = serializers.ReadOnlyField()
    is_sold_out = serializers.ReadOnlyField()

    class Meta:
        model = Event
        fields = [
            'id', 'title', 'slug', 'description', 'short_description',
            'banner_image', 'flyer', 'vendor_name', 'vendor_slug',
            'venue_name', 'venue_address', 'town', 'county', 'google_maps_link',
            'start_datetime', 'end_datetime', 'status', 'is_featured',
            'genre', 'ticket_types', 'total_tickets_sold', 'is_sold_out',
            'created_at',
        ]


class EventCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'short_description',
            'banner_image', 'flyer',
            'venue_name', 'venue_address', 'town', 'county', 'google_maps_link',
            'start_datetime', 'end_datetime', 'status', 'genre',
        ]
        read_only_fields = ['id']
