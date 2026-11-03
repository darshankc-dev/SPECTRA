"""Django REST Framework serializers for SPECTRΛ."""
from django.contrib.auth.models import User
from rest_framework import serializers

from apps.accounts.roles import get_user_role
from apps.audit.models import InspectionEvent
from apps.batch_processing.models import InspectionBatch
from apps.inspections.models import Inspection, PredictionResult
from apps.products.models import Product
from apps.reviews.models import ReviewRevision, ReviewStatus, SupervisorReview


class UserSummarySerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name", "full_name", "role", "date_joined")

    def get_role(self, obj) -> str:
        return get_user_role(obj)

    def get_full_name(self, obj) -> str:
        full = f"{obj.first_name} {obj.last_name}".strip()
        return full or obj.username


class ProductSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source="created_by.username", read_only=True, default="")

    class Meta:
        model = Product
        fields = (
            "id",
            "product_id",
            "name",
            "description",
            "active",
            "created_by",
            "created_by_username",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_by", "created_by_username", "created_at", "updated_at")

    def validate_product_id(self, value: str) -> str:
        cleaned = (value or "").strip().upper()
        if not cleaned:
            raise serializers.ValidationError("Product code cannot be empty.")
        qs = Product.objects.filter(product_id__iexact=cleaned)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError(f"Product with code '{cleaned}' already exists.")
        return cleaned


class PredictionResultSerializer(serializers.ModelSerializer):
    confidence_percent = serializers.SerializerMethodField()
    defect_probability_percent = serializers.SerializerMethodField()
    threshold_distance = serializers.SerializerMethodField()

    class Meta:
        model = PredictionResult
        fields = (
            "id",
            "predicted_class",
            "confidence",
            "confidence_percent",
            "defect_probability",
            "defect_probability_percent",
            "threshold_distance",
            "model_version",
            "decision_threshold",
            "created_at",
        )

    def get_confidence_percent(self, obj) -> float:
        return round(float(obj.confidence) * 100.0, 2)

    def get_defect_probability_percent(self, obj) -> float:
        return round(float(obj.defect_probability) * 100.0, 2)

    def get_threshold_distance(self, obj) -> float:
        return round(abs(float(obj.defect_probability) - float(obj.decision_threshold)), 4)


class ReviewRevisionSerializer(serializers.ModelSerializer):
    reviewer_username = serializers.CharField(source="reviewer.username", read_only=True)

    class Meta:
        model = ReviewRevision
        fields = (
            "id",
            "reviewer",
            "reviewer_username",
            "previous_class",
            "new_class",
            "comment",
            "created_at",
        )


class SupervisorReviewSerializer(serializers.ModelSerializer):
    reviewer_username = serializers.CharField(source="reviewer.username", read_only=True)
    revisions = ReviewRevisionSerializer(many=True, read_only=True)

    class Meta:
        model = SupervisorReview
        fields = (
            "id",
            "inspection",
            "reviewer",
            "reviewer_username",
            "reviewed_class",
            "review_status",
            "comment",
            "created_at",
            "updated_at",
            "revisions",
        )


class InspectionEventSerializer(serializers.ModelSerializer):
    actor_username = serializers.CharField(source="actor.username", read_only=True, default="SYSTEM")

    class Meta:
        model = InspectionEvent
        fields = (
            "id",
            "inspection",
            "actor",
            "actor_username",
            "event_type",
            "description",
            "metadata",
            "created_at",
        )


class InspectionSerializer(serializers.ModelSerializer):
    product_code = serializers.CharField(source="product.product_id", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    submitted_by_username = serializers.CharField(source="submitted_by.username", read_only=True)
    image_url = serializers.SerializerMethodField()
    prediction = PredictionResultSerializer(read_only=True)
    supervisor_review = SupervisorReviewSerializer(read_only=True)
    review_status_display = serializers.SerializerMethodField()
    has_disagreement = serializers.SerializerMethodField()
    threshold_distance = serializers.SerializerMethodField()

    class Meta:
        model = Inspection
        fields = (
            "id",
            "batch",
            "product",
            "product_code",
            "product_name",
            "submitted_by",
            "submitted_by_username",
            "image_url",
            "image_sha256",
            "original_filename",
            "file_size",
            "image_format",
            "width",
            "height",
            "status",
            "validation_status",
            "failure_reason",
            "attempt_count",
            "prediction",
            "supervisor_review",
            "review_status_display",
            "has_disagreement",
            "threshold_distance",
            "created_at",
            "updated_at",
        )

    def get_image_url(self, obj) -> str:
        if not obj.image:
            return ""
        return f"/api/v1/inspections/{obj.id}/image/"

    def get_review_status_display(self, obj) -> str:
        if hasattr(obj, "supervisor_review") and obj.supervisor_review is not None:
            return obj.supervisor_review.review_status
        return ReviewStatus.UNREVIEWED

    def get_has_disagreement(self, obj) -> bool:
        if (
            hasattr(obj, "prediction")
            and obj.prediction is not None
            and hasattr(obj, "supervisor_review")
            and obj.supervisor_review is not None
        ):
            return obj.prediction.predicted_class != obj.supervisor_review.reviewed_class
        return False

    def get_threshold_distance(self, obj) -> float | None:
        if hasattr(obj, "prediction") and obj.prediction is not None:
            return round(
                abs(float(obj.prediction.defect_probability) - float(obj.prediction.decision_threshold)),
                4,
            )
        return None


class InspectionBatchSerializer(serializers.ModelSerializer):
    product_code = serializers.CharField(source="product.product_id", read_only=True)
    product_name = serializers.CharField(source="product.name", read_only=True)
    submitted_by_username = serializers.CharField(source="submitted_by.username", read_only=True)
    items = InspectionSerializer(many=True, read_only=True)
    progress_percent = serializers.SerializerMethodField()

    class Meta:
        model = InspectionBatch
        fields = (
            "id",
            "submitted_by",
            "submitted_by_username",
            "product",
            "product_code",
            "product_name",
            "status",
            "total_items",
            "completed_items",
            "failed_items",
            "progress_percent",
            "created_at",
            "updated_at",
            "items",
        )

    def get_progress_percent(self, obj) -> int:
        if not obj.total_items:
            return 0
        done = obj.completed_items + obj.failed_items
        return min(100, int(round((done / obj.total_items) * 100)))
