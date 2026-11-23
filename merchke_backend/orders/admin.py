from django.contrib import admin, messages
from django.utils import timezone

from payments import escrow as escrow_ops
from .models import Dispute, Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('product', 'variant', 'vendor', 'quantity', 'unit_price')


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('order_number', 'user', 'status', 'total_amount', 'payout_status', 'created_at')
    list_filter = ('status', 'payout_status', 'delivery_mode')
    search_fields = ('order_number', 'user__username', 'user__email', 'delivery_phone')
    inlines = [OrderItemInline]


@admin.register(Dispute)
class DisputeAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'buyer', 'reason', 'status', 'created_at')
    list_filter = ('status', 'reason')
    search_fields = ('order__order_number', 'buyer__username')
    actions = ['resolve_refund', 'resolve_release']

    @admin.action(description='Resolve: refund buyer')
    def resolve_refund(self, request, queryset):
        self._resolve(request, queryset, escrow_ops.refund, 'resolved_refund')

    @admin.action(description='Resolve: release funds to vendor')
    def resolve_release(self, request, queryset):
        self._resolve(request, queryset, escrow_ops.release, 'resolved_no_action')

    def _resolve(self, request, queryset, op, new_status):
        for dispute in queryset.select_related('order'):
            escrow = getattr(dispute.order, 'escrow', None)
            try:
                if escrow:
                    op(escrow, note=f'Dispute #{dispute.pk} resolved by {request.user.username}.')
            except escrow_ops.EscrowError as exc:
                self.message_user(request, f'Dispute #{dispute.pk}: {exc}', messages.WARNING)
                continue
            dispute.status = new_status
            dispute.resolved_at = timezone.now()
            dispute.save(update_fields=['status', 'resolved_at'])
        self.message_user(request, 'Disputes updated.', messages.SUCCESS)
