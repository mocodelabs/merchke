from django.urls import path

from . import views

urlpatterns = [
    path('create/', views.AdCreateView.as_view(), name='ad-create'),
    path('serve/', views.AdServeView.as_view(), name='ad-serve'),
    path('mine/', views.MyAdsView.as_view(), name='ad-mine'),
    path('<int:pk>/click/', views.AdClickView.as_view(), name='ad-click'),
]
