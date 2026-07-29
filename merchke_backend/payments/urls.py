from django.urls import path
from .views import MpesaSTKPushView, MpesaCallbackView, MpesaSTKQueryView

urlpatterns = [
    path('mpesa/stk-push/', MpesaSTKPushView.as_view(), name='mpesa-stk-push'),
    path('mpesa/callback/', MpesaCallbackView.as_view(), name='mpesa-callback'),
    path('mpesa/query/', MpesaSTKQueryView.as_view(), name='mpesa-stk-query'),
]
