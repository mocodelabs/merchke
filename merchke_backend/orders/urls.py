from django.urls import path
from .views import OrderListCreateView, OrderDetailView, vendor_order_stats, confirm_receipt, open_dispute, my_disputes

urlpatterns = [
    path('', OrderListCreateView.as_view(), name='order-list-create'),
    path('<int:pk>/', OrderDetailView.as_view(), name='order-detail'),
    path('<int:pk>/confirm/', confirm_receipt, name='order-confirm-receipt'),
    path('<int:pk>/dispute/', open_dispute, name='order-dispute'),
    path('disputes/', my_disputes, name='my-disputes'),
    path('vendor/stats/', vendor_order_stats, name='vendor-order-stats'),
]
