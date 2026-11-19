from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import CustomerProfile, User


@admin.register(User)
class MerchkeUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'is_vendor', 'is_customer', 'is_staff', 'date_joined')
    list_filter = ('is_vendor', 'is_customer', 'is_staff')
    fieldsets = UserAdmin.fieldsets + (('Merchke', {'fields': ('is_vendor', 'is_customer')}),)


admin.site.register(CustomerProfile)
