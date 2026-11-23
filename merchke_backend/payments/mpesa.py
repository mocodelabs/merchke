"""Thin client for Safaricom's Daraja STK Push API."""
import base64
import re
from datetime import datetime

import requests
from django.conf import settings


class MpesaError(Exception):
    """STK push could not be sent (bad phone, Daraja down, bad credentials)."""


def normalize_phone(raw):
    """
    Accept 07XXXXXXXX, 01XXXXXXXX, +2547XXXXXXXX, 2547XXXXXXXX, 7XXXXXXXX
    and return Daraja's 2547XXXXXXXX / 2541XXXXXXXX format.
    """
    digits = re.sub(r'\D', '', str(raw or ''))
    if digits.startswith('254'):
        digits = digits[3:]
    elif digits.startswith('0'):
        digits = digits[1:]
    if len(digits) != 9 or digits[0] not in '17':
        raise MpesaError('Enter a valid Safaricom number, e.g. 0712 345 678.')
    return '254' + digits


def _access_token():
    credentials = base64.b64encode(
        f"{settings.MPESA_CONSUMER_KEY}:{settings.MPESA_CONSUMER_SECRET}".encode()
    ).decode()
    resp = requests.get(
        f"{settings.MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials",
        headers={'Authorization': f'Basic {credentials}'},
        timeout=15,
    )
    resp.raise_for_status()
    return resp.json()['access_token']


def _password():
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    raw = f"{settings.MPESA_SHORTCODE}{settings.MPESA_PASSKEY}{timestamp}"
    return base64.b64encode(raw.encode()).decode(), timestamp


def send_stk_push(*, phone, amount, account_reference, description):
    """
    Send an STK push. Returns (checkout_request_id, merchant_request_id).
    Raises MpesaError on any failure.
    """
    password, timestamp = _password()
    payload = {
        'BusinessShortCode': settings.MPESA_SHORTCODE,
        'Password': password,
        'Timestamp': timestamp,
        'TransactionType': 'CustomerPayBillOnline',
        'Amount': int(amount),
        'PartyA': phone,
        'PartyB': settings.MPESA_SHORTCODE,
        'PhoneNumber': phone,
        'CallBackURL': settings.MPESA_CALLBACK_URL,
        'AccountReference': account_reference[:12],
        'TransactionDesc': description[:13],
    }
    try:
        token = _access_token()
        resp = requests.post(
            f"{settings.MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest",
            json=payload,
            headers={'Authorization': f'Bearer {token}'},
            timeout=20,
        )
        data = resp.json()
    except (requests.RequestException, ValueError, KeyError) as exc:
        raise MpesaError('Could not reach M-Pesa. Please try again in a moment.') from exc

    if resp.status_code != 200 or str(data.get('ResponseCode')) != '0':
        raise MpesaError(data.get('errorMessage') or data.get('ResponseDescription') or 'M-Pesa rejected the request.')
    return data['CheckoutRequestID'], data.get('MerchantRequestID', '')
