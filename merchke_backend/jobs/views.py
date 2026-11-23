import django_filters
from django.conf import settings
from django.core.mail import send_mail
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status as drf_status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsVendorOrStaff
from payments.mpesa import MpesaError, normalize_phone
from .models import Job, JobApplication
from .serializers import JobApplicationSerializer, JobSerializer
from .services import expire_if_stale, request_job_fee


class JobFilter(django_filters.FilterSet):
    category = django_filters.CharFilter(field_name='category')
    location = django_filters.CharFilter(field_name='location', lookup_expr='icontains')
    is_remote = django_filters.BooleanFilter(field_name='is_remote')

    class Meta:
        model = Job
        fields = ['category', 'location', 'is_remote']


class JobListCreateView(generics.ListCreateAPIView):
    """
    GET: open, paid job posts (?search=&category=&location=&is_remote=true).
    POST: vendor or staff posts a job; vendors pay KSh 500 via STK before it goes live.
    """
    serializer_class = JobSerializer
    filterset_class = JobFilter
    search_fields = ['title', 'company', 'description', 'location']
    ordering_fields = ['created_at', 'deadline']
    ordering = ['-created_at']
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsVendorOrStaff()]
        return [AllowAny()]

    def get_queryset(self):
        return Job.objects.filter(is_active=True).filter(
            Q(deadline__isnull=True) | Q(deadline__gte=timezone.localdate())
        )

    def create(self, request, *args, **kwargs):
        user = request.user
        vendor = getattr(user, 'vendor_profile', None)
        phone = None
        if not user.is_staff:
            try:
                phone = normalize_phone(
                    request.data.get('mpesa_phone') or (vendor.mpesa_phone if vendor else '')
                )
            except MpesaError:
                return Response(
                    {'mpesa_phone': [f'Enter the M-Pesa number to charge the KSh {settings.JOB_LISTING_FEE_KSH} job listing fee.']},
                    status=drf_status.HTTP_400_BAD_REQUEST,
                )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if user.is_staff:
            # Platform's own posts are free and go live immediately.
            job = serializer.save(posted_by=user, vendor=vendor, is_active=True,
                                  fee_status='paid', fee_paid_at=timezone.now())
        else:
            job = serializer.save(posted_by=user, vendor=vendor)
            job = request_job_fee(job, phone, user)
        return Response(self.get_serializer(job).data, status=drf_status.HTTP_201_CREATED)


class JobDetailView(generics.RetrieveAPIView):
    serializer_class = JobSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            return Job.objects.filter(Q(is_active=True) | Q(posted_by=user))
        return Job.objects.filter(is_active=True)


class MyJobsView(generics.ListAPIView):
    serializer_class = JobSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = []

    def get_queryset(self):
        return Job.objects.filter(posted_by=self.request.user)


class JobManageView(generics.RetrieveUpdateDestroyAPIView):
    """Owner edits or closes their job post (fee state is read-only)."""
    serializer_class = JobSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        return Job.objects.filter(posted_by=self.request.user)


class JobFeeStatusView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        job = get_object_or_404(Job, pk=pk, posted_by=request.user)
        expire_if_stale(job)
        job.refresh_from_db()
        return Response(JobSerializer(job, context={'request': request}).data)


class JobFeeRetryView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        job = get_object_or_404(Job, pk=pk, posted_by=request.user)
        if job.fee_status == 'paid':
            return Response({'detail': 'This job post is already paid for.'}, status=drf_status.HTTP_400_BAD_REQUEST)
        try:
            phone = normalize_phone(request.data.get('mpesa_phone') or job.fee_phone)
        except MpesaError as exc:
            return Response({'detail': str(exc)}, status=drf_status.HTTP_400_BAD_REQUEST)
        job = request_job_fee(job, phone, request.user)
        return Response(JobSerializer(job, context={'request': request}).data)


class JobApplyView(APIView):
    """Anyone can apply (multipart: applicant_name, email, phone, cv_file|cv_url, cover_letter)."""
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, pk):
        job = get_object_or_404(Job, pk=pk, is_active=True)
        if not job.is_open:
            return Response({'detail': 'Applications for this job have closed.'},
                            status=drf_status.HTTP_400_BAD_REQUEST)
        serializer = JobApplicationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if JobApplication.objects.filter(job=job, email__iexact=serializer.validated_data['email']).exists():
            return Response({'detail': 'You have already applied for this job.'},
                            status=drf_status.HTTP_400_BAD_REQUEST)
        application = serializer.save(
            job=job, applicant=request.user if request.user.is_authenticated else None,
        )

        poster_email = job.vendor.contact_email if job.vendor else job.posted_by.email
        if poster_email:
            send_mail(
                subject=f'New application: {job.title}',
                message=(
                    f'{application.applicant_name} applied for "{job.title}".\n\n'
                    f'Email: {application.email}\nPhone: {application.phone}\n\n'
                    f'{application.cover_letter}\n\n'
                    f'See all applications: {settings.FRONTEND_URL}/dashboard?tab=jobs'
                ),
                from_email=None,
                recipient_list=[poster_email],
                fail_silently=True,
            )
        return Response({'detail': 'Application sent. Good luck!'}, status=drf_status.HTTP_201_CREATED)


class JobApplicationsView(generics.ListAPIView):
    """Applications for one of the poster's jobs."""
    serializer_class = JobApplicationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = []

    def get_queryset(self):
        job = get_object_or_404(Job, pk=self.kwargs['pk'], posted_by=self.request.user)
        return job.applications.all()
