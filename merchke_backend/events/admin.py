from django.contrib import admin

from .models import Event, EventAd, Ticket, TicketType


class TicketTypeInline(admin.TabularInline):
    model = TicketType
    extra = 0
    readonly_fields = ('tickets_sold',)


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('title', 'vendor', 'category', 'town', 'start_datetime', 'status', 'is_featured')
    list_filter = ('status', 'category', 'is_featured', 'town')
    list_editable = ('is_featured',)
    search_fields = ('title', 'venue_name', 'vendor__brand_name')
    inlines = [TicketTypeInline]


@admin.register(Ticket)
class TicketAdmin(admin.ModelAdmin):
    list_display = ('ticket_number', 'ticket_type', 'buyer', 'is_used', 'issued_at')
    list_filter = ('is_used',)
    search_fields = ('ticket_number', 'qr_token', 'buyer__username')
    readonly_fields = ('qr_token',)


@admin.register(EventAd)
class EventAdAdmin(admin.ModelAdmin):
    list_display = ('event', 'budget_ksh', 'payment_status', 'is_active', 'impressions', 'clicks', 'ends_at')
    list_filter = ('payment_status', 'is_active')
