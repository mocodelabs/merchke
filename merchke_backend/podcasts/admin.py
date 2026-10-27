from django.contrib import admin

from .models import Podcast, PodcastEpisode


class EpisodeInline(admin.TabularInline):
    model = PodcastEpisode
    extra = 0


@admin.register(Podcast)
class PodcastAdmin(admin.ModelAdmin):
    list_display = ('title', 'vendor', 'category', 'is_active', 'created_at')
    list_filter = ('category', 'is_active')
    search_fields = ('title', 'vendor__brand_name')
    inlines = [EpisodeInline]
