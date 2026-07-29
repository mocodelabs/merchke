from django.urls import path
from .views import RegisterView, LoginView, VendorProfileView, CustomerProfileView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('vendor/profile/', VendorProfileView.as_view(), name='vendor-profile'),
    path('customer/profile/', CustomerProfileView.as_view(), name='customer-profile'),
]
