from rest_framework import serializers

from .models import Job, JobApplication

OWNER_ONLY_FIELDS = ('fee_status', 'fee_error', 'fee_phone', 'fee_requested_at', 'fee_amount', 'applications_count')


class JobSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    is_open = serializers.ReadOnlyField()
    applications_count = serializers.SerializerMethodField()

    def get_applications_count(self, obj):
        return obj.applications.count()

    class Meta:
        model = Job
        fields = [
            'id', 'title', 'company', 'description', 'category', 'category_display',
            'location', 'is_remote', 'salary_range', 'deadline', 'how_to_apply',
            'is_active', 'is_open', 'fee_amount', 'fee_status', 'fee_error', 'fee_phone',
            'fee_requested_at', 'applications_count', 'created_at',
        ]
        read_only_fields = [
            'id', 'is_active', 'fee_amount', 'fee_status', 'fee_error', 'fee_phone',
            'fee_requested_at', 'created_at',
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get('request')
        is_owner = bool(request and request.user.is_authenticated and instance.posted_by_id == request.user.id)
        if not is_owner:
            for key in OWNER_ONLY_FIELDS:
                data.pop(key, None)
        return data


class JobApplicationSerializer(serializers.ModelSerializer):
    job_title = serializers.CharField(source='job.title', read_only=True)

    class Meta:
        model = JobApplication
        fields = [
            'id', 'job', 'job_title', 'applicant_name', 'email', 'phone',
            'cv_file', 'cv_url', 'cover_letter', 'applied_at',
        ]
        read_only_fields = ['id', 'job', 'job_title', 'applied_at']

    def validate_cv_file(self, f):
        if f is None:
            return f
        if f.size > 5 * 1024 * 1024:
            raise serializers.ValidationError('CV must be under 5 MB.')
        if not f.name.lower().endswith(('.pdf', '.doc', '.docx')):
            raise serializers.ValidationError('Upload a PDF or Word document.')
        return f

    def validate(self, attrs):
        if not attrs.get('cv_file') and not attrs.get('cv_url'):
            raise serializers.ValidationError({'cv_file': 'Attach your CV or paste a link to it.'})
        return attrs
