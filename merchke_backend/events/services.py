"""Ticket sales and paid event boosts."""
import logging
from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from orders.models import Order
from payments.services import initiate_payment
from .models import Event, EventAd, Ticket, TicketType

logger = logging.getLogger(__name__)

MIN_BOOST_KSH = 500


class TicketError(Exception):
    pass


def start_ticket_purchase(*, user, event, ticket_type, quantity, phone):
    """Create a pending ticket order and send the STK push. Returns (order, txn)."""
    if event.is_past:
        raise TicketError('This event has already happened.')
    if quantity < 1 or quantity > 10:
        raise TicketError('You can buy between 1 and 10 tickets at a time.')
    now = timezone.now()
    if ticket_type.sale_start and ticket_type.sale_start > now:
        raise TicketError(f'{ticket_type.name} tickets are not on sale yet.')
    if ticket_type.sale_end and ticket_type.sale_end < now:
        raise TicketError(f'{ticket_type.name} ticket sales have closed.')
    if ticket_type.tickets_remaining < quantity:
        left = ticket_type.tickets_remaining
        raise TicketError('Sold out.' if left <= 0 else f'Only {left} ticket(s) left.')

    total = Decimal(ticket_type.price) * quantity
    with transaction.atomic():
        order = Order.objects.create(
            user=user,
            subtotal=total,
            delivery_fee=Decimal('0'),
            total_amount=total,
            delivery_mode='pickup',
            delivery_phone=phone,
            notes=f'Tickets: {event.title} | {ticket_type.name} x{quantity}',
        )
        txn = initiate_payment(
            purpose='tickets', reference_id=order.pk, user=user,
            phone=phone, amount=total,
            account_reference=order.order_number, description='Event tickets',
            metadata={'order_ids': [order.pk], 'ticket_type_id': ticket_type.pk, 'quantity': quantity},
        )
    return order, txn


def on_tickets_paid(txn):
    """Issue tickets, hold funds in escrow until two days after the event."""
    from payments import escrow as escrow_ops
    from payments.models import Payment

    order = Order.objects.select_for_update().get(pk=txn.reference_id)
    if order.status != 'pending':
        return
    ticket_type = TicketType.objects.select_for_update().select_related('event__vendor') \
        .get(pk=txn.metadata['ticket_type_id'])
    event = ticket_type.event
    quantity = int(txn.metadata['quantity'])

    payment, _ = Payment.objects.get_or_create(
        order=order, defaults={'method': 'mpesa_stk', 'total_amount': order.total_amount},
    )
    payment.status = 'completed'
    payment.mpesa_phone = txn.phone
    payment.mpesa_receipt_number = txn.receipt_number
    payment.transaction_reference = txn.receipt_number
    payment.processed_at = timezone.now()
    payment.calculate_split()
    payment.save()

    order.status = 'delivered'  # tickets are delivered digitally on payment
    order.save(update_fields=['status'])
    escrow = escrow_ops.hold_funds(
        order, event.vendor,
        auto_release_at=(event.end_datetime or event.start_datetime) + timedelta(days=2),
    )

    if ticket_type.tickets_remaining < quantity:
        # Sold out while the buyer was typing their PIN: refund instead of overselling.
        logger.warning('Ticket oversell prevented on order %s', order.order_number)
        escrow_ops.refund(escrow, note='Tickets sold out before payment completed.')
        return

    Ticket.objects.bulk_create([
        Ticket(ticket_type=ticket_type, order=order, buyer=order.user,
               ticket_number=Ticket.new_ticket_number())
        for _ in range(quantity)
    ])
    ticket_type.tickets_sold += quantity
    ticket_type.save(update_fields=['tickets_sold'])
    if event.is_sold_out:
        Event.objects.filter(pk=event.pk).update(status='sold_out')


def start_boost(*, user, event, budget_ksh, days, ad_copy, ad_image, phone):
    if budget_ksh < MIN_BOOST_KSH:
        raise TicketError(f'The minimum boost budget is KSh {MIN_BOOST_KSH}.')
    with transaction.atomic():
        ad = EventAd.objects.create(
            event=event, budget_ksh=budget_ksh, days=max(1, min(days, 60)),
            ad_copy=ad_copy, ad_image=ad_image,
        )
        txn = initiate_payment(
            purpose='event_boost', reference_id=ad.pk, user=user,
            phone=phone, amount=budget_ksh,
            account_reference=f'BOOST{ad.pk}', description='Event boost',
        )
    ad.refresh_from_db()
    return ad, txn


def on_boost_paid(txn):
    ad = EventAd.objects.select_related('event').get(pk=txn.reference_id)
    now = timezone.now()
    ad.payment_status = 'paid'
    ad.is_active = True
    ad.starts_at = now
    ad.ends_at = now + timedelta(days=ad.days)
    ad.save(update_fields=['payment_status', 'is_active', 'starts_at', 'ends_at'])
    Event.objects.filter(pk=ad.event_id).update(is_featured=True)


def expire_boosts():
    """Unfeature events whose paid boost has run out. Returns count."""
    now = timezone.now()
    expired = EventAd.objects.filter(is_active=True, ends_at__lte=now)
    event_ids = list(expired.values_list('event_id', flat=True))
    count = expired.update(is_active=False)
    still_boosted = set(
        EventAd.objects.filter(event_id__in=event_ids, is_active=True).values_list('event_id', flat=True)
    )
    Event.objects.filter(pk__in=set(event_ids) - still_boosted).update(is_featured=False)
    return count
