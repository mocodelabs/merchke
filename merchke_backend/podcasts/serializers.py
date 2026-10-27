from rest_framework import serializers

from .models import Podcast, PodcastEpisode

MAX_AUDIO_MB = 100


class PodcastEpisodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = PodcastEpisode
        fields = ['id', 'podcast', 'title', 'description', 'audio_file', 'external_url', 'duration', 'published_at']
        read_only_fields = ['id', 'podcast']

    def validate_audio_file(self, f):
        if f is None:
            return f
        if f.size > MAX_AUDIO_MB * 1024 * 1024:
            raise serializers.ValidationError(f'Audio must be under {MAX_AUDIO_MB} MB.')
        if not f.name.lower().endswith(('.mp3', '.m4a', '.aac', '.wav', '.ogg')):
            raise serializers.ValidationError('Upload an MP3, M4A, AAC, WAV or OGG file.')
        return f

    def validate(self, attrs):
        has_audio = attrs.get('audio_file') or getattr(self.instance, 'audio_file', None)
        has_link = attrs.get('external_url') or getattr(self.instance, 'external_url', '')
        if not has_audio and not has_link:
            raise serializers.ValidationError({'audio_file': 'Upload an audio file or paste a Spotify/YouTube link.'})
        return attrs


class PodcastSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    vendor_name = serializers.CharField(source='vendor.brand_name', read_only=True)
    vendor_slug = serializers.CharField(source='vendor.slug', read_only=True)
    episodes_count = serializers.SerializerMethodField()
    latest_episode_at = serializers.SerializerMethodField()

    def get_episodes_count(self, obj):
        return len(obj.episodes.all())

    def get_latest_episode_at(self, obj):
        episodes = obj.episodes.all()
        return episodes[0].published_at if episodes else None

    class Meta:
        model = Podcast
        fields = [
            'id', 'title', 'slug', 'description', 'cover_image', 'category', 'category_display',
            'spotify_url', 'apple_url', 'youtube_url', 'is_active',
            'vendor_name', 'vendor_slug', 'episodes_count', 'latest_episode_at', 'created_at',
        ]
        read_only_fields = ['id', 'slug', 'created_at']
        # multipart forms would otherwise read a missing checkbox as False
        extra_kwargs = {'is_active': {'default': True}}


class PodcastDetailSerializer(PodcastSerializer):
    episodes = PodcastEpisodeSerializer(many=True, read_only=True)

    class Meta(PodcastSerializer.Meta):
        fields = PodcastSerializer.Meta.fields + ['episodes']
