"""
Demo content for local development and staging:

    python manage.py seed_demo

Creates (idempotently) a few sellers plus products, events, services, jobs,
podcasts and ads so every section of the site has something to show.
Demo logins: <name>@merchke.test with the password below. Never run on production.
"""
import io
import random
from datetime import timedelta

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from PIL import Image, ImageDraw

from ads.models import Ad
from events.models import Event, TicketType
from jobs.models import Job
from podcasts.models import Podcast, PodcastEpisode
from products.models import Product, ProductVariant
from services.models import Service, ServiceImage
from vendors.models import Vendor

DEMO_PASSWORD = 'merchke-demo-2026'
User = get_user_model()

PALETTE = ['#f97316', '#10b981', '#6366f1', '#ec4899', '#eab308', '#14b8a6', '#ef4444']


def demo_image(label, size=(1200, 800), color=None):
    color = color or random.choice(PALETTE)
    img = Image.new('RGB', size, color)
    draw = ImageDraw.Draw(img)
    for i in range(0, size[0], 80):
        draw.line([(i, 0), (i + size[1], size[1])], fill='#00000022', width=24)
    draw.rectangle([0, size[1] - 160, size[0], size[1]], fill='#0a0a0a')
    draw.text((40, size[1] - 110), label[:40], fill='#ffffff')
    buf = io.BytesIO()
    img.save(buf, format='JPEG', quality=80)
    return ContentFile(buf.getvalue(), name=f"{label.lower().replace(' ', '-')[:30]}.jpg")


def seller(username, brand, vendor_type, **extra):
    user, created = User.objects.get_or_create(
        username=username,
        defaults={'email': f'{username}@merchke.test', 'is_vendor': True, 'is_customer': False},
    )
    if created:
        user.set_password(DEMO_PASSWORD)
        user.save()
    vendor, _ = Vendor.objects.get_or_create(
        user=user,
        defaults={'brand_name': brand, 'contact_email': user.email, 'vendor_type': vendor_type,
                  'mpesa_phone': '254708374149', 'location': 'Nairobi', 'county': 'Nairobi', **extra},
    )
    return vendor


