from django.contrib import admin
from django.utils.html import format_html

from .models import Vendor


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ('brand_name', 'user', 'vendor_type', 'mpesa_phone', 'logo_preview',
                    'is_verified', 'is_featured', 'is_active')
    list_filter = ('vendor_type', 'is_verified', 'is_featured', 'is_active')
    list_editable = ('is_verified', 'is_featured')
    search_fields = ('brand_name', 'user__username', 'contact_email', 'mpesa_phone')

    @admin.display(description='Logo')
    def logo_preview(self, obj):
        if obj.logo:
            return format_html('<img src="{}" width="50" height="50" />', obj.logo.url)
        return "-"
