"""Django admin registration for Product."""
from django.contrib import admin
from .models import Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("product_id", "name", "active", "created_by", "created_at", "updated_at")
    list_filter = ("active",)
    search_fields = ("product_id", "name", "description")
    readonly_fields = ("created_at", "updated_at")