class Command(BaseCommand):
    help = 'Seed demo sellers and content for every Merchke section (dev/staging only).'

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError('seed_demo only runs with DEBUG=True.')
        random.seed(7)
        now = timezone.now()

        buyer, created = User.objects.get_or_create(
            username='demo-buyer', defaults={'email': 'demo-buyer@merchke.test', 'is_customer': True},
        )
        if created:
            buyer.set_password(DEMO_PASSWORD)
            buyer.save()

        sauti = seller('demo-sauti', 'Sauti Collective', 'artist', is_featured=True, is_verified=True,
                       tagline='Nairobi sound, worn loud')
        kits = seller('demo-kits', 'Harambee Kits', 'jersey', is_verified=True, tagline='Home, away & retro kits')
        live = seller('demo-live', 'Nairobi Live Promotions', 'events', is_verified=True)
        glam = seller('demo-glam', 'Glam by Wanjiru', 'makeup', is_verified=True)
        ink = seller('demo-ink', 'Kilele Ink', 'tattoo')
        pod = seller('demo-pod', 'Mic Cheque Media', 'creative')

        if not Product.objects.filter(vendor=sauti).exists():
            for name, price, sale in [('Gengetone Tour Tee', 1800, 1500), ('Sauti Bucket Hat', 1200, None),
                                      ('Signed Vinyl - Limited', 4500, None)]:
                Product.objects.create(vendor=sauti, name=name, description=f'{name} from the Sauti Collective drop.',
                                       short_description='Official merch', price=price, sale_price=sale,
                                       stock=25, image=demo_image(name), is_featured=True)
        if not Product.objects.filter(vendor=kits).exists():
            for name, price in [('Harambee Stars Home 2026', 3500), ('Gor Mahia Retro 1987', 2800),
                                ('AFC Leopards Away', 2800)]:
                p = Product.objects.create(vendor=kits, name=name, description=f'{name} jersey, breathable fabric.',
                                           price=price, stock=40, image=demo_image(name, color='#10b981'))
                for size in ['S', 'M', 'L', 'XL']:
                    ProductVariant.objects.create(product=p, size=size, stock=10)

        events = [
            ('Nairobi Live: Gengetone Night', 'concert', 'KICC Grounds', 'Nairobi', 12, 1500),
            ('Mtaa Cup Final 2026', 'tournament', 'Camp Toyoyo', 'Nairobi', 9, 300),
            ('Laugh Mombasa', 'comedy', 'Swahili Pot Hub', 'Mombasa', 20, 1000),
            ('Lake Run Moto Ride', 'ride', 'Dunga Hill Camp', 'Kisumu', 30, 2000),
        ]
        for title, category, venue, town, days, price in events:
            if Event.objects.filter(title=title).exists():
                continue
            event = Event.objects.create(
                vendor=live, title=title, description=f'{title}. Gates open 6pm. Bring your energy.',
                short_description=f'{town} · {category}', banner_image=demo_image(title, color='#f97316'),
                venue_name=venue, venue_address=f'{venue}, {town}', town=town, category=category,
                start_datetime=now + timedelta(days=days), status='published', is_featured=(days < 15),
            )
            TicketType.objects.create(event=event, name='Regular', price=price, total_quantity=300)
            TicketType.objects.create(event=event, name='VIP', price=price * 3, total_quantity=50)

        services = [
            (glam, 'Bridal & editorial glam', 'makeup', '', 3500, 9000, 'per look', 'Nairobi'),
            (ink, 'Custom fine-line tattoos', 'tattoo', '', 5000, 30000, 'per piece', 'Nairobi'),
            (sauti, 'Vintage Range Rover for shoots', 'props', 'car', 15000, None, 'per day', 'Nairobi'),
            (glam, 'Studio photography sessions', 'photography', '', 8000, 25000, 'per session', 'Nairobi'),
        ]
        for vendor, title, cat, prop, pfrom, pto, unit, city in services:
            if Service.objects.filter(title=title).exists():
                continue
            s = Service.objects.create(vendor=vendor, title=title, category=cat, prop_type=prop,
                                       description=f'{title}. Book at least 3 days ahead.', price_from=pfrom,
                                       price_to=pto, price_unit=unit, city=city,
                                       booking_deposit=2000 if cat == 'tattoo' else None)
            for i in range(2):
                ServiceImage.objects.create(service=s, image=demo_image(f'{title} {i + 1}', color='#ec4899'), order=i)

        for title, company, cat in [('Music Video Editor', 'Sauti Collective', 'videography'),
                                    ('Resident DJ - Weekends', 'Nairobi Live Promotions', 'club_dj'),
                                    ('Event Photographer', 'Nairobi Live Promotions', 'photography')]:
            Job.objects.get_or_create(
                title=title, company=company,
                defaults={'description': f'{company} is hiring a {title.lower()}.', 'category': cat,
                          'location': 'Nairobi', 'salary_range': 'KSh 40,000 - 70,000', 'posted_by': live.user,
                          'vendor': live, 'is_active': True, 'fee_status': 'paid', 'fee_amount': 500,
                          'deadline': (now + timedelta(days=21)).date()},
            )

        if not Podcast.objects.filter(vendor=pod).exists():
            show = Podcast.objects.create(vendor=pod, title='Mic Cheque', category='music',
                                          description='Weekly conversations with the people behind Kenyan music.',
                                          cover_image=demo_image('Mic Cheque', size=(800, 800), color='#6366f1'))
            for i in range(1, 4):
                PodcastEpisode.objects.create(podcast=show, title=f'Episode {i}: Studio stories', duration='42:10',
                                              external_url='https://open.spotify.com/episode/4rOoJ6Egrf8K2IrywzwOMk',
                                              published_at=now - timedelta(days=7 * i))

        today = timezone.localdate()
        if not Ad.objects.filter(vendor=sauti).exists():
            Ad.objects.create(vendor=sauti, ad_type='homepage_spotlight', target_page='home', title='New drop: Tour Tees',
                              tagline='Limited run - grab yours before the tour', image=demo_image('Tour Tees drop'),
                              link='/vendors/' + sauti.slug, budget_ksh=1000, start_date=today,
                              end_date=today + timedelta(days=14), is_active=True, payment_status='paid')
            Ad.objects.create(vendor=kits, ad_type='banner', target_page='store', title='Harambee Stars 2026 kits',
                              tagline='All sizes in stock', image=demo_image('Harambee kits', color='#10b981'),
                              link='/vendors/' + kits.slug, budget_ksh=500, start_date=today,
                              end_date=today + timedelta(days=14), is_active=True, payment_status='paid')

        self.stdout.write(self.style.SUCCESS(
            'Demo data ready. Log in as demo-buyer@merchke.test or demo-sauti@merchke.test '
            '(password: see DEMO_PASSWORD in core/management/commands/seed_demo.py).'
        ))
