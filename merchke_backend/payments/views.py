import requests
import base64
import json
from datetime import datetime
from django.conf import settings
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Payment, MpesaCallback
from orders.models import Order


def get_mpesa_access_token():
    """Fetch OAuth access token from Safaricom Daraja API."""
    consumer_key = settings.MPESA_CONSUMER_KEY
    consumer_secret = settings.MPESA_CONSUMER_SECRET
    api_url = f"{settings.MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials"

    credentials = base64.b64encode(
        f"{consumer_key}:{consumer_secret}".encode()
    ).decode()

    response = requests.get(
        api_url,
        headers={"Authorization": f"Basic {credentials}"}
    )
    response.raise_for_status()
    return response.json()["access_token"]


def generate_mpesa_password():
    """Generate the Base64 password for STK Push."""
    shortcode = settings.MPESA_SHORTCODE
    passkey = settings.MPESA_PASSKEY
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    raw = f"{shortcode}{passkey}{timestamp}"
    password = base64.b64encode(raw.encode()).decode()
    return password, timestamp


class MpesaSTKPushView(APIView):
    """Initiate M-Pesa STK Push (Lipa na M-Pesa Online)."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        order_id = request.data.get("order_id")
        phone = request.data.get("phone")  # 2547XXXXXXXX format

        if not order_id or not phone:
            return Response(
                {"error": "order_id and phone are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            order = Order.objects.get(id=order_id, user=request.user)
        except Order.DoesNotExist:
            return Response({"error": "Order not found."}, status=status.HTTP_404_NOT_FOUND)

        amount = int(order.total_amount)
        password, timestamp = generate_mpesa_password()

        try:
            access_token = get_mpesa_access_token()
        except Exception as e:
            return Response(
                {"error": f"Could not reach M-Pesa: {str(e)}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        payload = {
            "BusinessShortCode": settings.MPESA_SHORTCODE,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": amount,
            "PartyA": phone,
            "PartyB": settings.MPESA_SHORTCODE,
            "PhoneNumber": phone,
            "CallBackURL": settings.MPESA_CALLBACK_URL,
            "AccountReference": order.order_number,
            "TransactionDesc": f"Merchke order {order.order_number}",
        }

        api_url = f"{settings.MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

        try:
            mpesa_response = requests.post(api_url, json=payload, headers=headers)
            mpesa_response.raise_for_status()
            result = mpesa_response.json()
        except Exception as e:
            return Response(
                {"error": f"STK Push failed: {str(e)}"},
                status=status.HTTP_502_BAD_GATEWAY
            )

        # Create or update payment record
        payment, _ = Payment.objects.get_or_create(order=order)
        payment.method = 'mpesa_stk'
        payment.total_amount = order.total_amount
        payment.mpesa_phone = phone
        payment.status = 'initiated'
        payment.mpesa_checkout_request_id = result.get("CheckoutRequestID", "")
        payment.mpesa_merchant_request_id = result.get("MerchantRequestID", "")
        payment.calculate_split()
        payment.save()

        return Response({
            "message": "STK Push sent. Check your phone.",
            "CheckoutRequestID": result.get("CheckoutRequestID"),
            "MerchantRequestID": result.get("MerchantRequestID"),
        }, status=status.HTTP_200_OK)


class MpesaCallbackView(APIView):
    """Receive and process M-Pesa payment callback from Safaricom."""
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        try:
            stk_callback = data["Body"]["stkCallback"]
            checkout_request_id = stk_callback.get("CheckoutRequestID")
            result_code = stk_callback.get("ResultCode")
            result_desc = stk_callback.get("ResultDesc", "")

            # Save raw callback
            callback = MpesaCallback.objects.create(
                checkout_request_id=checkout_request_id,
                result_code=result_code,
                result_desc=result_desc,
                raw_payload=data,
            )

            if result_code == 0:
                # Payment successful — extract metadata
                items = stk_callback.get("CallbackMetadata", {}).get("Item", [])
                meta = {item["Name"]: item.get("Value") for item in items}

                amount = meta.get("Amount")
                receipt = meta.get("MpesaReceiptNumber", "")
                phone = str(meta.get("PhoneNumber", ""))

                callback.amount = amount
                callback.mpesa_receipt_number = receipt
                callback.phone_number = phone
                callback.save()

                # Update payment
                try:
                    payment = Payment.objects.get(
                        mpesa_checkout_request_id=checkout_request_id
                    )
                    payment.status = 'completed'
                    payment.mpesa_receipt_number = receipt
                    payment.transaction_reference = receipt
                    payment.processed_at = timezone.now()
                    payment.save()

                    # Update order status
                    payment.order.status = 'confirmed'
                    payment.order.save()
                except Payment.DoesNotExist:
                    pass

        except (KeyError, TypeError):
            pass  # Log in production

        return Response({"ResultCode": 0, "ResultDesc": "Accepted"})


class MpesaSTKQueryView(APIView):
    """Query STK Push transaction status."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        checkout_request_id = request.data.get("checkout_request_id")
        if not checkout_request_id:
            return Response(
                {"error": "checkout_request_id required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        password, timestamp = generate_mpesa_password()
        try:
            access_token = get_mpesa_access_token()
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        payload = {
            "BusinessShortCode": settings.MPESA_SHORTCODE,
            "Password": password,
            "Timestamp": timestamp,
            "CheckoutRequestID": checkout_request_id,
        }
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }
        api_url = f"{settings.MPESA_BASE_URL}/mpesa/stkpushquery/v1/query"

        try:
            resp = requests.post(api_url, json=payload, headers=headers)
            return Response(resp.json())
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_502_BAD_GATEWAY)
