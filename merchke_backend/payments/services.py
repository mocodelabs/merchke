"""
One entry point for every M-Pesa payment on Merchke.

    txn = initiate_payment(purpose='listing_fee', reference_id=fee.pk, ...)

sends the STK push and records an MpesaTransaction. When Safaricom calls
back (or immediately, in MPESA_SIMULATE mode) complete_transaction() runs the
handler registered for that purpose below.
"""
import logging
import uuid

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.utils.module_loading import import_string

from .models import MpesaTransaction
from .mpesa import MpesaError, normalize_phone, send_stk_push

logger = logging.getLogger(__name__)

# purpose -> dotted path of fn(txn) run once payment is confirmed
PURPOSE_HANDLERS = {
    'order': 'orders.services.on_order_paid',
    'tickets': 'events.services.on_tickets_paid',
    'listing_fee': 'products.services.on_listing_fee_paid',
    'job_fee': 'jobs.services.on_job_fee_paid',
    'ad': 'ads.services.on_ad_paid',
    'event_boost': 'events.services.on_boost_paid',
}

# purpose -> fn(txn) run when the buyer cancels / the push times out
FAILURE_HANDLERS = {
    'listing_fee': 'products.services.on_listing_fee_failed',
    'job_fee': 'jobs.services.on_job_fee_failed',
}


def initiate_payment(*, purpose, reference_id, phone, amount, account_reference,
                     description, user=None, metadata=None):
    """
    Send an STK push and return the MpesaTransaction.
    Raises MpesaError if the phone is invalid or Daraja refuses the request.
    """
    phone = normalize_phone(phone)
    txn = MpesaTransaction.objects.create(
        purpose=purpose,
        reference_id=reference_id,
        metadata=metadata or {},
        user=user,
        phone=phone,
        amount=amount,
        account_reference=account_reference,
        description=description,
        is_simulated=settings.MPESA_SIMULATE,
    )

    if settings.MPESA_SIMULATE:
        txn.checkout_request_id = f"SIM-{uuid.uuid4().hex[:16]}"
        txn.save(update_fields=['checkout_request_id'])
        complete_transaction(txn, receipt=f"SIM{uuid.uuid4().hex[:7].upper()}")
        txn.refresh_from_db()
        return txn

    try:
        checkout_id, merchant_id = send_stk_push(
            phone=phone, amount=amount,
            account_reference=account_reference, description=description,
        )
    except MpesaError as exc:
        txn.status = 'failed'
        txn.result_desc = str(exc)
        txn.save(update_fields=['status', 'result_desc'])
        raise

    txn.checkout_request_id = checkout_id
    txn.merchant_request_id = merchant_id
    txn.save(update_fields=['checkout_request_id', 'merchant_request_id'])
    return txn


def complete_transaction(txn, *, receipt='', amount=None):
    """Mark a transaction paid and run its purpose handler exactly once."""
    with transaction.atomic():
        txn = MpesaTransaction.objects.select_for_update().get(pk=txn.pk)
        if txn.status == 'completed':
            return txn
        if amount is not None and int(amount) < int(txn.amount):
            logger.warning('M-Pesa underpayment on txn %s: paid %s of %s', txn.pk, amount, txn.amount)
            txn.status = 'failed'
            txn.result_desc = f'Underpaid: received KSh {amount}'
            txn.save(update_fields=['status', 'result_desc'])
            return txn
        txn.status = 'completed'
        txn.receipt_number = receipt
        txn.completed_at = timezone.now()
        txn.save(update_fields=['status', 'receipt_number', 'completed_at'])
        import_string(PURPOSE_HANDLERS[txn.purpose])(txn)
    return txn


def fail_transaction(txn, *, reason=''):
    with transaction.atomic():
        txn = MpesaTransaction.objects.select_for_update().get(pk=txn.pk)
        if txn.status != 'pending':
            return txn
        txn.status = 'failed'
        txn.result_desc = reason[:255]
        txn.save(update_fields=['status', 'result_desc'])
        handler = FAILURE_HANDLERS.get(txn.purpose)
        if handler:
            import_string(handler)(txn)
    return txn


__all__ = ['MpesaError', 'initiate_payment', 'complete_transaction', 'fail_transaction']
