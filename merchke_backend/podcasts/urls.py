from django.urls import path

from . import views

urlpatterns = [
    path('', views.PodcastListCreateView.as_view(), name='podcast-list'),
    path('mine/', views.MyPodcastsView.as_view(), name='podcast-mine'),
    path('<int:pk>/manage/', views.PodcastManageView.as_view(), name='podcast-manage'),
    path('<int:pk>/episodes/', views.EpisodeCreateView.as_view(), name='podcast-episode-create'),
    path('<int:pk>/episodes/<int:episode_id>/', views.EpisodeManageView.as_view(), name='podcast-episode-manage'),
    path('<slug:slug>/', views.PodcastDetailView.as_view(), name='podcast-detail'),
]
