"""Product model for supported manufacturing items (P-PLATE01)."""
from django.conf import settings
from django.db import models


class Product(models.Model):
    product_id = models.CharField(
        max_length=64,
        unique=True,
        db_index=True,
        help_text="Official product code, e.g. P-PLATE01",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    active = models.BooleanField(default=True, db_index=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_products",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["product_id"]
        indexes = [
            models.Index(fields=["product_id", "active"]),
        ]

    def save(self, *args, **kwargs):
        if self.product_id:
            self.product_id = self.product_id.strip().upper()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.product_id} — {self.name}"
