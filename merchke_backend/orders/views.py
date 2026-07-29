from rest_framework import generics, status as drf_status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models.functions import TruncMonth
from django.db.models import Count
from django.utils import timezone
from django.shortcuts import get_object_or_404
from .models import Order, Dispute
from .serializers import OrderSerializer, DisputeSerializer


class OrderListCreateView(generics.ListCreateAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related('items')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related('items')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_order_stats(request):
    vendor = request.user.vendor_profile
    orders = Order.objects.filter(items__vendor=vendor).distinct()

    stats = (
        orders.annotate(month=TruncMonth('created_at'))
        .values('month')
        .annotate(order_count=Count('id'))
        .order_by('month')
    )

    return Response(stats)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def confirm_receipt(request, pk):
    """Buyer confirms they received the order — releases payout hold early."""
    order = get_object_or_404(Order, pk=pk, user=request.user)
    if order.buyer_confirmed_at:
        return Response({'detail': 'Already confirmed.'}, status=drf_status.HTTP_200_OK)
    if order.status not in ('shipped', 'delivered'):
        return Response(
            {'detail': 'Order must be shipped or delivered before you can confirm receipt.'},
            status=drf_status.HTTP_400_BAD_REQUEST,
        )
    order.buyer_confirmed_at = timezone.now()
    order.payout_status = 'released'
    order.status = 'delivered'
    order.save(update_fields=['buyer_confirmed_at', 'payout_status', 'status'])
    return Response({'detail': 'Receipt confirmed. Payout released to vendor.'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def open_dispute(request, pk):
    """Buyer opens a dispute on an order."""
    order = get_object_or_404(Order, pk=pk, user=request.user)

    if order.disputes.filter(status__in=['open', 'under_review']).exists():
        return Response({'detail': 'An open dispute already exists for this order.'},
                        status=drf_status.HTTP_400_BAD_REQUEST)

    if order.status in ('cancelled', 'refunded'):
        return Response({'detail': 'Cannot dispute a cancelled or refunded order.'},
                        status=drf_status.HTTP_400_BAD_REQUEST)

    serializer = DisputeSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=drf_status.HTTP_400_BAD_REQUEST)

    serializer.save(order=order, buyer=request.user)
    # Freeze payout while dispute is open
    order.payout_status = 'holding'
    order.save(update_fields=['payout_status'])
    return Response(serializer.data, status=drf_status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_disputes(request):
    """List all disputes opened by the authenticated buyer."""
    disputes = Dispute.objects.filter(buyer=request.user).select_related('order')
    return Response(DisputeSerializer(disputes, many=True).data)
