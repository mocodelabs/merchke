from django.urls import path
from .views import (
    CheckoutView, OrderDetailView, OrderListView, VendorOrderListView,
    my_disputes, ship_order, vendor_order_stats,
)

urlpatterns = [
    path('', OrderListView.as_view(), name='order-list'),
    path('checkout/', CheckoutView.as_view(), name='order-checkout'),
    path('disputes/', my_disputes, name='my-disputes'),
    path('vendor/', VendorOrderListView.as_view(), name='vendor-orders'),
    path('vendor/stats/', vendor_order_stats, name='vendor-order-stats'),
    path('<int:pk>/', OrderDetailView.as_view(), name='order-detail'),
    path('<int:pk>/ship/', ship_order, name='order-ship'),
]
