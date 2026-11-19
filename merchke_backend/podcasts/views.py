from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated

from core.permissions import IsVendor
from .models import Podcast, PodcastEpisode
from .serializers import PodcastDetailSerializer, PodcastEpisodeSerializer, PodcastSerializer


class PodcastListCreateView(generics.ListCreateAPIView):
    """GET: browse podcasts (?category=&search=). POST: vendor creates a show."""
    serializer_class = PodcastSerializer
    filterset_fields = ['category']
    search_fields = ['title', 'description', 'vendor__brand_name']
    ordering = ['-created_at']
    parser_classes = [MultiPartParser, FormParser]

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsVendor()]
        return [AllowAny()]

    def get_queryset(self):
        return Podcast.objects.filter(is_active=True).select_related('vendor').prefetch_related('episodes')

    def perform_create(self, serializer):
        serializer.save(vendor=self.request.user.vendor_profile)


class PodcastDetailView(generics.RetrieveAPIView):
    serializer_class = PodcastDetailSerializer
    permission_classes = [AllowAny]
    lookup_field = 'slug'

    def get_queryset(self):
        return Podcast.objects.filter(is_active=True).select_related('vendor').prefetch_related('episodes')


class MyPodcastsView(generics.ListAPIView):
    serializer_class = PodcastDetailSerializer
    permission_classes = [IsAuthenticated, IsVendor]
    filter_backends = []

    def get_queryset(self):
        return Podcast.objects.filter(vendor=self.request.user.vendor_profile).prefetch_related('episodes')


class PodcastManageView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PodcastDetailSerializer
    permission_classes = [IsAuthenticated, IsVendor]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return Podcast.objects.filter(vendor=self.request.user.vendor_profile)


class EpisodeCreateView(generics.CreateAPIView):
    serializer_class = PodcastEpisodeSerializer
    permission_classes = [IsAuthenticated, IsVendor]
    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        podcast = get_object_or_404(Podcast, pk=self.kwargs['pk'], vendor=self.request.user.vendor_profile)
        serializer.save(podcast=podcast)


class EpisodeManageView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PodcastEpisodeSerializer
    permission_classes = [IsAuthenticated, IsVendor]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return PodcastEpisode.objects.filter(
            podcast_id=self.kwargs['pk'], podcast__vendor=self.request.user.vendor_profile,
        )

    def get_object(self):
        return get_object_or_404(self.get_queryset(), pk=self.kwargs['episode_id'])
