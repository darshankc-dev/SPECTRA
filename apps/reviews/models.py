"""SupervisorReview and append-only ReviewRevision models."""
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from apps.inspections.models import Inspection, PredictedClass


class ReviewStatus(models.TextChoices):
    UNREVIEWED = "UNREVIEWED", "Unreviewed"
    CONFIRMED = "CONFIRMED", "Confirmed"
    CORRECTED = "CORRECTED", "Corrected"


class SupervisorReview(models.Model):
    inspection = models.OneToOneField(
        Inspection,
        on_delete=models.CASCADE,
        related_name="supervisor_review",
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="submitted_reviews",
    )
    reviewed_class = models.CharField(
        max_length=20,
        choices=PredictedClass.choices,
        db_index=True,
    )
    review_status = models.CharField(
        max_length=20,
        choices=ReviewStatus.choices,
        db_index=True,
    )
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["review_status", "-updated_at"]),
        ]

    def __str__(self) -> str:
        return f"Review for Inspection #{self.inspection_id}: {self.review_status} ({self.reviewed_class})"


class ReviewRevision(models.Model):
    """Append-only revision log for supervisor reviews."""

    review = models.ForeignKey(
        SupervisorReview,
        on_delete=models.CASCADE,
        related_name="revisions",
    )
    reviewer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="review_revisions",
    )
    previous_class = models.CharField(max_length=20, blank=True)
    new_class = models.CharField(max_length=20, choices=PredictedClass.choices)
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def save(self, *args, **kwargs):
        if self.pk is not None and not self._state.adding:
            raise ValidationError("ReviewRevision is append-only and cannot be modified.")
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"Revision #{self.id} on Review #{self.review_id}: {self.previous_class or 'INITIAL'} -> {self.new_class}"
