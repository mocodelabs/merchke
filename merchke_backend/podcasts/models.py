from django.db import models
from django.utils import timezone
from django.utils.text import slugify

from core.storage import raw_file_storage

PODCAST_CATEGORY_CHOICES = [
    ('music', 'Music & Culture'),
    ('comedy', 'Comedy'),
    ('sports', 'Sports'),
    ('business', 'Business & Hustle'),
    ('lifestyle', 'Lifestyle'),
    ('news', 'News & Politics'),
    ('other', 'Other'),
]


class Podcast(models.Model):
    vendor = models.ForeignKey('vendors.Vendor', on_delete=models.CASCADE, related_name='podcasts')
    title = models.CharField(max_length=150)
    slug = models.SlugField(unique=True, blank=True)
    description = models.TextField()
    cover_image = models.ImageField(upload_to='podcasts/covers/')
    category = models.CharField(max_length=20, choices=PODCAST_CATEGORY_CHOICES, default='music')
    spotify_url = models.URLField(blank=True)
    apple_url = models.URLField(blank=True)
    youtube_url = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title) or 'podcast'
            slug, n = base, 1
            while Podcast.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f'{base}-{n}'
                n += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title


class PodcastEpisode(models.Model):
    podcast = models.ForeignKey(Podcast, on_delete=models.CASCADE, related_name='episodes')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    audio_file = models.FileField(upload_to='podcasts/audio/', storage=raw_file_storage, blank=True, null=True)
    external_url = models.URLField(blank=True, help_text='Spotify / YouTube / Apple link if not uploading an MP3')
    duration = models.CharField(max_length=10, blank=True, help_text='e.g. 45:30')
    published_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['-published_at']

    def __str__(self):
        return f'{self.podcast.title}: {self.title}'
