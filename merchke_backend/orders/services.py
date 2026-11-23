"""Checkout: turn a cart into paid, escrow-protected orders."""
from collections import OrderedDict
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.db.models import F
from django.utils import timezone

from products.models import Product, ProductVariant
from .models import Order, OrderItem

DELIVERY_FEE_KSH = Decimal('200')


class CheckoutError(Exception):
    pass


def build_orders(user, *, items, delivery):
    """
    Validate cart lines against live prices/stock and create one pending
    Order per vendor. Returns the list of orders (inside the caller's atomic block).
    """
    if not items:
        raise CheckoutError('Your cart is empty.')

    lines_by_vendor = OrderedDict()
    for line in items:
        try:
            product = Product.objects.select_related('vendor').get(pk=line['product_id'], is_active=True)
        except Product.DoesNotExist:
            raise CheckoutError('One of the items in your cart is no longer available.')
        quantity = int(line.get('quantity') or 1)
        if quantity < 1:
            raise CheckoutError('Quantities must be at least 1.')

        variant = None
        if line.get('variant_id'):
            variant = ProductVariant.objects.filter(pk=line['variant_id'], product=product).first()
            if not variant:
                raise CheckoutError(f'Pick a valid size/option for {product.name}.')
        if product.product_type == 'physical':
            available = variant.stock if variant else product.stock
            if available < quantity:
                raise CheckoutError(f'Only {available} left of {product.name}.')

        unit_price = product.effective_price + (variant.price_modifier if variant else 0)
        lines_by_vendor.setdefault(product.vendor, []).append((product, variant, quantity, unit_price))

    mode = delivery.get('delivery_mode') or 'delivery'
    orders = []
    for vendor, lines in lines_by_vendor.items():
        needs_shipping = any(p.product_type == 'physical' for p, _, _, _ in lines)
        subtotal = sum((price * qty for _, _, qty, price in lines), Decimal('0'))
        fee = DELIVERY_FEE_KSH if needs_shipping and mode == 'delivery' else Decimal('0')
        order = Order.objects.create(
            user=user,
            delivery_mode=mode if needs_shipping else 'pickup',
            delivery_address=delivery.get('delivery_address', ''),
            delivery_town=delivery.get('delivery_town', ''),
            delivery_county=delivery.get('delivery_county', ''),
            delivery_phone=delivery.get('delivery_phone', ''),
            notes=delivery.get('notes', ''),
            subtotal=subtotal,
            delivery_fee=fee,
            total_amount=subtotal + fee,
        )
        OrderItem.objects.bulk_create([
            OrderItem(order=order, product=p, variant=v, vendor=vendor, quantity=q, unit_price=price)
            for p, v, q, price in lines
        ])
        orders.append(order)
    return orders


def on_order_paid(txn):
    """Payment handler for purpose='order' (runs inside complete_transaction's atomic block)."""
    from payments.escrow import hold_funds
    from payments.models import Payment

    for order in Order.objects.select_for_update().filter(pk__in=txn.metadata.get('order_ids', [])):
        if order.status != 'pending':
            continue
        payment, _ = Payment.objects.get_or_create(
            order=order,
            defaults={'method': 'mpesa_stk', 'total_amount': order.total_amount},
        )
        payment.method = 'mpesa_stk'
        payment.total_amount = order.total_amount
        payment.status = 'completed'
        payment.mpesa_phone = txn.phone
        payment.mpesa_checkout_request_id = txn.checkout_request_id
        payment.mpesa_receipt_number = txn.receipt_number
        payment.transaction_reference = txn.receipt_number
        payment.processed_at = timezone.now()
        payment.calculate_split()
        payment.save()

        items = list(order.items.select_related('product', 'vendor', 'variant'))
        for item in items:
            if item.product is None:
                continue
            Product.objects.filter(pk=item.product_id).update(sales_count=F('sales_count') + item.quantity)
            if item.product.product_type == 'physical':
                if item.variant_id:
                    ProductVariant.objects.filter(pk=item.variant_id, stock__gte=item.quantity) \
                        .update(stock=F('stock') - item.quantity)
                Product.objects.filter(pk=item.product_id, stock__gte=item.quantity) \
                    .update(stock=F('stock') - item.quantity)

        vendor = items[0].vendor if items else None
        all_digital = items and all(i.product and i.product.product_type == 'digital' for i in items)
        if all_digital:
            # Downloads are available instantly; buyer still gets the protection window.
            order.status = 'delivered'
            release_at = timezone.now() + timedelta(days=settings.ESCROW_AUTO_RELEASE_DAYS)
        else:
            order.status = 'confirmed'
            release_at = None  # clock starts when the vendor ships
        order.save(update_fields=['status'])
        hold_funds(order, vendor, auto_release_at=release_at)


@transaction.atomic
def mark_shipped(order):
    from payments.escrow import start_release_clock

    order.status = 'shipped'
    order.save(update_fields=['status'])
    escrow = getattr(order, 'escrow', None)
    if escrow:
        start_release_clock(escrow)
    return order
