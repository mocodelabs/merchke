import io
from datetime import timedelta
from decimal import Decimal
from unittest import mock

from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone

from core.testutils import client_for, make_product, make_user
from orders.models import Order
from products.models import Product
from .models import EscrowTransaction, MpesaTransaction
from .mpesa import MpesaError, normalize_phone


class PhoneTests(TestCase):
    def test_normalizes_kenyan_formats(self):
        for raw in ('0712345678', '+254 712 345 678', '254712345678', '712345678'):
            self.assertEqual(normalize_phone(raw), '254712345678')
        self.assertEqual(normalize_phone('0110123456'), '254110123456')
        with self.assertRaises(MpesaError):
            normalize_phone('12345')


@override_settings(MPESA_SIMULATE=True)
class CheckoutEscrowTests(TestCase):
    def setUp(self):
        self.vendor_user = make_user('brand', vendor=True)
        self.vendor = self.vendor_user.vendor_profile
        self.product = make_product(self.vendor, price=1000, stock=3)
        self.buyer = make_user('wanjiku')
        self.buyer_client = client_for(self.buyer)
        self.vendor_client = client_for(self.vendor_user)

    def checkout(self, quantity=1, **extra):
        payload = {'items': [{'product_id': self.product.pk, 'quantity': quantity}],
                   'phone': '0712345678', 'delivery_mode': 'delivery',
                   'delivery_address': 'Ngong Rd', 'delivery_town': 'Kilimani', 'delivery_county': 'Nairobi'}
        payload.update(extra)
        return self.buyer_client.post('/api/orders/checkout/', payload, format='json')

    def test_full_buyer_flow(self):
        resp = self.checkout(quantity=2)
        self.assertEqual(resp.status_code, 201, resp.data)
        order_data = resp.data['orders'][0]
        self.assertEqual(Decimal(order_data['total_amount']), Decimal('2200'))  # 2 x 1000 + KSh 200 delivery
        self.assertEqual(order_data['status'], 'confirmed')
        order_id = order_data['id']

        escrow = EscrowTransaction.objects.get(order_id=order_id)
        self.assertEqual(escrow.status, 'held')
        self.assertEqual(escrow.vendor_amount, Decimal('1980.00'))
        self.assertEqual(escrow.commission_amount, Decimal('220.00'))
        self.assertIsNone(escrow.auto_release_at)
        self.product.refresh_from_db()
        self.assertEqual((self.product.stock, self.product.sales_count), (1, 2))

        # buyer cannot confirm before shipping
        self.assertEqual(self.buyer_client.post(f'/api/escrow/{order_id}/release/').status_code, 400)

        # vendor sees and ships the order -> 7-day clock starts
        vendor_orders = self.vendor_client.get('/api/orders/vendor/').data
        self.assertEqual([o['id'] for o in vendor_orders], [order_id])
        self.assertEqual(self.vendor_client.post(f'/api/orders/{order_id}/ship/').status_code, 200)
        escrow.refresh_from_db()
        self.assertAlmostEqual(escrow.auto_release_at, timezone.now() + timedelta(days=7), delta=timedelta(minutes=1))

        resp = self.buyer_client.post(f'/api/escrow/{order_id}/release/')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['status'], 'released')
        order = Order.objects.get(pk=order_id)
        self.assertEqual((order.status, order.payout_status), ('delivered', 'released'))

        stats = self.vendor_client.get('/api/vendors/dashboard/').data
        self.assertEqual(stats['earnings']['released'], 1980.0)

    def test_dispute_freezes_funds(self):
        order_id = self.checkout().data['orders'][0]['id']
        resp = self.buyer_client.post(f'/api/escrow/{order_id}/dispute/',
                                      {'reason': 'not_received', 'description': 'Nothing came'}, format='json')
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertEqual(resp.data['escrow']['status'], 'disputed')
        self.vendor_client.post(f'/api/orders/{order_id}/ship/')
        self.assertEqual(self.buyer_client.post(f'/api/escrow/{order_id}/release/').status_code, 400)
        # second dispute rejected
        resp = self.buyer_client.post(f'/api/escrow/{order_id}/dispute/',
                                      {'reason': 'other', 'description': 'again'}, format='json')
        self.assertEqual(resp.status_code, 400)

    def test_auto_release_after_window(self):
        order_id = self.checkout().data['orders'][0]['id']
        self.vendor_client.post(f'/api/orders/{order_id}/ship/')
        EscrowTransaction.objects.filter(order_id=order_id).update(auto_release_at=timezone.now() - timedelta(minutes=1))
        call_command('process_due_tasks', stdout=io.StringIO())
        self.assertEqual(EscrowTransaction.objects.get(order_id=order_id).status, 'released')

    def test_other_users_cannot_see_escrow(self):
        order_id = self.checkout().data['orders'][0]['id']
        stranger = client_for(make_user('stranger'))
        self.assertEqual(stranger.get(f'/api/escrow/{order_id}/').status_code, 404)
        self.assertEqual(stranger.post(f'/api/escrow/{order_id}/release/').status_code, 404)
        self.assertEqual(self.vendor_client.get(f'/api/escrow/{order_id}/').status_code, 200)

    def test_checkout_rejects_overselling_and_inactive_products(self):
        self.assertEqual(self.checkout(quantity=4).status_code, 400)
        Product.objects.filter(pk=self.product.pk).update(is_active=False)
        self.assertEqual(self.checkout().status_code, 400)
        self.assertFalse(Order.objects.exists())

    def test_multi_vendor_cart_splits_orders(self):
        other = make_product(make_user('other', vendor=True).vendor_profile, price=500)
        resp = self.buyer_client.post('/api/orders/checkout/', {
            'items': [{'product_id': self.product.pk, 'quantity': 1}, {'product_id': other.pk, 'quantity': 1}],
            'phone': '0712345678',
        }, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertEqual(len(resp.data['orders']), 2)
        self.assertEqual(Decimal(resp.data['total']), Decimal('1900'))  # 1000+200 + 500+200
        self.assertEqual(MpesaTransaction.objects.count(), 1)
        self.assertEqual(EscrowTransaction.objects.count(), 2)


@override_settings(MPESA_SIMULATE=False)
class CallbackTests(TestCase):
    def setUp(self):
        self.buyer = make_user('otieno')
        vendor = make_user('shop', vendor=True).vendor_profile
        self.product = make_product(vendor, price=800)

    @mock.patch('payments.services.send_stk_push', return_value=('ws_CO_77', 'mr'))
    def test_underpayment_is_rejected_and_callback_is_idempotent(self, _push):
        resp = client_for(self.buyer).post('/api/orders/checkout/', {
            'items': [{'product_id': self.product.pk, 'quantity': 1}], 'phone': '0712345678',
        }, format='json')
        order_id = resp.data['orders'][0]['id']

        def callback(amount):
            return {'Body': {'stkCallback': {
                'CheckoutRequestID': 'ws_CO_77', 'ResultCode': 0, 'ResultDesc': 'ok',
                'CallbackMetadata': {'Item': [{'Name': 'Amount', 'Value': amount},
                                              {'Name': 'MpesaReceiptNumber', 'Value': 'R1'}]},
            }}}

        client_for().post('/api/payments/mpesa/callback/', callback(10), format='json')
        self.assertEqual(Order.objects.get(pk=order_id).status, 'pending')
        self.assertEqual(MpesaTransaction.objects.get().status, 'failed')

    @mock.patch('payments.services.send_stk_push', return_value=('ws_CO_88', 'mr'))
    def test_duplicate_success_callbacks_hold_funds_once(self, _push):
        resp = client_for(self.buyer).post('/api/orders/checkout/', {
            'items': [{'product_id': self.product.pk, 'quantity': 1}], 'phone': '0712345678',
        }, format='json')
        txn_id = resp.data['transaction']['id']
        body = {'Body': {'stkCallback': {
            'CheckoutRequestID': 'ws_CO_88', 'ResultCode': 0, 'ResultDesc': 'ok',
            'CallbackMetadata': {'Item': [{'Name': 'Amount', 'Value': 1000},
                                          {'Name': 'MpesaReceiptNumber', 'Value': 'R2'}]},
        }}}
        for _ in range(2):
            client_for().post('/api/payments/mpesa/callback/', body, format='json')
        self.assertEqual(EscrowTransaction.objects.count(), 1)
        self.product.refresh_from_db()
        self.assertEqual(self.product.sales_count, 1)
        status = client_for(self.buyer).get(f'/api/payments/transactions/{txn_id}/').data
        self.assertEqual(status['status'], 'completed')

    @mock.patch('payments.services.send_stk_push', side_effect=[('ws_A', 'm'), ('ws_B', 'm')])
    def test_retry_resends_same_payment_for_all_orders(self, _push):
        other = make_product(make_user('second', vendor=True).vendor_profile, price=300)
        buyer = client_for(self.buyer)
        resp = buyer.post('/api/orders/checkout/', {
            'items': [{'product_id': self.product.pk, 'quantity': 1}, {'product_id': other.pk, 'quantity': 1}],
            'phone': '0712345678',
        }, format='json')
        first = resp.data['transaction']
        retry = buyer.post(f"/api/payments/transactions/{first['id']}/retry/", {}, format='json')
        self.assertEqual(retry.status_code, 201, retry.data)
        self.assertEqual(retry.data['amount'], first['amount'])
        self.assertEqual(MpesaTransaction.objects.get(pk=first['id']).status, 'failed')
        client_for().post('/api/payments/mpesa/callback/', {'Body': {'stkCallback': {
            'CheckoutRequestID': 'ws_B', 'ResultCode': 0, 'ResultDesc': 'ok',
            'CallbackMetadata': {'Item': [{'Name': 'Amount', 'Value': 1500}]},
        }}}, format='json')
        self.assertEqual(set(Order.objects.values_list('status', flat=True)), {'confirmed'})
        self.assertEqual(buyer.post(f"/api/payments/transactions/{retry.data['id']}/retry/").status_code, 400)

    def test_malformed_callback_is_accepted(self):
        resp = client_for().post('/api/payments/mpesa/callback/', {'junk': True}, format='json')
        self.assertEqual(resp.data['ResultCode'], 0)


class AuthTests(TestCase):
    def test_register_vendor_and_login(self):
        resp = client_for().post('/api/accounts/register/', {
            'username': 'newdj', 'email': 'NewDJ@example.com', 'password': 'Str0ng-pass!',
            'password2': 'Str0ng-pass!', 'is_vendor': True, 'is_customer': False, 'vendor_type': 'tattoo',
        }, format='json')
        self.assertEqual(resp.status_code, 201, resp.data)
        resp = client_for().post('/api/accounts/login/', {'email': 'newdj@example.com', 'password': 'Str0ng-pass!'},
                                 format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(resp.data['is_vendor'])
        bad = client_for().post('/api/accounts/login/', {'email': 'newdj@example.com', 'password': 'nope'},
                                format='json')
        self.assertEqual(bad.status_code, 401)
