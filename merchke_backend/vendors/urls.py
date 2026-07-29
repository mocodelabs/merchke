from django.urls import path
from .views import VendorProfileView, VendorDashboardView, VendorListView, VendorDetailBySlugView

urlpatterns = [
    path('', VendorListView.as_view(), name='vendor-list'),
    path('me/', VendorProfileView.as_view(), name='vendor-profile'),
    path('dashboard/', VendorDashboardView.as_view(), name='vendor-dashboard'),
    path('<slug:slug>/', VendorDetailBySlugView.as_view(), name='vendor-detail'),
]
