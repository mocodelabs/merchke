import logging

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from orders.models import Order
from orders.serializers import DisputeSerializer
from . import escrow as escrow_ops
from .models import EscrowTransaction, MpesaCallback, MpesaTransaction
from .serializers import EscrowSerializer, MpesaTransactionSerializer
from .services import MpesaError, complete_transaction, fail_transaction, initiate_payment

logger = logging.getLogger(__name__)


class MpesaCallbackView(APIView):
    """Safaricom posts the STK result here. Always answer 'Accepted'."""
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        data = request.data
        try:
            stk = data['Body']['stkCallback']
            checkout_id = stk.get('CheckoutRequestID', '')
            result_code = int(stk.get('ResultCode', -1))
            result_desc = stk.get('ResultDesc', '')
        except (KeyError, TypeError, ValueError):
            logger.warning('Malformed M-Pesa callback: %s', data)
            return Response({'ResultCode': 0, 'ResultDesc': 'Accepted'})

        items = (stk.get('CallbackMetadata') or {}).get('Item', [])
        meta = {item.get('Name'): item.get('Value') for item in items}
        MpesaCallback.objects.create(
            checkout_request_id=checkout_id,
            result_code=result_code,
            result_desc=result_desc[:255],
            amount=meta.get('Amount'),
            mpesa_receipt_number=meta.get('MpesaReceiptNumber', '') or '',
            phone_number=str(meta.get('PhoneNumber', '') or ''),
            raw_payload=data,
        )

        txn = MpesaTransaction.objects.filter(checkout_request_id=checkout_id).first()
        if not txn:
            logger.warning('M-Pesa callback for unknown CheckoutRequestID %s', checkout_id)
        elif result_code == 0:
            complete_transaction(txn, receipt=meta.get('MpesaReceiptNumber', ''), amount=meta.get('Amount'))
        else:
            fail_transaction(txn, reason=result_desc)

        return Response({'ResultCode': 0, 'ResultDesc': 'Accepted'})


class TransactionStatusView(APIView):
    """Poll target for the frontend while the buyer types their M-Pesa PIN."""
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        txn = get_object_or_404(MpesaTransaction, pk=pk, user=request.user)
        return Response(MpesaTransactionSerializer(txn).data)


class TransactionRetryView(APIView):
    """Resend an STK push with the same amount and purpose (buyer cancelled / prompt timed out)."""
    permission_classes = [IsAuthenticated]
    RETRYABLE = {'order', 'tickets', 'ad', 'event_boost'}

    def post(self, request, pk):
        old = get_object_or_404(MpesaTransaction, pk=pk, user=request.user)
        if old.status == 'completed':
            return Response({'detail': 'This payment is already complete.'}, status=status.HTTP_400_BAD_REQUEST)
        if old.purpose not in self.RETRYABLE:
            return Response({'detail': 'Use the listing page to resend this payment.'},
                            status=status.HTTP_400_BAD_REQUEST)
        order_ids = old.metadata.get('order_ids') or []
        if order_ids and Order.objects.filter(pk__in=order_ids).exclude(status='pending').exists():
            return Response({'detail': 'This order has already been paid or cancelled.'},
                            status=status.HTTP_400_BAD_REQUEST)
        try:
            txn = initiate_payment(
                purpose=old.purpose, reference_id=old.reference_id, user=request.user,
                phone=request.data.get('phone') or old.phone, amount=old.amount,
                account_reference=old.account_reference, description=old.description,
                metadata=old.metadata,
            )
        except MpesaError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        if old.status == 'pending':
            fail_transaction(old, reason='Superseded by a resent prompt.')
        return Response(MpesaTransactionSerializer(txn).data, status=status.HTTP_201_CREATED)


class PayOrderView(APIView):
    """Re-send the STK push for an order that is still unpaid."""
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):
        order = get_object_or_404(Order, pk=order_id, user=request.user)
        if order.status != 'pending':
            return Response({'detail': 'This order is already paid.'}, status=status.HTTP_400_BAD_REQUEST)
        phone = request.data.get('phone') or order.delivery_phone
        try:
            txn = initiate_payment(
                purpose='order', reference_id=order.pk, user=request.user,
                phone=phone, amount=order.total_amount,
                account_reference=order.order_number, description='Merchke order',
                metadata={'order_ids': [order.pk]},
            )
        except MpesaError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(MpesaTransactionSerializer(txn).data, status=status.HTTP_201_CREATED)


# ── Escrow ────────────────────────────────────────────────────────────────────

def _escrow_for(request, order_id, *, buyer_only=False):
    order = get_object_or_404(Order, pk=order_id)
    is_buyer = order.user_id == request.user.id
    vendor = getattr(request.user, 'vendor_profile', None)
    # Ticket orders have no OrderItems, so also accept the escrow's vendor.
    is_vendor = vendor is not None and (
        order.items.filter(vendor=vendor).exists()
        or EscrowTransaction.objects.filter(order=order, vendor=vendor).exists()
    )
    if not (is_buyer or (is_vendor and not buyer_only) or request.user.is_staff):
        return None, None
    return order, EscrowTransaction.objects.filter(order=order).first()


class EscrowDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, order_id):
        order, escrow = _escrow_for(request, order_id)
        if order is None:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if escrow is None:
            return Response({'detail': 'No funds held for this order yet.'}, status=status.HTTP_404_NOT_FOUND)
        if escrow.status == 'held' and escrow.auto_release_at and escrow.auto_release_at <= timezone.now():
            escrow = escrow_ops.release(escrow, note='Auto-released on status check.')
        return Response(EscrowSerializer(escrow).data)


class EscrowReleaseView(APIView):
    """Buyer confirms they received the order — funds go to the vendor."""
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):
        order, escrow = _escrow_for(request, order_id, buyer_only=True)
        if order is None or order.user_id != request.user.id:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if escrow is None:
            return Response({'detail': 'This order has not been paid.'}, status=status.HTTP_400_BAD_REQUEST)
        if escrow.status == 'disputed':
            return Response(
                {'detail': 'This order has an open dispute. Our team will resolve it.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if order.status not in ('shipped', 'delivered'):
            return Response(
                {'detail': 'You can confirm receipt once the vendor has shipped your order.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            escrow = escrow_ops.release(escrow, note='Buyer confirmed receipt.')
        except escrow_ops.EscrowError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(EscrowSerializer(escrow).data)


class EscrowDisputeView(APIView):
    """Buyer raises a dispute — funds are frozen until an admin resolves it."""
    permission_classes = [IsAuthenticated]

    def post(self, request, order_id):
        order, escrow = _escrow_for(request, order_id, buyer_only=True)
        if order is None or order.user_id != request.user.id:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        if escrow is None:
            return Response({'detail': 'This order has not been paid.'}, status=status.HTTP_400_BAD_REQUEST)
        if order.disputes.filter(status__in=['open', 'under_review']).exists():
            return Response({'detail': 'An open dispute already exists for this order.'},
                            status=status.HTTP_400_BAD_REQUEST)

        serializer = DisputeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            escrow_ops.mark_disputed(escrow)
        except escrow_ops.EscrowError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(order=order, buyer=request.user)
        order.payout_status = 'holding'
        order.save(update_fields=['payout_status'])
        return Response(
            {'dispute': serializer.data, 'escrow': EscrowSerializer(escrow).data},
            status=status.HTTP_201_CREATED,
        )
