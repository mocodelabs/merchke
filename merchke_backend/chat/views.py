import re

from django.conf import settings
from django.utils import timezone
from rest_framework import status as drf_status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .assistant import generate_reply
from .models import ChatMessage, ChatSession

SESSION_ID_RE = re.compile(r'^[A-Za-z0-9_-]{8,64}$')
MAX_MESSAGE_CHARS = 1000
IP_DAILY_LIMIT = 100  # stops one device minting endless session ids


def _client_ip(request):
    forwarded = request.META.get('HTTP_X_FORWARDED_FOR', '')
    return (forwarded.split(',')[0].strip() or request.META.get('REMOTE_ADDR')) or None


class ChatView(APIView):
    """POST {message, session_id} -> {reply, remaining_today}. 20 messages per session per day."""
    permission_classes = [AllowAny]

    def post(self, request):
        message = str(request.data.get('message', '')).strip()
        session_id = str(request.data.get('session_id', ''))
        if not message:
            return Response({'detail': 'Type a message first.'}, status=drf_status.HTTP_400_BAD_REQUEST)
        if len(message) > MAX_MESSAGE_CHARS:
            return Response({'detail': f'Please keep messages under {MAX_MESSAGE_CHARS} characters.'},
                            status=drf_status.HTTP_400_BAD_REQUEST)
        if not SESSION_ID_RE.match(session_id):
            return Response({'detail': 'Invalid session.'}, status=drf_status.HTTP_400_BAD_REQUEST)

        ip = _client_ip(request)
        session, created = ChatSession.objects.get_or_create(
            session_id=session_id,
            defaults={'user': request.user if request.user.is_authenticated else None, 'ip_address': ip},
        )
        if not created and session.user_id is None and request.user.is_authenticated:
            session.user = request.user
            session.save(update_fields=['user'])

        today_start = timezone.localtime().replace(hour=0, minute=0, second=0, microsecond=0)
        limit = settings.CHAT_DAILY_MESSAGE_LIMIT
        used = session.messages.filter(role='user', created_at__gte=today_start).count()
        ip_used = ChatMessage.objects.filter(
            role='user', session__ip_address=ip, created_at__gte=today_start,
        ).count() if ip else 0
        if used >= limit or ip_used >= IP_DAILY_LIMIT:
            return Response({
                'detail': "You've reached today's chat limit. For more help, email support@merchke.co.ke.",
                'remaining_today': 0,
            }, status=drf_status.HTTP_429_TOO_MANY_REQUESTS)

        ChatMessage.objects.create(session=session, role='user', content=message)
        history = [
            {'role': m.role, 'content': m.content}
            for m in session.messages.order_by('-created_at')[:20]
        ][::-1]
        reply, is_fallback = generate_reply(history)
        saved = ChatMessage.objects.create(session=session, role='assistant', content=reply, is_fallback=is_fallback)
        session.save(update_fields=['last_message_at'])

        return Response({
            'reply': reply,
            'created_at': saved.created_at,
            'remaining_today': max(0, limit - used - 1),
        })
