from django.urls import path
from .views import (
    CategoryListView, ProductListView, ProductDetailView,
    ProductOwnerView, ProductVariantCreateView, ProductVariantDetailView,
    VendorProductListView, WishlistView, WishlistRemoveView,
    DigitalProductDownloadView, ReportProductView,
    ListingFeeStatusView, ListingFeeRetryView, VendorOwnProductListView,
)

urlpatterns = [
    path('', ProductListView.as_view(), name='product-list'),
    path('categories/', CategoryListView.as_view(), name='category-list'),
    path('mine/', VendorOwnProductListView.as_view(), name='product-mine'),
    path('wishlist/', WishlistView.as_view(), name='wishlist'),
    path('wishlist/<int:product_id>/', WishlistRemoveView.as_view(), name='wishlist-remove'),
    path('vendor/<slug:vendor_slug>/', VendorProductListView.as_view(), name='vendor-products'),
    path('<int:pk>/', ProductDetailView.as_view(), name='product-detail'),
    path('<int:pk>/manage/', ProductOwnerView.as_view(), name='product-manage'),
    path('<int:pk>/listing-fee-status/', ListingFeeStatusView.as_view(), name='listing-fee-status'),
    path('<int:pk>/listing-fee/retry/', ListingFeeRetryView.as_view(), name='listing-fee-retry'),
    path('<int:pk>/download/', DigitalProductDownloadView.as_view(), name='product-download'),
    path('<int:pk>/report/', ReportProductView.as_view(), name='product-report'),
    path('<int:product_id>/variants/', ProductVariantCreateView.as_view(), name='product-variants'),
    path('<int:product_id>/variants/<int:variant_id>/', ProductVariantDetailView.as_view(), name='product-variant-detail'),
]
