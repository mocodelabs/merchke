from django.db.models import Q
from django.utils import timezone

from .models import Ad


def on_ad_paid(txn):
    Ad.objects.filter(pk=txn.reference_id).update(payment_status='paid', is_active=True)


def live_ads(*, page=None, ad_type=None):
    today = timezone.localdate()
    qs = Ad.objects.filter(is_active=True, start_date__lte=today, end_date__gte=today).select_related('vendor')
    if page:
        qs = qs.filter(Q(target_page=page) | Q(target_page='all'))
    if ad_type:
        qs = qs.filter(ad_type=ad_type)
    return qs


def expire_ads():
    return Ad.objects.filter(is_active=True, end_date__lt=timezone.localdate()).update(is_active=False)
