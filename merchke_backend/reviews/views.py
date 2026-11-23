from rest_framework import generics, permissions
from .models import ProductReview, VendorReview
from .serializers import ProductReviewSerializer, VendorReviewSerializer


class ProductReviewListCreateView(generics.ListCreateAPIView):
    filter_backends = []
    serializer_class = ProductReviewSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        return ProductReview.objects.filter(product_id=self.kwargs['product_id'])

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, product_id=self.kwargs['product_id'])


class VendorReviewListCreateView(generics.ListCreateAPIView):
    filter_backends = []
    serializer_class = VendorReviewSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        return VendorReview.objects.filter(vendor_id=self.kwargs['vendor_id'])

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, vendor_id=self.kwargs['vendor_id'])
