from django.urls import path
from . import views

urlpatterns = [
    path('', views.EventListCreateView.as_view(), name='event-list'),
    path('mine/', views.EventOwnerListView.as_view(), name='event-mine'),
    path('<int:pk>/', views.EventDetailView.as_view(), name='event-detail'),
    path('<int:pk>/manage/', views.EventOwnerDetailView.as_view(), name='event-manage'),
    path('<int:pk>/purchase/', views.EventTicketPurchaseView.as_view(), name='event-purchase'),
    path('<int:event_id>/tickets/', views.TicketTypeListCreateView.as_view(), name='ticket-type-list'),
    path('<int:event_id>/tickets/<int:ticket_id>/', views.TicketTypeDetailView.as_view(), name='ticket-type-detail'),
]
