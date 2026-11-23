from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from .models import MIN_BUDGET, Ad


class AdSerializer(serializers.ModelSerializer):
    vendor_name = serializers.CharField(source='vendor.brand_name', read_only=True)
    ad_type_display = serializers.CharField(source='get_ad_type_display', read_only=True)
    click_url = serializers.SerializerMethodField()

    def get_click_url(self, obj):
        return f'/api/ads/{obj.pk}/click/'

    class Meta:
        model = Ad
        fields = [
            'id', 'ad_type', 'ad_type_display', 'target_page', 'title', 'tagline', 'image', 'link',
            'budget_ksh', 'impressions', 'clicks', 'start_date', 'end_date',
            'is_active', 'payment_status', 'vendor_name', 'click_url', 'created_at',
        ]
        read_only_fields = ['id', 'impressions', 'clicks', 'is_active', 'payment_status', 'created_at']

    def validate_link(self, value):
        value = value.strip()
        if not (value.startswith(('https://', 'http://')) or (value.startswith('/') and not value.startswith('//'))):
            raise serializers.ValidationError('Use a full https:// link or a Merchke path starting with /.')
        return value

    def validate(self, attrs):
        ad_type = attrs.get('ad_type')
        budget = attrs.get('budget_ksh', 0)
        minimum = MIN_BUDGET.get(ad_type, 500)
        if budget < minimum:
            raise serializers.ValidationError({'budget_ksh': f'Minimum budget for this ad is KSh {minimum:,}.'})
        start = attrs.get('start_date') or timezone.localdate()
        end = attrs.get('end_date')
        if start < timezone.localdate():
            raise serializers.ValidationError({'start_date': 'Start date cannot be in the past.'})
        if not end or end < start:
            raise serializers.ValidationError({'end_date': 'End date must be on or after the start date.'})
        if end - start > timedelta(days=90):
            raise serializers.ValidationError({'end_date': 'Ads can run for at most 90 days.'})
        return attrs
