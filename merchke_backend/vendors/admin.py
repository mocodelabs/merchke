from django.contrib import admin
from .models import Vendor
from django.utils.html import format_html

@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ('brand_name', 'user', 'payout_method', 'logo_preview', 'is_active')
    search_fields = ('brand_name', 'user__username')

    
    def logo_preview(self, obj):
        if obj.logo:
            return format_html('<img src="{}" width="50" height="50" />', obj.logo.url)
        return "-"
    logo_preview.short_description = 'Logo'
