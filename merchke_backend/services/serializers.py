from django.utils import timezone
from rest_framework import serializers

from .models import Service, ServiceBooking, ServiceImage


class ServiceImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceImage
        fields = ['id', 'image', 'order']


class ServiceSerializer(serializers.ModelSerializer):
    images = ServiceImageSerializer(many=True, read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    prop_type_display = serializers.CharField(source='get_prop_type_display', read_only=True)
    vendor_name = serializers.CharField(source='vendor.brand_name', read_only=True)
    vendor_slug = serializers.CharField(source='vendor.slug', read_only=True)
    vendor_verified = serializers.BooleanField(source='vendor.is_verified', read_only=True)
    vendor_rating = serializers.ReadOnlyField(source='vendor.average_rating')

    class Meta:
        model = Service
        fields = [
            'id', 'title', 'category', 'category_display', 'prop_type', 'prop_type_display',
            'description', 'price_from', 'price_to', 'price_unit', 'city',
            'booking_url', 'booking_deposit', 'is_active', 'images',
            'vendor_name', 'vendor_slug', 'vendor_verified', 'vendor_rating', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']
        # multipart forms would otherwise read a missing checkbox as False
        extra_kwargs = {'is_active': {'default': True}}

    def validate(self, attrs):
        price_from = attrs.get('price_from', getattr(self.instance, 'price_from', None))
        price_to = attrs.get('price_to', getattr(self.instance, 'price_to', None))
        if price_to is not None and price_from is not None and price_to < price_from:
            raise serializers.ValidationError({'price_to': 'Must be at least the starting price.'})
        return attrs


class ServiceBookingSerializer(serializers.ModelSerializer):
    service_title = serializers.CharField(source='service.title', read_only=True)

    class Meta:
        model = ServiceBooking
        fields = [
            'id', 'service', 'service_title', 'client_name', 'client_phone', 'client_email',
            'date_requested', 'message', 'status', 'created_at',
        ]
        read_only_fields = ['id', 'service', 'service_title', 'status', 'created_at']

    def validate_date_requested(self, value):
        if value < timezone.localdate():
            raise serializers.ValidationError('Pick a date from today onwards.')
        return value
