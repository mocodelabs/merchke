from django.urls import path
from .views import CustomerProfileView, LoginView, RegisterView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('customer/profile/', CustomerProfileView.as_view(), name='customer-profile'),
]
