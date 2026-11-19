"""Escrow ledger operations. All money movement on an order goes through here."""
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from .models import EscrowTransaction


class EscrowError(Exception):
    pass


def hold_funds(order, vendor, *, auto_release_at=None):
    """Create the escrow record once the buyer's payment for `order` lands."""
    commission = vendor.commission_rate if vendor else Decimal(settings.PLATFORM_COMMISSION_PERCENT)
    escrow, created = EscrowTransaction.objects.get_or_create(
        order=order,
        defaults={
            'vendor': vendor,
            'amount': order.total_amount,
            'commission_percent': commission,
            'auto_release_at': auto_release_at,
        },
    )
    if created:
        escrow.calculate_split()
        escrow.save(update_fields=['commission_amount', 'vendor_amount'])
    return escrow


def start_release_clock(escrow, *, days=None):
    """Called when the vendor ships: buyer has N days to confirm or dispute."""
    days = settings.ESCROW_AUTO_RELEASE_DAYS if days is None else days
    if escrow.status == 'held' and not escrow.auto_release_at:
        escrow.auto_release_at = timezone.now() + timedelta(days=days)
        escrow.save(update_fields=['auto_release_at'])


def release(escrow, *, note=''):
    with transaction.atomic():
        escrow = EscrowTransaction.objects.select_for_update().select_related('order').get(pk=escrow.pk)
        if escrow.status == 'released':
            return escrow
        if escrow.status == 'refunded':
            raise EscrowError('Funds for this order were already refunded.')
        now = timezone.now()
        escrow.status = 'released'
        escrow.released_at = now
        if note:
            escrow.notes = f"{escrow.notes}\n{note}".strip()
        escrow.save(update_fields=['status', 'released_at', 'notes'])

        order = escrow.order
        order.payout_status = 'released'
        order.buyer_confirmed_at = order.buyer_confirmed_at or now
        if order.status in ('confirmed', 'processing', 'shipped'):
            order.status = 'delivered'
        order.save(update_fields=['payout_status', 'buyer_confirmed_at', 'status'])
    return escrow


def refund(escrow, *, note=''):
    with transaction.atomic():
        escrow = EscrowTransaction.objects.select_for_update().select_related('order').get(pk=escrow.pk)
        if escrow.status == 'refunded':
            return escrow
        if escrow.status == 'released':
            raise EscrowError('Funds were already released to the vendor.')
        escrow.status = 'refunded'
        escrow.refunded_at = timezone.now()
        if note:
            escrow.notes = f"{escrow.notes}\n{note}".strip()
        escrow.save(update_fields=['status', 'refunded_at', 'notes'])
        order = escrow.order
        order.status = 'refunded'
        order.save(update_fields=['status'])
    return escrow


def mark_disputed(escrow):
    if escrow.status == 'held':
        escrow.status = 'disputed'
        escrow.save(update_fields=['status'])
    elif escrow.status != 'disputed':
        raise EscrowError(f'Cannot dispute: funds are already {escrow.status}.')
    return escrow


def release_due():
    """Auto-release every held escrow whose clock has run out. Returns count."""
    due = EscrowTransaction.objects.filter(status='held', auto_release_at__lte=timezone.now())
    count = 0
    for escrow in due:
        release(escrow, note='Auto-released: buyer did not respond within the protection window.')
        count += 1
    return count
