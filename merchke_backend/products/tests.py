from datetime import timedelta
from unittest import mock

from django.core import mail
from django.test import TestCase, override_settings
from django.utils import timezone

from core.testutils import client_for, image_file, make_product, make_user
from payments.models import MpesaTransaction
from .models import ListingFee, Product


def product_payload(**extra):
    data = {'name': 'Signed Vinyl', 'description': 'Limited', 'price': '2500', 'stock': '5',
            'product_type': 'physical', 'image': image_file()}
    data.update(extra)
    return data


class ListingFeeTests(TestCase):
    def setUp(self):
        self.vendor_user = make_user('sauti', vendor=True)
        self.vendor = self.vendor_user.vendor_profile
        self.client = client_for(self.vendor_user)

    @override_settings(MPESA_SIMULATE=True)
    def test_simulated_payment_publishes_listing(self):
        resp = self.client.post('/api/products/', product_payload(), format='multipart')
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertEqual(resp.data['listing_fee']['status'], 'paid')
        self.assertEqual(resp.data['listing_fee']['amount'], '130.00')
        product = Product.objects.get(pk=resp.data['id'])
        self.assertTrue(product.is_active)

    @override_settings(MPESA_SIMULATE=False)
    @mock.patch('payments.services.send_stk_push', return_value=('ws_CO_123', 'mr_1'))
    def test_listing_hidden_until_callback(self, _push):
        resp = self.client.post('/api/products/', product_payload(), format='multipart')
        self.assertEqual(resp.status_code, 201)
        pk = resp.data['id']
        self.assertFalse(Product.objects.get(pk=pk).is_active)
        self.assertEqual(self.client.get(f'/api/products/{pk}/listing-fee-status/').data['status'], 'pending')
        # hidden from the public catalogue
        self.assertEqual(client_for().get(f'/api/products/{pk}/').status_code, 404)

        callback = {'Body': {'stkCallback': {
            'CheckoutRequestID': 'ws_CO_123', 'ResultCode': 0, 'ResultDesc': 'ok',
            'CallbackMetadata': {'Item': [
                {'Name': 'Amount', 'Value': 130}, {'Name': 'MpesaReceiptNumber', 'Value': 'QWE123'},
                {'Name': 'PhoneNumber', 'Value': 254712345678},
            ]},
        }}}
        self.assertEqual(client_for().post('/api/payments/mpesa/callback/', callback, format='json').status_code, 200)
        self.assertTrue(Product.objects.get(pk=pk).is_active)
        self.assertEqual(ListingFee.objects.get(product_id=pk).status, 'paid')

    @override_settings(MPESA_SIMULATE=False)
    @mock.patch('payments.services.send_stk_push', return_value=('ws_CO_9', 'mr_9'))
    def test_cannot_self_publish_unpaid_listing(self, _push):
        pk = self.client.post('/api/products/', product_payload(), format='multipart').data['id']
        resp = self.client.patch(f'/api/products/{pk}/manage/', {'is_active': 'true'}, format='multipart')
        self.assertEqual(resp.status_code, 400)
        self.assertFalse(Product.objects.get(pk=pk).is_active)

    @override_settings(MPESA_SIMULATE=False)
    @mock.patch('payments.services.send_stk_push', return_value=('ws_CO_7', 'mr_7'))
    def test_fee_expires_after_ten_minutes_and_vendor_is_emailed(self, _push):
        pk = self.client.post('/api/products/', product_payload(), format='multipart').data['id']
        ListingFee.objects.filter(product_id=pk).update(requested_at=timezone.now() - timedelta(minutes=11))
        resp = self.client.get(f'/api/products/{pk}/listing-fee-status/')
        self.assertEqual(resp.data['status'], 'expired')
        self.assertEqual(len(mail.outbox), 1)
        # vendor can resend
        resp = self.client.post(f'/api/products/{pk}/listing-fee/retry/', {}, format='json')
        self.assertEqual(resp.data['status'], 'pending')

    @override_settings(MPESA_SIMULATE=False)
    @mock.patch('payments.services.send_stk_push', return_value=('ws_CO_5', 'mr_5'))
    def test_cancelled_prompt_marks_fee_failed(self, _push):
        pk = self.client.post('/api/products/', product_payload(), format='multipart').data['id']
        callback = {'Body': {'stkCallback': {'CheckoutRequestID': 'ws_CO_5', 'ResultCode': 1032,
                                             'ResultDesc': 'Request cancelled by user'}}}
        client_for().post('/api/payments/mpesa/callback/', callback, format='json')
        fee = ListingFee.objects.get(product_id=pk)
        self.assertEqual(fee.status, 'failed')
        self.assertIn('cancelled', fee.error)

    def test_requires_mpesa_number(self):
        self.vendor.mpesa_phone = ''
        self.vendor.save()
        resp = self.client.post('/api/products/', product_payload(), format='multipart')
        self.assertEqual(resp.status_code, 400)
        self.assertIn('mpesa_phone', resp.data)
        self.assertFalse(Product.objects.exists())

    def test_existing_products_without_fee_stay_live(self):
        product = make_product(self.vendor)
        resp = client_for().get(f'/api/products/{product.pk}/')
        self.assertEqual(resp.status_code, 200)
        self.assertIsNone(resp.data['listing_fee_status'])


class CatalogueFilterTests(TestCase):
    def test_search_and_vendor_type_filter(self):
        jersey = make_user('kitstore', vendor=True, vendor_type='jersey').vendor_profile
        dj = make_user('djmix', vendor=True, vendor_type='dj').vendor_profile
        make_product(jersey, name='Harambee Stars Home Kit')
        make_product(dj, name='Gengetone Mix USB')
        client = client_for()
        self.assertEqual(len(client.get('/api/products/', {'type': 'jersey'}).data), 1)
        names = [p['name'] for p in client.get('/api/products/', {'search': 'gengetone'}).data]
        self.assertEqual(names, ['Gengetone Mix USB'])

    def test_unpaid_order_cannot_download_digital_file(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        from orders.models import Order, OrderItem
        vendor = make_user('beats', vendor=True).vendor_profile
        product = make_product(vendor, product_type='digital',
                               digital_file=SimpleUploadedFile('beat.mp3', b'ID3'))
        buyer = make_user('fan')
        order = Order.objects.create(user=buyer, total_amount=1500)  # status pending = unpaid
        OrderItem.objects.create(order=order, product=product, vendor=vendor, quantity=1, unit_price=1500)
        self.assertEqual(client_for(buyer).get(f'/api/products/{product.pk}/download/').status_code, 403)
        self.assertFalse(MpesaTransaction.objects.exists())
