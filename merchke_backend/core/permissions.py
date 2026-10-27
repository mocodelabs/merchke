from rest_framework.permissions import BasePermission


class IsVendor(BasePermission):
    """Authenticated user with a vendor profile."""
    message = 'You need a seller account to do this.'

    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and user.is_authenticated and user.is_vendor
            and hasattr(user, 'vendor_profile')
        )


class IsVendorOrStaff(IsVendor):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_staff) \
            or super().has_permission(request, view)
