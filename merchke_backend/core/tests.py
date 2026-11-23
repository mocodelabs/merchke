"""Tests for jobs, services (Hire), podcasts, ads and the Merchi chat endpoint."""
from datetime import timedelta
from unittest import mock

from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone

from ads.models import Ad
from chat.models import ChatMessage
from core.testutils import client_for, image_file, make_user
from jobs.models import Job
from services.models import Service


@override_settings(MPESA_SIMULATE=True)
class JobTests(TestCase):
    def setUp(self):
        self.poster = make_user('studio', vendor=True)
        self.client = client_for(self.poster)

    def post_job(self, **extra):
        data = {'title': 'Video Editor', 'company': 'Studio KE', 'description': 'Edit music videos',
                'category': 'videography', 'location': 'Nairobi', 'salary_range': 'KSh 60,000'}
        data.update(extra)
        return self.client.post('/api/jobs/', data, format='json')

    def test_job_goes_live_after_fee_and_accepts_applications(self):
        resp = self.post_job()
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertEqual(resp.data['fee_status'], 'paid')
        self.assertEqual(resp.data['fee_amount'], '500.00')
        job_id = resp.data['id']

        public = client_for().get('/api/jobs/', {'search': 'editor'}).data
        self.assertEqual([j['id'] for j in public], [job_id])
        self.assertNotIn('fee_status', public[0])

        apply = client_for().post(f'/api/jobs/{job_id}/apply/', {
            'applicant_name': 'Achieng', 'email': 'a@example.com', 'phone': '0712000000',
            'cover_letter': 'I cut for top artists', 'cv_file': SimpleUploadedFile('cv.pdf', b'%PDF-1.4'),
        }, format='multipart')
        self.assertEqual(apply.status_code, 201, apply.data)
        self.assertEqual(len(mail.outbox), 1)
        dup = client_for().post(f'/api/jobs/{job_id}/apply/', {
            'applicant_name': 'Achieng', 'email': 'A@example.com', 'phone': '0712000000',
            'cv_url': 'https://drive.example.com/cv',
        }, format='multipart')
        self.assertEqual(dup.status_code, 400)
        self.assertEqual(len(self.client.get(f'/api/jobs/{job_id}/applications/').data), 1)

    def test_application_needs_cv(self):
        job_id = self.post_job().data['id']
        resp = client_for().post(f'/api/jobs/{job_id}/apply/', {
            'applicant_name': 'X', 'email': 'x@example.com', 'phone': '07',
        }, format='multipart')
        self.assertEqual(resp.status_code, 400)

    def test_expired_deadline_hidden(self):
        job_id = self.post_job().data['id']
        Job.objects.filter(pk=job_id).update(deadline=timezone.localdate() - timedelta(days=1))
        self.assertEqual(client_for().get('/api/jobs/').data, [])

    def test_buyers_cannot_post_jobs(self):
        resp = client_for(make_user('buyer')).post('/api/jobs/', {'title': 'x'}, format='json')
        self.assertEqual(resp.status_code, 403)


class ServiceTests(TestCase):
    def setUp(self):
        self.mua = make_user('glam', vendor=True, vendor_type='makeup')
        self.client = client_for(self.mua)

    def create(self, **extra):
        data = {'title': 'Bridal glam', 'category': 'makeup', 'description': 'Full face', 'price_from': 3000,
                'price_to': 8000, 'price_unit': 'per look', 'city': 'Nairobi',
                'images': [image_file('a.png'), image_file('b.png')]}
        data.update(extra)
        return self.client.post('/api/services/', data, format='multipart')

    def test_create_browse_and_book(self):
        resp = self.create()
        self.assertEqual(resp.status_code, 201, resp.data)
        service_id = resp.data['id']
        listed = client_for().get('/api/services/', {'category': 'makeup'}).data
        self.assertEqual(len(listed[0]['images']), 2)

        booking = client_for().post(f'/api/services/{service_id}/book/', {
            'client_name': 'Njeri', 'client_phone': '0712', 'client_email': 'n@example.com',
            'date_requested': str(timezone.localdate() + timedelta(days=3)), 'message': 'Wedding',
        }, format='json')
        self.assertEqual(booking.status_code, 201, booking.data)
        self.assertEqual(len(mail.outbox), 1)
        booking_id = booking.data['booking']['id']
        resp = self.client.patch(f'/api/services/bookings/{booking_id}/', {'status': 'confirmed'}, format='json')
        self.assertEqual(resp.data['status'], 'confirmed')
        self.assertEqual(len(mail.outbox), 2)

    def test_models_category_requires_verified_vendor(self):
        self.create(category='models', title='Video vixen')
        self.assertEqual(client_for().get('/api/services/', {'category': 'models'}).data, [])
        self.mua.vendor_profile.is_verified = True
        self.mua.vendor_profile.save()
        self.assertEqual(len(client_for().get('/api/services/', {'category': 'models'}).data), 1)

    def test_price_range_validation(self):
        self.assertEqual(self.create(price_from=5000, price_to=1000).status_code, 400)
        self.assertFalse(Service.objects.exists())


class PodcastTests(TestCase):
    def test_create_show_and_episode(self):
        host = make_user('podhost', vendor=True, vendor_type='creative')
        client = client_for(host)
        resp = client.post('/api/podcasts/', {
            'title': 'Mic Cheque', 'description': 'Culture talk', 'category': 'music',
            'cover_image': image_file(),
        }, format='multipart')
        self.assertEqual(resp.status_code, 201, resp.data)
        pod_id, slug = resp.data['id'], resp.data['slug']
        ep = client.post(f'/api/podcasts/{pod_id}/episodes/', {
            'title': 'Ep 1', 'audio_file': SimpleUploadedFile('ep1.mp3', b'ID3', content_type='audio/mpeg'),
        }, format='multipart')
        self.assertEqual(ep.status_code, 201, ep.data)
        no_audio = client.post(f'/api/podcasts/{pod_id}/episodes/', {'title': 'Ep 2'}, format='multipart')
        self.assertEqual(no_audio.status_code, 400)
        detail = client_for().get(f'/api/podcasts/{slug}/').data
        self.assertEqual(len(detail['episodes']), 1)


