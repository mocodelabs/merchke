from django.db import transaction
from django.db.models.functions import TruncMonth
from django.db.models import Count, Q
from rest_framework import generics, status as drf_status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from payments.serializers import MpesaTransactionSerializer
from payments.services import MpesaError, initiate_payment
from .models import Order, Dispute
from .serializers import CheckoutSerializer, DisputeSerializer, OrderSerializer
from .services import CheckoutError, build_orders, mark_shipped


def _order_qs():
    return Order.objects.select_related('escrow', 'escrow__vendor').prefetch_related(
        'items__product', 'items__vendor', 'items__variant', 'disputes',
    )


class OrderListView(generics.ListAPIView):
    """The authenticated buyer's orders."""
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return _order_qs().filter(user=self.request.user)


class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return _order_qs().filter(user=self.request.user)


class CheckoutView(APIView):
    """
    Create orders from cart lines (one per vendor) and send a single STK push
    for the combined total. Poll /api/payments/transactions/{transaction.id}/.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            with transaction.atomic():
                orders = build_orders(request.user, items=data['items'], delivery=data)
                total = sum(o.total_amount for o in orders)
                txn = initiate_payment(
                    purpose='order', reference_id=orders[0].pk, user=request.user,
                    phone=data['phone'], amount=total,
                    account_reference=orders[0].order_number, description='Merchke order',
                    metadata={'order_ids': [o.pk for o in orders]},
                )
        except (CheckoutError, MpesaError) as exc:
            return Response({'detail': str(exc)}, status=drf_status.HTTP_400_BAD_REQUEST)

        for o in orders:
            o.refresh_from_db()
        return Response({
            'orders': OrderSerializer(_order_qs().filter(pk__in=[o.pk for o in orders]), many=True).data,
            'total': str(total),
            'transaction': MpesaTransactionSerializer(txn).data,
        }, status=drf_status.HTTP_201_CREATED)


# ── Vendor side ───────────────────────────────────────────────────────────────

class VendorOrderListView(generics.ListAPIView):
    """Paid orders containing the authenticated vendor's products or tickets."""
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        vendor = getattr(self.request.user, 'vendor_profile', None)
        if vendor is None:
            return Order.objects.none()
        return _order_qs().filter(
            Q(items__vendor=vendor) | Q(escrow__vendor=vendor)
        ).exclude(status='pending').distinct()


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ship_order(request, pk):
    """Vendor marks an order as shipped — starts the buyer's 7-day confirmation window."""
    vendor = getattr(request.user, 'vendor_profile', None)
    order = Order.objects.filter(pk=pk, items__vendor=vendor).distinct().first() if vendor else None
    if order is None:
        return Response({'detail': 'Not found.'}, status=drf_status.HTTP_404_NOT_FOUND)
    if order.status not in ('confirmed', 'processing'):
        return Response({'detail': f'Cannot ship an order that is {order.status}.'},
                        status=drf_status.HTTP_400_BAD_REQUEST)
    mark_shipped(order)
    return Response(OrderSerializer(_order_qs().get(pk=order.pk)).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_order_stats(request):
    vendor = getattr(request.user, 'vendor_profile', None)
    if vendor is None:
        return Response([])
    stats = (
        Order.objects.filter(items__vendor=vendor).distinct()
        .annotate(month=TruncMonth('created_at'))
        .values('month')
        .annotate(order_count=Count('id'))
        .order_by('month')
    )
    return Response(stats)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_disputes(request):
    """All disputes opened by the authenticated buyer."""
    disputes = Dispute.objects.filter(buyer=request.user).select_related('order')
    return Response(DisputeSerializer(disputes, many=True).data)
