"""ModelMetadata entity storing verified model hashes, threshold, and status."""
from django.db import models


class ModelMetadata(models.Model):
    model_version = models.CharField(max_length=64, db_index=True)
    model_file_hash = models.CharField(max_length=64)
    inference_file_hash = models.CharField(max_length=64)
    metadata_file_hash = models.CharField(max_length=64)
    decision_threshold = models.FloatField(default=0.5)
    model_status = models.CharField(max_length=32, default="VERIFIED")
    evaluation_data = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-id"]

    def __str__(self) -> str:
        return f"{self.model_version} ({self.model_status})"
