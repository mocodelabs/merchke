from django.urls import path
from . import views

urlpatterns = [
    path('products/<int:product_id>/', views.ProductReviewListCreateView.as_view(), name='product-reviews'),
    path('vendors/<int:vendor_id>/', views.VendorReviewListCreateView.as_view(), name='vendor-reviews'),
]
