from django.urls import path
from . import views

urlpatterns = [
    path('', views.EventListCreateView.as_view(), name='event-list'),
    path('mine/', views.EventOwnerListView.as_view(), name='event-mine'),
    path('featured-ads/', views.FeaturedEventAdsView.as_view(), name='event-featured-ads'),
    path('<int:pk>/manage/', views.EventOwnerDetailView.as_view(), name='event-manage'),
    path('<int:pk>/purchase-tickets/', views.PurchaseTicketsView.as_view(), name='event-purchase-tickets'),
    path('<int:pk>/boost/', views.EventBoostView.as_view(), name='event-boost'),
    path('<int:event_id>/tickets/', views.TicketTypeListCreateView.as_view(), name='ticket-type-list'),
    path('<int:event_id>/tickets/<int:ticket_id>/', views.TicketTypeDetailView.as_view(), name='ticket-type-detail'),
    path('<slug:slug>/', views.EventDetailView.as_view(), name='event-detail'),
]
