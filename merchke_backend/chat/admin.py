from django.contrib import admin

from .models import ChatMessage, ChatSession


class ChatMessageInline(admin.TabularInline):
    model = ChatMessage
    extra = 0
    readonly_fields = ('role', 'content', 'is_fallback', 'created_at')
    can_delete = False


@admin.register(ChatSession)
class ChatSessionAdmin(admin.ModelAdmin):
    list_display = ('session_id', 'user', 'ip_address', 'created_at', 'last_message_at')
    search_fields = ('session_id', 'user__username', 'messages__content')
    inlines = [ChatMessageInline]
