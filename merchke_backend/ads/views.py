from django.db import transaction
from django.db.models import F
from django.http import HttpResponseRedirect
from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import generics, status as drf_status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsVendor
from payments.serializers import MpesaTransactionSerializer
from payments.services import MpesaError, initiate_payment
from .models import Ad
from .serializers import AdSerializer
from .services import live_ads


class AdCreateView(APIView):
    """Vendor creates an ad (multipart) and prepays the budget via STK push."""
    permission_classes = [IsAuthenticated, IsVendor]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        serializer = AdSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vendor = request.user.vendor_profile
        phone = request.data.get('phone') or vendor.mpesa_phone
        try:
            with transaction.atomic():
                ad = serializer.save(vendor=vendor)
                txn = initiate_payment(
                    purpose='ad', reference_id=ad.pk, user=request.user,
                    phone=phone, amount=ad.budget_ksh,
                    account_reference=f'AD{ad.pk}', description='Merchke advert',
                )
        except MpesaError as exc:
            return Response({'detail': str(exc)}, status=drf_status.HTTP_400_BAD_REQUEST)
        ad.refresh_from_db()
        return Response(
            {'ad': AdSerializer(ad).data, 'transaction': MpesaTransactionSerializer(txn).data},
            status=drf_status.HTTP_201_CREATED,
        )


class AdServeView(generics.ListAPIView):
    """Live ads for a page: ?page=store&ad_type=banner&limit=1. Counts impressions."""
    serializer_class = AdSerializer
    permission_classes = [AllowAny]
    filter_backends = []

    def list(self, request, *args, **kwargs):
        try:
            limit = max(1, min(int(request.query_params.get('limit', 6)), 12))
        except ValueError:
            limit = 6
        ads = list(live_ads(
            page=request.query_params.get('page'), ad_type=request.query_params.get('ad_type'),
        ).order_by('?')[:limit])
        Ad.objects.filter(pk__in=[a.pk for a in ads]).update(impressions=F('impressions') + 1)
        return Response(self.get_serializer(ads, many=True).data)


class AdClickView(APIView):
    """Count a click, then send the visitor to the ad's link."""
    permission_classes = [AllowAny]

    def get(self, request, pk):
        ad = get_object_or_404(Ad, pk=pk)
        Ad.objects.filter(pk=pk).update(clicks=F('clicks') + 1)
        link = ad.link
        if link.startswith('/'):
            link = settings.FRONTEND_URL + link
        return HttpResponseRedirect(link)


class MyAdsView(generics.ListAPIView):
    serializer_class = AdSerializer
    permission_classes = [IsAuthenticated, IsVendor]
    filter_backends = []

    def get_queryset(self):
        return Ad.objects.filter(vendor=self.request.user.vendor_profile)
