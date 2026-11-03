"""Inspection and immutable PredictionResult models."""
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from apps.batch_processing.models import InspectionBatch
from apps.products.models import Product


class InspectionStatus(models.TextChoices):
    QUEUED = "QUEUED", "Queued"
    PROCESSING = "PROCESSING", "Processing"
    COMPLETED = "COMPLETED", "Completed"
    FAILED = "FAILED", "Failed"


class ValidationStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    PASSED = "PASSED", "Passed"
    FAILED = "FAILED", "Failed"


class PredictedClass(models.TextChoices):
    NORMAL = "Normal", "Normal"
    DEFECTIVE = "Defective", "Defective"


class Inspection(models.Model):
    batch = models.ForeignKey(
        InspectionBatch,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="items",
    )
    product = models.ForeignKey(
        Product,
        on_delete=models.PROTECT,
        related_name="inspections",
    )
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="inspections",
    )
    image = models.FileField(upload_to="inspections/%Y/%m/%d/", max_length=500)
    image_sha256 = models.CharField(max_length=64, blank=True, db_index=True)
    original_filename = models.CharField(max_length=255)
    file_size = models.PositiveIntegerField(default=0)
    image_format = models.CharField(max_length=32, blank=True)
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=InspectionStatus.choices,
        default=InspectionStatus.QUEUED,
        db_index=True,
    )
    validation_status = models.CharField(
        max_length=20,
        choices=ValidationStatus.choices,
        default=ValidationStatus.PENDING,
        db_index=True,
    )
    failure_reason = models.TextField(blank=True)

    # Atomic task claiming & fencing fields for Celery worker safety
    processing_token = models.CharField(max_length=64, blank=True, default="")
    attempt_count = models.PositiveIntegerField(default=0)
    lease_expires_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [
            models.Index(fields=["submitted_by", "-created_at"]),
            models.Index(fields=["status", "validation_status"]),
            models.Index(fields=["batch", "status"]),
        ]

    def __str__(self) -> str:
        return f"Inspection #{self.id} ({self.original_filename}) — {self.status}"


class PredictionResult(models.Model):
    """Immutable original AI prediction record."""

    inspection = models.OneToOneField(
        Inspection,
        on_delete=models.CASCADE,
        related_name="prediction",
    )
    predicted_class = models.CharField(
        max_length=20,
        choices=PredictedClass.choices,
        db_index=True,
    )
    confidence = models.FloatField()
    defect_probability = models.FloatField(db_index=True)
    model_version = models.CharField(max_length=64, default="BIT-PLATE-CV-1.0")
    decision_threshold = models.FloatField(default=0.5)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                check=models.Q(confidence__gte=0.0) & models.Q(confidence__lte=1.0),
                name="prediction_confidence_0_to_1",
            ),
            models.CheckConstraint(
                check=models.Q(defect_probability__gte=0.0)
                & models.Q(defect_probability__lte=1.0),
                name="prediction_defect_prob_0_to_1",
            ),
        ]

    def save(self, *args, **kwargs):
        if self.pk is not None and not self._state.adding:
            raise ValidationError(
                "PredictionResult is immutable after creation. Human reviews must be stored in SupervisorReview."
            )
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ValidationError("PredictionResult records are immutable and cannot be deleted.")

    def __str__(self) -> str:
        return (
            f"Prediction for Inspection #{self.inspection_id}: "
            f"{self.predicted_class} ({self.confidence * 100:.1f}%)"
        )
