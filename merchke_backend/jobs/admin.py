from django.contrib import admin

from .models import Job, JobApplication


class JobApplicationInline(admin.TabularInline):
    model = JobApplication
    extra = 0
    readonly_fields = ('applicant_name', 'email', 'phone', 'cv_file', 'cv_url', 'applied_at')


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ('title', 'company', 'category', 'location', 'is_active', 'fee_status', 'deadline', 'created_at')
    list_filter = ('category', 'is_active', 'fee_status', 'is_remote')
    search_fields = ('title', 'company', 'description')
    inlines = [JobApplicationInline]
