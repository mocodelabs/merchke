from datetime import timedelta

import django_filters
from django.db.models import F
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status as drf_status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.permissions import IsVendor
from payments.mpesa import MpesaError
from payments.serializers import MpesaTransactionSerializer
from .models import Event, EventAd, Ticket, TicketType
from .serializers import (
    EventAdSerializer, EventCreateSerializer, EventSerializer, TicketSerializer,
    TicketTypeCreateSerializer, TicketTypeSerializer,
)
from .services import TicketError, start_boost, start_ticket_purchase


class EventFilter(django_filters.FilterSet):
    category = django_filters.CharFilter(field_name='category')
    city = django_filters.CharFilter(field_name='town', lookup_expr='iexact')
    town = django_filters.CharFilter(field_name='town', lookup_expr='iexact')
    genre = django_filters.CharFilter(field_name='genre', lookup_expr='icontains')
    featured = django_filters.BooleanFilter(field_name='is_featured')
    date_from = django_filters.DateFilter(field_name='start_datetime', lookup_expr='date__gte')
    date_to = django_filters.DateFilter(field_name='start_datetime', lookup_expr='date__lte')

    class Meta:
        model = Event
        fields = ['category', 'city', 'town', 'genre', 'featured', 'date_from', 'date_to']


# ── Public / Create ────────────────────────────────────────────────────────────

class EventListCreateView(generics.ListCreateAPIView):
    """
    GET: upcoming published events (?category=tournament&city=Nairobi&date_from=...&search=).
    Pass ?include_past=1 to include finished events.
    POST: vendor creates an event (multipart).
    """
    filterset_class = EventFilter
    search_fields = ['title', 'venue_name', 'town', 'genre', 'description', 'vendor__brand_name']
    ordering_fields = ['start_datetime', 'created_at']
    ordering = ['start_datetime']
    parser_classes = [MultiPartParser, FormParser]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsVendor()]
        return [AllowAny()]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return EventCreateSerializer
        return EventSerializer

    def get_queryset(self):
        qs = Event.objects.filter(status__in=['published', 'sold_out']) \
            .select_related('vendor').prefetch_related('ticket_types')
        if not self.request.query_params.get('include_past'):
            qs = qs.filter(start_datetime__gte=timezone.now() - timedelta(hours=12))
        return qs

    def perform_create(self, serializer):
        serializer.save(vendor=self.request.user.vendor_profile)


class EventDetailView(generics.RetrieveAPIView):
    """Look up a public event by slug (or numeric id, for old links)."""
    serializer_class = EventSerializer
    permission_classes = [AllowAny]

    def get_object(self):
        key = self.kwargs['slug']
        qs = Event.objects.filter(status__in=['published', 'sold_out', 'completed']) \
            .select_related('vendor').prefetch_related('ticket_types')
        event = qs.filter(slug=key).first()
        if event is None and key.isdigit():
            event = qs.filter(pk=int(key)).first()
        if event is None:
            raise Http404
        return event


# ── Vendor own-event management ────────────────────────────────────────────────

class EventOwnerListView(generics.ListAPIView):
    """All events belonging to the authenticated vendor (all statuses)."""
    permission_classes = [IsAuthenticated, IsVendor]
    serializer_class = EventSerializer
    filter_backends = []

    def get_queryset(self):
        return Event.objects.filter(
            vendor=self.request.user.vendor_profile
        ).select_related('vendor').prefetch_related('ticket_types').order_by('-created_at')


class EventOwnerDetailView(generics.RetrieveUpdateAPIView):
    """GET + PATCH a vendor's own event."""
    permission_classes = [IsAuthenticated, IsVendor]
    parser_classes = [MultiPartParser, FormParser]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return EventCreateSerializer
        return EventSerializer

    def get_queryset(self):
        return Event.objects.filter(
            vendor=self.request.user.vendor_profile
        ).prefetch_related('ticket_types')


class TicketTypeListCreateView(generics.ListCreateAPIView):
    """Add / list ticket types for an event owned by the authenticated vendor."""
    permission_classes = [IsAuthenticated, IsVendor]
    filter_backends = []

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TicketTypeCreateSerializer
        return TicketTypeSerializer

    def get_queryset(self):
        return TicketType.objects.filter(
            event__id=self.kwargs['event_id'],
            event__vendor=self.request.user.vendor_profile,
        )

    def perform_create(self, serializer):
        event = get_object_or_404(
            Event, id=self.kwargs['event_id'], vendor=self.request.user.vendor_profile,
        )
        serializer.save(event=event)


class TicketTypeDetailView(generics.DestroyAPIView):
    """Delete a ticket type (only if none have been sold)."""
    permission_classes = [IsAuthenticated, IsVendor]

    def get_object(self):
        return get_object_or_404(
            TicketType,
            id=self.kwargs['ticket_id'],
            event__id=self.kwargs['event_id'],
            event__vendor=self.request.user.vendor_profile,
        )

    def destroy(self, request, *args, **kwargs):
        if self.get_object().tickets_sold > 0:
            return Response({'detail': 'Tickets of this type have been sold; it cannot be deleted.'},
                            status=drf_status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)


# ── Ticket purchase & tickets ──────────────────────────────────────────────────

