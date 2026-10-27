from django.contrib import admin

from .models import Category, ListingFee, Product, ProductImage, ProductVariant, Report


class ProductVariantInline(admin.TabularInline):
    model = ProductVariant
    extra = 0


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 0


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'vendor', 'product_type', 'price', 'stock', 'is_active', 'is_featured', 'created_at')
    list_filter = ('product_type', 'is_active', 'is_featured', 'vendor__vendor_type')
    list_editable = ('is_featured',)
    search_fields = ('name', 'vendor__brand_name')
    inlines = [ProductVariantInline, ProductImageInline]


@admin.register(ListingFee)
class ListingFeeAdmin(admin.ModelAdmin):
    list_display = ('product', 'vendor', 'amount', 'phone', 'status', 'requested_at', 'paid_at')
    list_filter = ('status',)
    search_fields = ('product__name', 'vendor__brand_name', 'phone')


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'slug', 'product_type', 'parent', 'order', 'is_active')
    prepopulated_fields = {'slug': ('name',)}


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('product', 'reason', 'reporter', 'is_reviewed', 'created_at')
    list_filter = ('reason', 'is_reviewed')
    list_editable = ('is_reviewed',)
