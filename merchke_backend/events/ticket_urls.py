from django.urls import path
from . import views

urlpatterns = [
    path('mine/', views.MyTicketsView.as_view(), name='my-tickets'),
    path('<uuid:token>/verify/', views.TicketVerifyView.as_view(), name='ticket-verify'),
]
