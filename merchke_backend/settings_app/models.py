from django.db import models

class SiteSetting(models.Model):
    commission_percent = models.DecimalField(max_digits=5, decimal_places=2, default=10)
    support_email = models.EmailField()
    payout_delay_days = models.PositiveIntegerField(default=2)

    def __str__(self):
        return "Platform Settings"


# Create your models here.
