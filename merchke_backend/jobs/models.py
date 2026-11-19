from django.conf import settings
from django.db import models
from django.utils import timezone

from core.storage import raw_file_storage

JOB_CATEGORY_CHOICES = [
    ('creative', 'Creative'),
    ('media', 'Media'),
    ('club_dj', 'Club / DJ'),
    ('photography', 'Photography'),
    ('videography', 'Videography'),
    ('other', 'Other'),
]


class Job(models.Model):
    FEE_STATUS_CHOICES = [
        ('pending', 'Awaiting payment'),
        ('paid', 'Paid'),
        ('failed', 'Payment cancelled/failed'),
        ('expired', 'Expired'),
    ]

    title = models.CharField(max_length=200)
    company = models.CharField(max_length=150)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=JOB_CATEGORY_CHOICES, default='creative')
    location = models.CharField(max_length=100, default='Nairobi')
    is_remote = models.BooleanField(default=False)
    salary_range = models.CharField(max_length=100, blank=True, help_text='e.g. KSh 40,000 - 60,000 / month')
    deadline = models.DateField(null=True, blank=True)
    how_to_apply = models.TextField(blank=True, help_text='Optional extra instructions shown to applicants')

    posted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='jobs_posted')
    vendor = models.ForeignKey(
        'vendors.Vendor', on_delete=models.SET_NULL, null=True, blank=True, related_name='jobs',
    )
    is_active = models.BooleanField(default=False, help_text='Live once the listing fee is paid')

    fee_amount = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    fee_status = models.CharField(max_length=10, choices=FEE_STATUS_CHOICES, default='pending')
    fee_phone = models.CharField(max_length=15, blank=True)
    fee_error = models.CharField(max_length=255, blank=True)
    fee_requested_at = models.DateTimeField(default=timezone.now)
    fee_paid_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} at {self.company}"

    @property
    def is_open(self):
        return self.is_active and (self.deadline is None or self.deadline >= timezone.localdate())


class JobApplication(models.Model):
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='applications')
    applicant = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='job_applications',
    )
    applicant_name = models.CharField(max_length=120)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    cv_file = models.FileField(upload_to='jobs/cvs/', storage=raw_file_storage, blank=True, null=True)
    cv_url = models.URLField(blank=True, help_text='Link to a CV / portfolio (Google Drive, Behance, ...)')
    cover_letter = models.TextField(blank=True)
    applied_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-applied_at']

    def __str__(self):
        return f"{self.applicant_name} -> {self.job}"
