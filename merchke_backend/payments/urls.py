from django.urls import path
from .views import MpesaCallbackView, PayOrderView, TransactionRetryView, TransactionStatusView

urlpatterns = [
    path('mpesa/callback/', MpesaCallbackView.as_view(), name='mpesa-callback'),
    path('transactions/<int:pk>/', TransactionStatusView.as_view(), name='mpesa-transaction-status'),
    path('transactions/<int:pk>/retry/', TransactionRetryView.as_view(), name='mpesa-transaction-retry'),
    path('orders/<int:order_id>/pay/', PayOrderView.as_view(), name='order-pay'),
]