@override_settings(MPESA_SIMULATE=True)
class AdTests(TestCase):
    def test_paid_ad_is_served_and_tracks_clicks(self):
        vendor = make_user('brandx', vendor=True)
        today = timezone.localdate()
        resp = client_for(vendor).post('/api/ads/create/', {
            'ad_type': 'banner', 'target_page': 'store', 'title': 'Drop 2', 'image': image_file(),
            'link': '/vendors/brandx', 'budget_ksh': 600,
            'start_date': str(today), 'end_date': str(today + timedelta(days=7)), 'phone': '0712345678',
        }, format='multipart')
        self.assertEqual(resp.status_code, 201, resp.data)
        self.assertTrue(resp.data['ad']['is_active'])
        served = client_for().get('/api/ads/serve/', {'page': 'store', 'ad_type': 'banner'}).data
        self.assertEqual(len(served), 1)
        click = client_for().get(served[0]['click_url'])
        self.assertEqual(click.status_code, 302)
        ad = Ad.objects.get()
        self.assertEqual((ad.impressions, ad.clicks), (1, 1))

    def test_rejects_unsafe_links_and_low_budget(self):
        client = client_for(make_user('brandy', vendor=True))
        today = timezone.localdate()

        def create(**extra):
            data = {'ad_type': 'homepage_spotlight', 'title': 'x', 'image': image_file(), 'link': '/store',
                    'budget_ksh': 1000, 'start_date': str(today), 'end_date': str(today), 'phone': '0712345678'}
            data.update(extra)
            return client.post('/api/ads/create/', data, format='multipart')

        for bad_link in ('javascript:alert(1)', '//evil.example.com'):
            resp = create(link=bad_link)
            self.assertEqual(resp.status_code, 400)
            self.assertIn('link', resp.data)
        resp = create(budget_ksh=100)
        self.assertEqual(resp.status_code, 400)
        self.assertIn('budget_ksh', resp.data)
        self.assertFalse(Ad.objects.exists())


class ChatTests(TestCase):
    @mock.patch('chat.views.generate_reply', return_value=('Sawa! Here is how...', False))
    def test_rate_limit_per_session(self, reply):
        client = client_for()
        for i in range(20):
            resp = client.post('/api/chat/', {'message': f'q{i}', 'session_id': 'sess-abc12345'}, format='json')
            self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['remaining_today'], 0)
        resp = client.post('/api/chat/', {'message': 'one more', 'session_id': 'sess-abc12345'}, format='json')
        self.assertEqual(resp.status_code, 429)
        self.assertEqual(ChatMessage.objects.filter(role='user').count(), 20)
        # history is passed oldest-first and ends with the latest user message
        history = reply.call_args_list[-1].args[0]
        self.assertEqual(history[-1], {'role': 'user', 'content': 'q19'})

    @mock.patch('chat.views.generate_reply', return_value=('hi', False))
    def test_rejects_bad_input(self, _reply):
        client = client_for()
        self.assertEqual(client.post('/api/chat/', {'message': '', 'session_id': 'sess-abc12345'},
                                     format='json').status_code, 400)
        self.assertEqual(client.post('/api/chat/', {'message': 'hi', 'session_id': 'x'},
                                     format='json').status_code, 400)

    @override_settings(AI_PROVIDER='anthropic', ANTHROPIC_API_KEY='')
    def test_no_api_key_gives_canned_reply_not_500(self):
        resp = client_for().post('/api/chat/', {'message': 'hi', 'session_id': 'sess-nokey123'}, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertIn('support@merchke.co.ke', resp.data['reply'])
        self.assertTrue(ChatMessage.objects.get(role='assistant').is_fallback)

    @override_settings(AI_PROVIDER='anthropic', ANTHROPIC_API_KEY='sk-test')
    def test_falls_back_on_any_provider_error(self):
        from chat import assistant
        with mock.patch.object(assistant, '_get_client', side_effect=TypeError('boom')):
            text, is_fallback = assistant.generate_reply([{'role': 'user', 'content': 'hi'}])
        self.assertTrue(is_fallback)
        self.assertIn('support@merchke.co.ke', text)

    @override_settings(AI_PROVIDER='anthropic', ANTHROPIC_API_KEY='sk-test')
    def test_sends_cached_system_prompt_and_history(self):
        from types import SimpleNamespace
        from chat import assistant
        fake = mock.Mock()
        fake.beta.messages.create.return_value = SimpleNamespace(
            stop_reason='end_turn', content=[SimpleNamespace(type='text', text='Your money is held in escrow.')],
        )
        with mock.patch.object(assistant, '_get_client', return_value=fake):
            text, is_fallback = assistant.generate_reply([
                {'role': 'assistant', 'content': 'stray'}, {'role': 'user', 'content': 'Is my money safe?'},
            ])
        self.assertEqual((text, is_fallback), ('Your money is held in escrow.', False))
        kwargs = fake.beta.messages.create.call_args.kwargs
        self.assertEqual(kwargs['system'][0]['cache_control'], {'type': 'ephemeral'})
        self.assertEqual(kwargs['messages'], [{'role': 'user', 'content': 'Is my money safe?'}])
        self.assertEqual(kwargs['fallbacks'], 'default')
