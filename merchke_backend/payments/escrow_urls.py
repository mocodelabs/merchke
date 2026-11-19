from django.urls import path
from .views import EscrowDetailView, EscrowDisputeView, EscrowReleaseView

urlpatterns = [
    path('<int:order_id>/', EscrowDetailView.as_view(), name='escrow-detail'),
    path('<int:order_id>/release/', EscrowReleaseView.as_view(), name='escrow-release'),
    path('<int:order_id>/dispute/', EscrowDisputeView.as_view(), name='escrow-dispute'),
]