class PurchaseTicketsView(APIView):
    """POST {ticket_type_id, quantity, phone} -> pending order + STK push."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        event = get_object_or_404(Event, pk=pk, status='published')
        ticket_type = get_object_or_404(TicketType, pk=request.data.get('ticket_type_id'), event=event)
        try:
            quantity = int(request.data.get('quantity', 1))
            order, txn = start_ticket_purchase(
                user=request.user, event=event, ticket_type=ticket_type,
                quantity=quantity, phone=request.data.get('phone', ''),
            )
        except (TicketError, MpesaError) as exc:
            return Response({'detail': str(exc)}, status=drf_status.HTTP_400_BAD_REQUEST)
        except (TypeError, ValueError):
            return Response({'detail': 'Invalid quantity.'}, status=drf_status.HTTP_400_BAD_REQUEST)
        return Response({
            'order_id': order.pk,
            'order_number': order.order_number,
            'total': str(order.total_amount),
            'transaction': MpesaTransactionSerializer(txn).data,
        }, status=drf_status.HTTP_201_CREATED)


class MyTicketsView(generics.ListAPIView):
    """The buyer's tickets, optionally for one event (?event=<slug>)."""
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = []

    def get_queryset(self):
        qs = Ticket.objects.filter(buyer=self.request.user) \
            .select_related('ticket_type__event', 'order', 'buyer').order_by('-issued_at')
        event = self.request.query_params.get('event')
        if event:
            qs = qs.filter(ticket_type__event__slug=event)
        return qs


def _ticket_for_organizer(request, token):
    ticket = get_object_or_404(
        Ticket.objects.select_related('ticket_type__event__vendor', 'order', 'buyer'), qr_token=token,
    )
    vendor = getattr(request.user, 'vendor_profile', None)
    if not (request.user.is_staff or ticket.ticket_type.event.vendor == vendor):
        return None
    return ticket


class TicketVerifyView(APIView):
    """Gate scanning: organizer (or staff) checks a QR token. GET = look up, POST = check in."""
    permission_classes = [IsAuthenticated]

    def get(self, request, token):
        ticket = _ticket_for_organizer(request, token)
        if ticket is None:
            return Response({'valid': False, 'detail': 'This ticket is not for one of your events.'},
                            status=drf_status.HTTP_403_FORBIDDEN)
        refunded = ticket.order is not None and ticket.order.status == 'refunded'
        return Response({
            'valid': not ticket.is_used and not refunded,
            'detail': 'Already used' if ticket.is_used else 'Refunded' if refunded else 'Valid ticket',
            'ticket': TicketSerializer(ticket).data,
        })

    def post(self, request, token):
        ticket = _ticket_for_organizer(request, token)
        if ticket is None:
            return Response({'detail': 'This ticket is not for one of your events.'},
                            status=drf_status.HTTP_403_FORBIDDEN)
        updated = Ticket.objects.filter(pk=ticket.pk, is_used=False).update(is_used=True, used_at=timezone.now())
        ticket.refresh_from_db()
        if not updated:
            return Response({'valid': False, 'detail': f'Already checked in at {ticket.used_at:%H:%M}.',
                             'ticket': TicketSerializer(ticket).data}, status=drf_status.HTTP_409_CONFLICT)
        return Response({'valid': True, 'detail': 'Checked in', 'ticket': TicketSerializer(ticket).data})


# ── Boosts ─────────────────────────────────────────────────────────────────────

class EventBoostView(APIView):
    """Organizer pays to feature their event: {budget_ksh, days, ad_copy, ad_image?, phone}."""
    permission_classes = [IsAuthenticated, IsVendor]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, pk):
        event = get_object_or_404(Event, pk=pk, vendor=request.user.vendor_profile)
        try:
            ad, txn = start_boost(
                user=request.user, event=event,
                budget_ksh=int(request.data.get('budget_ksh', 0)),
                days=int(request.data.get('days', 7)),
                ad_copy=request.data.get('ad_copy', '')[:200],
                ad_image=request.data.get('ad_image') or None,
                phone=request.data.get('phone', ''),
            )
        except (TicketError, MpesaError) as exc:
            return Response({'detail': str(exc)}, status=drf_status.HTTP_400_BAD_REQUEST)
        except (TypeError, ValueError):
            return Response({'detail': 'Budget and days must be numbers.'}, status=drf_status.HTTP_400_BAD_REQUEST)
        return Response({
            'boost': EventAdSerializer(ad).data,
            'transaction': MpesaTransactionSerializer(txn).data,
        }, status=drf_status.HTTP_201_CREATED)


class FeaturedEventAdsView(generics.ListAPIView):
    """Active paid event boosts, for the homepage carousel. Counts an impression each."""
    serializer_class = EventAdSerializer
    permission_classes = [AllowAny]
    filter_backends = []

    def list(self, request, *args, **kwargs):
        now = timezone.now()
        ads = list(EventAd.objects.filter(is_active=True, ends_at__gt=now).select_related('event')[:10])
        EventAd.objects.filter(pk__in=[a.pk for a in ads]).update(impressions=F('impressions') + 1)
        return Response(self.get_serializer(ads, many=True).data)
