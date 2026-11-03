"""InspectionBatch model for asynchronous Celery + Redis batch processing."""
from django.conf import settings
from django.db import models
from apps.products.models import Product


class BatchStatus(models.TextChoices):
    QUEUED = "QUEUED", "Queued"
    PROCESSING = "PROCESSING", "Processing"
    PARTIAL = "PARTIAL", "Partial"
    COMPLETED = "COMPLETED", "Completed"
    FAILED = "FAILED", "Failed"


class InspectionBatch(models.Model):
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="inspection_batches",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="inspection_batches",
    )
    status = models.CharField(
        max_length=20,
        choices=BatchStatus.choices,
        default=BatchStatus.QUEUED,
        db_index=True,
    )
    total_items = models.PositiveIntegerField(default=0)
    completed_items = models.PositiveIntegerField(default=0)
    failed_items = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["submitted_by", "-created_at"]),
            models.Index(fields=["status", "-created_at"]),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(total_items__gte=1) & models.Q(total_items__lte=10),
                name="batch_total_items_between_1_and_10",
            ),
        ]

    def __str__(self) -> str:
        return f"Batch #{self.id} ({self.status}) — {self.completed_items}/{self.total_items} completed"
