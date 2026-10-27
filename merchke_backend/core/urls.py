from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path


def health(request):
    return JsonResponse({'status': 'ok'})


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health, name='health'),
    path('api/accounts/', include('accounts.urls')),
    path('api/vendors/', include('vendors.urls')),
    path('api/products/', include('products.urls')),
    path('api/orders/', include('orders.urls')),
    path('api/payments/', include('payments.urls')),
    path('api/escrow/', include('payments.escrow_urls')),
    path('api/events/', include('events.urls')),
    path('api/tickets/', include('events.ticket_urls')),
    path('api/reviews/', include('reviews.urls')),
    path('api/jobs/', include('jobs.urls')),
    path('api/services/', include('services.urls')),
    path('api/podcasts/', include('podcasts.urls')),
    path('api/chat/', include('chat.urls')),
    path('api/ads/', include('ads.urls')),
]

admin.site.site_header = 'Merchke admin'
admin.site.site_title = 'Merchke admin'

if settings.DEBUG or not settings.CLOUDINARY_URL:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
