from django.contrib import admin

from .models import Ad


@admin.register(Ad)
class AdAdmin(admin.ModelAdmin):
    list_display = ('title', 'vendor', 'ad_type', 'target_page', 'budget_ksh', 'payment_status',
                    'is_active', 'impressions', 'clicks', 'start_date', 'end_date')
    list_filter = ('ad_type', 'target_page', 'payment_status', 'is_active')
    list_editable = ('is_active',)
    search_fields = ('title', 'vendor__brand_name')
