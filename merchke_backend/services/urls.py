from django.urls import path

from . import views

urlpatterns = [
    path('', views.ServiceListCreateView.as_view(), name='service-list'),
    path('mine/', views.MyServicesView.as_view(), name='service-mine'),
    path('bookings/', views.VendorBookingsView.as_view(), name='service-bookings'),
    path('bookings/<int:pk>/', views.VendorBookingUpdateView.as_view(), name='service-booking-update'),
    path('<int:pk>/', views.ServiceDetailView.as_view(), name='service-detail'),
    path('<int:pk>/manage/', views.ServiceManageView.as_view(), name='service-manage'),
    path('<int:pk>/book/', views.ServiceBookView.as_view(), name='service-book'),
]
