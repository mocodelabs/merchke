from datetime import timedelta
from unittest import mock

from django.test import TestCase, override_settings
from django.utils import timezone

from core.testutils import client_for, image_file, make_event, make_user
from payments.models import EscrowTransaction
from .models import Event, Ticket


@override_settings(MPESA_SIMULATE=True)
class TicketTests(TestCase):
    def setUp(self):
        self.organizer = make_user('promoter', vendor=True, vendor_type='events')
        self.event, self.tt = make_event(self.organizer.vendor_profile, price=1500, quantity=3)
        self.buyer = make_user('fan')

    def buy(self, quantity=2):
        return client_for(self.buyer).post(f'/api/events/{self.event.pk}/purchase-tickets/', {
            'ticket_type_id': self.tt.pk, 'quantity': quantity, 'phone': '0712345678',
        }, format='json')

    def test_purchase_issues_tickets_and_holds_escrow_until_after_event(self):
        resp = self.buy(2)
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertEqual(resp.data['transaction']['status'], 'completed')
        tickets = Ticket.objects.filter(buyer=self.buyer)
        self.assertEqual(tickets.count(), 2)
        self.assertEqual(len({t.qr_token for t in tickets}), 2)
        self.assertTrue(all(t.ticket_number.startswith('TKT') for t in tickets))
        self.tt.refresh_from_db()
        self.assertEqual(self.tt.tickets_sold, 2)

        escrow = EscrowTransaction.objects.get(order_id=resp.data['order_id'])
        self.assertEqual(escrow.vendor, self.organizer.vendor_profile)
        self.assertEqual(escrow.auto_release_at, self.event.start_datetime + timedelta(days=2))

        mine = client_for(self.buyer).get('/api/tickets/mine/', {'event': self.event.slug}).data
        self.assertEqual(len(mine), 2)

    def test_cannot_buy_more_than_remaining(self):
        self.assertEqual(self.buy(4).status_code, 400)

    def test_gate_verification_and_single_use(self):
        self.buy(1)
        token = Ticket.objects.get().qr_token
        organizer = client_for(self.organizer)
        resp = organizer.get(f'/api/tickets/{token}/verify/')
        self.assertTrue(resp.data['valid'])
        self.assertEqual(organizer.post(f'/api/tickets/{token}/verify/').status_code, 200)
        self.assertEqual(organizer.post(f'/api/tickets/{token}/verify/').status_code, 409)
        self.assertFalse(organizer.get(f'/api/tickets/{token}/verify/').data['valid'])
        # other vendors cannot scan this event's tickets
        rival = client_for(make_user('rival', vendor=True))
        self.assertEqual(rival.get(f'/api/tickets/{token}/verify/').status_code, 403)

    def test_sold_out_event_flips_status(self):
        self.buy(3)
        self.assertEqual(Event.objects.get(pk=self.event.pk).status, 'sold_out')
        # still publicly viewable by slug
        self.assertEqual(client_for().get(f'/api/events/{self.event.slug}/').status_code, 200)

    def test_list_filters(self):
        make_event(self.organizer.vendor_profile, title='Derby Final', category='tournament', town='Kisumu')
        make_event(self.organizer.vendor_profile, title='Old Show', days_ahead=-5)
        client = client_for()
        titles = [e['title'] for e in client.get('/api/events/', {'category': 'tournament'}).data]
        self.assertEqual(titles, ['Derby Final'])
        self.assertEqual(len(client.get('/api/events/', {'city': 'kisumu'}).data), 1)
        all_titles = [e['title'] for e in client.get('/api/events/').data]
        self.assertNotIn('Old Show', all_titles)

    def test_boost_features_event(self):
        resp = client_for(self.organizer).post(f'/api/events/{self.event.pk}/boost/', {
            'budget_ksh': 1000, 'days': 5, 'ad_copy': 'Early bird ends Friday', 'phone': '0712345678',
            'ad_image': image_file(),
        }, format='multipart')
        self.assertEqual(resp.status_code, 201, resp.data)
        self.event.refresh_from_db()
        self.assertTrue(self.event.is_featured)
        ads = client_for().get('/api/events/featured-ads/').data
        self.assertEqual(len(ads), 1)
        self.assertEqual(client_for(self.organizer).post(
            f'/api/events/{self.event.pk}/boost/', {'budget_ksh': 100, 'phone': '0712345678'},
        ).status_code, 400)

    @override_settings(MPESA_SIMULATE=False)
    @mock.patch('payments.services.send_stk_push', return_value=('ws_T', 'm'))
    def test_oversell_race_refunds_instead(self, _push):
        order_id = self.buy(2).data['order_id']
        self.tt.tickets_sold = 2  # someone else bought in the meantime
        self.tt.save()
        client_for().post('/api/payments/mpesa/callback/', {'Body': {'stkCallback': {
            'CheckoutRequestID': 'ws_T', 'ResultCode': 0, 'ResultDesc': 'ok',
            'CallbackMetadata': {'Item': [{'Name': 'Amount', 'Value': 3000},
                                          {'Name': 'MpesaReceiptNumber', 'Value': 'X'}]},
        }}}, format='json')
        self.assertEqual(EscrowTransaction.objects.get(order_id=order_id).status, 'refunded')
        self.assertFalse(Ticket.objects.exists())

    def test_past_event_cannot_be_bought(self):
        Event.objects.filter(pk=self.event.pk).update(start_datetime=timezone.now() - timedelta(days=1))
        self.assertEqual(self.buy(1).status_code, 400)
