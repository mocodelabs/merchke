from django.contrib import admin, messages

from . import escrow as escrow_ops
from .models import EscrowTransaction, MpesaCallback, MpesaTransaction, Payment


@admin.register(EscrowTransaction)
class EscrowTransactionAdmin(admin.ModelAdmin):
    list_display = ('order', 'vendor', 'amount', 'vendor_amount', 'commission_amount',
                    'status', 'auto_release_at', 'created_at')
    list_filter = ('status',)
    search_fields = ('order__order_number', 'vendor__brand_name')
    readonly_fields = ('order', 'vendor', 'amount', 'commission_percent', 'commission_amount',
                       'vendor_amount', 'created_at', 'released_at', 'refunded_at')
    actions = ['release_to_vendor', 'refund_to_buyer']

    @admin.action(description='Release funds to vendor')
    def release_to_vendor(self, request, queryset):
        self._apply(request, queryset, escrow_ops.release, 'released')

    @admin.action(description='Refund buyer')
    def refund_to_buyer(self, request, queryset):
        self._apply(request, queryset, escrow_ops.refund, 'refunded')

    def _apply(self, request, queryset, op, verb):
        done = 0
        for escrow in queryset:
            try:
                op(escrow, note=f'Admin action by {request.user.username}.')
                done += 1
            except escrow_ops.EscrowError as exc:
                self.message_user(request, f'{escrow.order}: {exc}', messages.WARNING)
        if done:
            self.message_user(request, f'{done} escrow(s) {verb}.', messages.SUCCESS)


@admin.register(MpesaTransaction)
class MpesaTransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'purpose', 'reference_id', 'phone', 'amount', 'status',
                    'receipt_number', 'is_simulated', 'created_at')
    list_filter = ('purpose', 'status', 'is_simulated')
    search_fields = ('phone', 'checkout_request_id', 'receipt_number', 'account_reference')


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('order', 'method', 'total_amount', 'status', 'mpesa_receipt_number', 'processed_at')
    list_filter = ('status', 'method')


@admin.register(MpesaCallback)
class MpesaCallbackAdmin(admin.ModelAdmin):
    list_display = ('checkout_request_id', 'result_code', 'amount', 'mpesa_receipt_number', 'received_at')
