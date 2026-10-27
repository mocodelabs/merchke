"""
Time-based housekeeping. Run every few minutes (Render cron job):

    python manage.py process_due_tasks

- expires unpaid product/job listing fees after 10 minutes (and emails vendors)
- auto-releases escrow 7 days after shipping
- switches off ads and event boosts that have run out
"""
from django.core.management.base import BaseCommand

from ads.services import expire_ads
from events.services import expire_boosts
from jobs.services import expire_stale_job_fees
from payments.escrow import release_due
from products.services import expire_stale_listing_fees


class Command(BaseCommand):
    help = 'Expire stale listing fees, auto-release escrow, expire ads/boosts.'

    def handle(self, *args, **options):
        results = {
            'listing fees expired': expire_stale_listing_fees(),
            'job fees expired': expire_stale_job_fees(),
            'escrows auto-released': release_due(),
            'ads expired': expire_ads(),
            'event boosts expired': expire_boosts(),
        }
        for label, count in results.items():
            self.stdout.write(f'{label}: {count}')
