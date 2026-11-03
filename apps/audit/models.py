"""Append-only application event history for inspections."""
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from apps.inspections.models import Inspection


class InspectionEvent(models.Model):
    inspection = models.ForeignKey(
        Inspection,
        on_delete=models.CASCADE,
        related_name="events",
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="inspection_events",
    )
    event_type = models.CharField(max_length=64, db_index=True)
    description = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["created_at", "id"]
        indexes = [
            models.Index(fields=["inspection", "created_at"]),
        ]

    def save(self, *args, **kwargs):
        if self.pk is not None and not self._state.adding:
            raise ValidationError("InspectionEvent is append-only and cannot be modified.")
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"Event [{self.event_type}] on Inspection #{self.inspection_id}"
