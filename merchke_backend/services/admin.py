from django.contrib import admin

from .models import Service, ServiceBooking, ServiceImage


class ServiceImageInline(admin.TabularInline):
    model = ServiceImage
    extra = 0


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ('title', 'vendor', 'category', 'city', 'price_from', 'is_active', 'created_at')
    list_filter = ('category', 'is_active', 'vendor__is_verified')
    search_fields = ('title', 'vendor__brand_name', 'city')
    inlines = [ServiceImageInline]


@admin.register(ServiceBooking)
class ServiceBookingAdmin(admin.ModelAdmin):
    list_display = ('client_name', 'service', 'date_requested', 'status', 'created_at')
    list_filter = ('status',)
