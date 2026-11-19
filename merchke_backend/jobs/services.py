"""Job posts go live after a KSh 500 M-Pesa listing fee."""
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.utils import timezone

from payments.services import MpesaError, initiate_payment
from .models import Job


def request_job_fee(job, phone, user):
    """Send the STK push for a job's listing fee. Failures are recorded on the job."""
    if job.fee_status == 'paid':
        return job
    job.fee_amount = Decimal(settings.JOB_LISTING_FEE_KSH)
    job.fee_status = 'pending'
    job.fee_phone = phone
    job.fee_error = ''
    job.fee_requested_at = timezone.now()
    job.save(update_fields=['fee_amount', 'fee_status', 'fee_phone', 'fee_error', 'fee_requested_at'])
    try:
        initiate_payment(
            purpose='job_fee', reference_id=job.pk, user=user,
            phone=phone, amount=job.fee_amount,
            account_reference=f'JOB{job.pk}', description='Job listing',
        )
    except MpesaError as exc:
        Job.objects.filter(pk=job.pk).update(fee_status='failed', fee_error=str(exc))
    job.refresh_from_db()
    return job


def on_job_fee_paid(txn):
    Job.objects.filter(pk=txn.reference_id).update(
        fee_status='paid', fee_paid_at=timezone.now(), fee_error='', is_active=True,
    )


def on_job_fee_failed(txn):
    Job.objects.filter(pk=txn.reference_id, fee_status='pending').update(
        fee_status='failed', fee_error=txn.result_desc or 'Payment was cancelled.',
    )


def expire_if_stale(job):
    cutoff = timezone.now() - timedelta(minutes=settings.LISTING_FEE_TIMEOUT_MINUTES)
    if job.fee_status == 'pending' and job.fee_requested_at <= cutoff:
        Job.objects.filter(pk=job.pk).update(
            fee_status='expired', fee_error='No payment received within 10 minutes.', is_active=False,
        )
        return True
    return False


def expire_stale_job_fees():
    return sum(expire_if_stale(job) for job in Job.objects.filter(fee_status='pending'))
