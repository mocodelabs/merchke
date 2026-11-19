"""Shared fixtures for API tests."""
import io
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from PIL import Image
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient

from vendors.models import Vendor

User = get_user_model()


def image_file(name='pic.png'):
    buf = io.BytesIO()
    Image.new('RGB', (4, 4), (249, 115, 22)).save(buf, format='PNG')
    return SimpleUploadedFile(name, buf.getvalue(), content_type='image/png')


def make_user(username, *, vendor=False, **vendor_kwargs):
    user = User.objects.create_user(
        username=username, email=f'{username}@example.com', password='Str0ng-pass!',
        is_vendor=vendor, is_customer=not vendor,
    )
    if vendor:
        Vendor.objects.create(
            user=user, brand_name=username.title(), contact_email=user.email,
            mpesa_phone='254712345678', **vendor_kwargs,
        )
    return user


def client_for(user=None):
    client = APIClient()
    if user is not None:
        token, _ = Token.objects.get_or_create(user=user)
        client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
    return client


def make_product(vendor, **kwargs):
    from products.models import Product
    defaults = dict(name='Tour Tee', description='Black tee', price=1500, stock=10,
                    image=image_file(), is_active=True)
    defaults.update(kwargs)
    return Product.objects.create(vendor=vendor, **defaults)


def make_event(vendor, *, days_ahead=10, price=1000, quantity=50, **kwargs):
    from events.models import Event, TicketType
    start = timezone.now() + timedelta(days=days_ahead)
    defaults = dict(title='Nairobi Live', description='Gig', banner_image=image_file(),
                    venue_name='KICC', venue_address='Harambee Ave', start_datetime=start,
                    status='published')
    defaults.update(kwargs)
    event = Event.objects.create(vendor=vendor, **defaults)
    tt = TicketType.objects.create(event=event, name='Regular', price=price, total_quantity=quantity)
    return event, tt
