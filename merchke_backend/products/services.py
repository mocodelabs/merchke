"""Product listing fee: KSh 130 via STK push before a listing goes live."""
import logging
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from payments.services import MpesaError, initiate_payment
from .models import ListingFee, Product

logger = logging.getLogger(__name__)


def request_listing_fee(product, phone, user):
    """
    Create/refresh the product's ListingFee and send the STK push.
    The product stays inactive until the payment callback lands.
    Never raises: failures are recorded on the fee so the vendor can retry.
    """
    fee, _ = ListingFee.objects.get_or_create(
        product=product,
        defaults={'vendor': product.vendor, 'amount': Decimal(settings.PRODUCT_LISTING_FEE_KSH)},
    )
    if fee.status == 'paid':
        return fee
    fee.status = 'pending'
    fee.phone = phone
    fee.error = ''
    fee.requested_at = timezone.now()
    fee.save(update_fields=['status', 'phone', 'error', 'requested_at'])

    try:
        txn = initiate_payment(
            purpose='listing_fee', reference_id=fee.pk, user=user,
            phone=phone, amount=fee.amount,
            account_reference=f'LIST{product.pk}', description='Listing fee',
        )
    except MpesaError as exc:
        fee.status = 'failed'
        fee.error = str(exc)
        fee.save(update_fields=['status', 'error'])
        return fee

    ListingFee.objects.filter(pk=fee.pk).update(mpesa_transaction=txn)
    fee.refresh_from_db()
    return fee


def on_listing_fee_paid(txn):
    fee = ListingFee.objects.select_related('product').get(pk=txn.reference_id)
    fee.status = 'paid'
    fee.paid_at = timezone.now()
    fee.error = ''
    fee.mpesa_transaction = txn
    fee.save(update_fields=['status', 'paid_at', 'error', 'mpesa_transaction'])
    Product.objects.filter(pk=fee.product_id).update(is_active=True)


def on_listing_fee_failed(txn):
    ListingFee.objects.filter(pk=txn.reference_id, status='pending').update(
        status='failed', error=txn.result_desc or 'Payment was cancelled.',
    )


def expire_if_stale(fee):
    """Unpaid after LISTING_FEE_TIMEOUT_MINUTES -> expired, product hidden, vendor emailed."""
    cutoff = timezone.now() - timedelta(minutes=settings.LISTING_FEE_TIMEOUT_MINUTES)
    if fee.status != 'pending' or fee.requested_at > cutoff:
        return False
    fee.status = 'expired'
    fee.error = 'No payment received within 10 minutes.'
    fee.save(update_fields=['status', 'error'])
    Product.objects.filter(pk=fee.product_id).update(is_active=False)

    vendor = fee.vendor
    if vendor.contact_email:
        send_mail(
            subject=f'Your Merchke listing "{fee.product.name}" is not live yet',
            message=(
                f'Hi {vendor.display_name},\n\n'
                f'We did not receive the KSh {fee.amount:.0f} listing fee for "{fee.product.name}" '
                f'within {settings.LISTING_FEE_TIMEOUT_MINUTES} minutes, so the listing is on hold.\n\n'
                f'Open your dashboard to resend the M-Pesa prompt:\n'
                f'{settings.FRONTEND_URL}/dashboard?tab=products\n\n— Merchke'
            ),
            from_email=None,
            recipient_list=[vendor.contact_email],
            fail_silently=True,
        )
    return True


def expire_stale_listing_fees():
    count = 0
    for fee in ListingFee.objects.filter(status='pending').select_related('vendor', 'product'):
        count += expire_if_stale(fee)
    return count
