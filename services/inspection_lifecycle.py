"""Inspection lifecycle service: single sync inspection, batch orchestration, atomic claiming, and supervisor review."""
import os
import uuid
from datetime import timedelta
from typing import List, Tuple

from django.core.exceptions import PermissionDenied, ValidationError
from django.core.files.base import ContentFile
from django.db import transaction
from django.utils import timezone

from apps.accounts.roles import ROLE_SUPERVISOR, get_user_role
from apps.audit.models import InspectionEvent
from apps.batch_processing.models import BatchStatus, InspectionBatch
from apps.inspections.models import (
    Inspection,
    InspectionStatus,
    PredictedClass,
    PredictionResult,
    ValidationStatus,
)
from apps.products.models import Product
from apps.reviews.models import ReviewRevision, ReviewStatus, SupervisorReview
from .image_validation import validate_uploaded_image_bytes
from .inference_adapter import run_validated_inference

LEASE_DURATION_SECONDS = 120
MAX_BATCH_ITEMS = 10
MIN_BATCH_ITEMS = 1


def _safe_storage_filename(original_filename: str) -> str:
    base = os.path.basename(original_filename or "upload.bin")
    clean = "".join(c for c in base if c.isalnum() or c in (".", "_", "-")).strip()
    if not clean:
        clean = "upload.bin"
    return f"{uuid.uuid4().hex[:10]}_{clean}"


def recalculate_batch_status(batch_id: int) -> InspectionBatch:
    """
    Recalculate and persist InspectionBatch counters and status from PostgreSQL item states.
    Aggregation rules:
    1. All completed -> COMPLETED
    2. All failed -> FAILED
    3. No queued or processing items, with both completed and failed items -> PARTIAL
    4. Otherwise, if any item is processing -> PROCESSING
    5. Otherwise, if any item is queued -> QUEUED
    """
    with transaction.atomic():
        batch = InspectionBatch.objects.select_for_update().get(pk=batch_id)
        items = list(Inspection.objects.filter(batch_id=batch_id).values_list("status", flat=True))
        total = len(items)
        completed = sum(1 for s in items if s == InspectionStatus.COMPLETED)
        failed = sum(1 for s in items if s == InspectionStatus.FAILED)
        processing = sum(1 for s in items if s == InspectionStatus.PROCESSING)
        queued = sum(1 for s in items if s == InspectionStatus.QUEUED)

        if total > 0 and completed == total:
            new_status = BatchStatus.COMPLETED
        elif total > 0 and failed == total:
            new_status = BatchStatus.FAILED
        elif queued == 0 and processing == 0 and completed > 0 and failed > 0:
            new_status = BatchStatus.PARTIAL
        elif processing > 0:
            new_status = BatchStatus.PROCESSING
        else:
            new_status = BatchStatus.QUEUED

        batch.total_items = total if total > 0 else batch.total_items
        batch.completed_items = completed
        batch.failed_items = failed
        batch.status = new_status
        batch.save(
            update_fields=["total_items", "completed_items", "failed_items", "status", "updated_at"]
        )
        return batch


def create_and_process_single_inspection(
    *,
    user,
    product: Product,
    raw_bytes: bytes,
    original_filename: str,
) -> Inspection:
    """
    Validate and synchronously process a single image inspection.
    Invalid uploads are stored as FAILED attempts without being sent to the model.
    """
    val_result = validate_uploaded_image_bytes(raw_bytes, original_filename)
    storage_name = _safe_storage_filename(original_filename)

    with transaction.atomic():
        inspection = Inspection(
            batch=None,
            product=product,
            submitted_by=user,
            original_filename=original_filename or "upload",
            file_size=val_result.file_size,
            image_sha256=val_result.sha256,
            image_format=val_result.image_format,
            width=val_result.width,
            height=val_result.height,
            status=(
                InspectionStatus.PROCESSING
                if val_result.is_valid
                else InspectionStatus.FAILED
            ),
            validation_status=(
                ValidationStatus.PASSED
                if val_result.is_valid
                else ValidationStatus.FAILED
            ),
            failure_reason=val_result.failure_reason,
            attempt_count=1,
        )
        inspection.image.save(storage_name, ContentFile(raw_bytes or b""), save=False)
        inspection.save()

        InspectionEvent.objects.create(
            inspection=inspection,
            actor=user,
            event_type="INSPECTION_CREATED",
            description=f"Single inspection uploaded ({original_filename}, {val_result.file_size} bytes).",
            metadata={
                "original_filename": original_filename,
                "file_size": val_result.file_size,
                "sha256": val_result.sha256,
                "product_id": product.product_id,
            },
        )

        if not val_result.is_valid:
            InspectionEvent.objects.create(
                inspection=inspection,
                actor=user,
                event_type="VALIDATION_FAILED",
                description=f"Upload rejected before inference: {val_result.failure_reason}",
                metadata={"failure_reason": val_result.failure_reason},
            )
            return inspection

        InspectionEvent.objects.create(
            inspection=inspection,
            actor=user,
            event_type="VALIDATION_PASSED",
            description=(
                f"Decoded {val_result.image_format} ({val_result.width}x{val_result.height} px) "
                "passed 12-step validation."
            ),
            metadata={
                "image_format": val_result.image_format,
                "width": val_result.width,
                "height": val_result.height,
            },
        )

    # Run model inference outside database transaction lock
    try:
        pred_data = run_validated_inference(inspection.image.path)
    except Exception as exc:
        with transaction.atomic():
            locked = Inspection.objects.select_for_update().get(pk=inspection.pk)
            locked.status = InspectionStatus.FAILED
            locked.failure_reason = f"Model inference error: {exc}"
            locked.save(update_fields=["status", "failure_reason", "updated_at"])
            InspectionEvent.objects.create(
                inspection=locked,
                actor=user,
                event_type="INFERENCE_FAILED",
                description=f"Model inference failed: {exc}",
                metadata={"error": str(exc)},
            )
            return locked

    with transaction.atomic():
        locked = Inspection.objects.select_for_update().get(pk=inspection.pk)
        if not PredictionResult.objects.filter(inspection=locked).exists():
            PredictionResult.objects.create(
                inspection=locked,
                predicted_class=pred_data["predicted_class"],
                confidence=pred_data["confidence"],
                defect_probability=pred_data["defect_probability"],
                model_version=pred_data["model_version"],
                decision_threshold=pred_data["decision_threshold"],
            )
        locked.status = InspectionStatus.COMPLETED
        locked.save(update_fields=["status", "updated_at"])

        InspectionEvent.objects.create(
            inspection=locked,
            actor=user,
            event_type="INFERENCE_COMPLETED",
            description=(
                f"Model {pred_data['model_version']} predicted {pred_data['predicted_class']} "
                f"(confidence {pred_data['confidence'] * 100:.2f}%, defect probability {pred_data['defect_probability']:.4f})."
            ),
            metadata=pred_data,
        )
        return locked


def create_batch_inspections(
    *,
    user,
    product: Product,
    files_payload: List[Tuple[str, bytes]],
) -> Tuple[InspectionBatch, List[Inspection]]:
    """
    Create an InspectionBatch (1 to 10 items) and persist each uploaded file as QUEUED.
    Dispatches per-item Celery tasks via transaction.on_commit().
    """
    count = len(files_payload)
    if count < MIN_BATCH_ITEMS:
        raise ValidationError("Empty batches are not allowed. Upload between 1 and 10 images.")
    if count > MAX_BATCH_ITEMS:
        raise ValidationError(
            f"Batch size ({count} files) exceeds the maximum allowed limit of {MAX_BATCH_ITEMS} images."
        )

    from .task_dispatch import dispatch_batch_inspection_tasks

    created_inspections: List[Inspection] = []
    with transaction.atomic():
        batch = InspectionBatch.objects.create(
            submitted_by=user,
            product=product,
            status=BatchStatus.QUEUED,
            total_items=count,
            completed_items=0,
            failed_items=0,
        )

        for original_filename, raw_bytes in files_payload:
            import hashlib

            sha256_hex = hashlib.sha256(raw_bytes or b"").hexdigest()
            storage_name = _safe_storage_filename(original_filename)
            item = Inspection(
                batch=batch,
                product=product,
                submitted_by=user,
                original_filename=original_filename or "upload",
                file_size=len(raw_bytes) if raw_bytes else 0,
                image_sha256=sha256_hex,
                status=InspectionStatus.QUEUED,
                validation_status=ValidationStatus.PENDING,
            )
            item.image.save(storage_name, ContentFile(raw_bytes or b""), save=False)
            item.save()

            InspectionEvent.objects.create(
                inspection=item,
                actor=user,
                event_type="BATCH_ITEM_QUEUED",
                description=(
                    f"Queued in Batch #{batch.id} ({original_filename}, {item.file_size} bytes)."
                ),
                metadata={
                    "batch_id": batch.id,
                    "original_filename": original_filename,
                    "file_size": item.file_size,
                    "sha256": sha256_hex,
                },
            )
            created_inspections.append(item)

        inspection_ids = [ins.id for ins in created_inspections]
        transaction.on_commit(lambda: dispatch_batch_inspection_tasks(inspection_ids))

    return batch, created_inspections


def execute_inspection_item_task(inspection_id: int) -> str:
    """
    Execute background validation and model inference for a single queued or lease-expired
    Inspection item using atomic claiming, processing_token fencing, and lock-free inference.
    """
    now = timezone.now()
    token = uuid.uuid4().hex

    # Step 1: Atomic Claim & Lease Acquisition
    with transaction.atomic():
        try:
            inspection = Inspection.objects.select_for_update().get(pk=inspection_id)
        except Inspection.DoesNotExist:
            return "NOT_FOUND"

        # Terminal state or existing prediction check (idempotent guard)
        if inspection.status in (InspectionStatus.COMPLETED, InspectionStatus.FAILED):
            if inspection.batch_id:
                recalculate_batch_status(inspection.batch_id)
            return f"ALREADY_{inspection.status}"

        if PredictionResult.objects.filter(inspection=inspection).exists():
            inspection.status = InspectionStatus.COMPLETED
            inspection.processing_token = ""
            inspection.lease_expires_at = None
            inspection.save(
                update_fields=["status", "processing_token", "lease_expires_at", "updated_at"]
            )
            if inspection.batch_id:
                recalculate_batch_status(inspection.batch_id)
            return "ALREADY_PREDICTED"

        # Active lease check
        if (
            inspection.status == InspectionStatus.PROCESSING
            and inspection.lease_expires_at
            and inspection.lease_expires_at > now
        ):
            return "LEASE_ACTIVE"

        # Claim the inspection item with fencing token and lease expiration
        inspection.status = InspectionStatus.PROCESSING
        inspection.processing_token = token
        inspection.attempt_count += 1
        inspection.lease_expires_at = now + timedelta(seconds=LEASE_DURATION_SECONDS)
        inspection.save(
            update_fields=[
                "status",
                "processing_token",
                "attempt_count",
                "lease_expires_at",
                "updated_at",
            ]
        )
        batch_id = inspection.batch_id
        original_filename = inspection.original_filename
        image_path = inspection.image.path if inspection.image else ""

    if batch_id:
        recalculate_batch_status(batch_id)

    # Step 2: Read bytes & run 12-step validation WITHOUT holding a DB lock
    try:
        with open(image_path, "rb") as f:
            raw_bytes = f.read()
    except Exception as exc:
        with transaction.atomic():
            locked = Inspection.objects.select_for_update().get(pk=inspection_id)
            if locked.processing_token == token and locked.status == InspectionStatus.PROCESSING:
                locked.status = InspectionStatus.FAILED
                locked.validation_status = ValidationStatus.FAILED
                locked.failure_reason = f"Unable to read uploaded file from storage: {exc}"
                locked.processing_token = ""
                locked.lease_expires_at = None
                locked.save(
                    update_fields=[
                        "status",
                        "validation_status",
                        "failure_reason",
                        "processing_token",
                        "lease_expires_at",
                        "updated_at",
                    ]
                )
                InspectionEvent.objects.create(
                    inspection=locked,
                    actor=None,
                    event_type="STORAGE_READ_FAILED",
                    description=locked.failure_reason,
                    metadata={"attempt": locked.attempt_count},
                )
        if batch_id:
            recalculate_batch_status(batch_id)
        return "FAILED_STORAGE"

    val_result = validate_uploaded_image_bytes(raw_bytes, original_filename)

    # Deterministic validation failure: persist FAILED state and never pass to model
    if not val_result.is_valid:
        with transaction.atomic():
            locked = Inspection.objects.select_for_update().get(pk=inspection_id)
            if (
                locked.processing_token == token
                and locked.status == InspectionStatus.PROCESSING
                and not PredictionResult.objects.filter(inspection=locked).exists()
            ):
                locked.status = InspectionStatus.FAILED
                locked.validation_status = ValidationStatus.FAILED
                locked.failure_reason = val_result.failure_reason
                locked.image_sha256 = val_result.sha256
                locked.file_size = val_result.file_size
                locked.image_format = val_result.image_format
                locked.width = val_result.width
                locked.height = val_result.height
                locked.processing_token = ""
                locked.lease_expires_at = None
                locked.save()
                InspectionEvent.objects.create(
                    inspection=locked,
                    actor=None,
                    event_type="VALIDATION_FAILED",
                    description=f"Batch item rejected before inference: {val_result.failure_reason}",
                    metadata={
                        "failure_reason": val_result.failure_reason,
                        "attempt": locked.attempt_count,
                    },
                )
        if batch_id:
            recalculate_batch_status(batch_id)
        return "FAILED_VALIDATION"

    # Step 3: Run model inference WITHOUT holding a database lock
    pred_data = run_validated_inference(image_path)

    # Step 4: Re-acquire DB lock, verify fencing token & no existing prediction, and persist result
    with transaction.atomic():
        locked = Inspection.objects.select_for_update().get(pk=inspection_id)
        if locked.status in (InspectionStatus.COMPLETED, InspectionStatus.FAILED):
            if batch_id:
                recalculate_batch_status(batch_id)
            return "STALE_WORKER_IGNORED"

        if locked.processing_token != token:
            return "FENCING_TOKEN_MISMATCH"

        if not PredictionResult.objects.filter(inspection=locked).exists():
            PredictionResult.objects.create(
                inspection=locked,
                predicted_class=pred_data["predicted_class"],
                confidence=pred_data["confidence"],
                defect_probability=pred_data["defect_probability"],
                model_version=pred_data["model_version"],
                decision_threshold=pred_data["decision_threshold"],
            )

        locked.status = InspectionStatus.COMPLETED
        locked.validation_status = ValidationStatus.PASSED
        locked.failure_reason = ""
        locked.image_sha256 = val_result.sha256
        locked.file_size = val_result.file_size
        locked.image_format = val_result.image_format
        locked.width = val_result.width
        locked.height = val_result.height
        locked.processing_token = ""
        locked.lease_expires_at = None
        locked.save()

        InspectionEvent.objects.create(
            inspection=locked,
            actor=None,
            event_type="VALIDATION_PASSED",
            description=(
                f"Decoded {val_result.image_format} ({val_result.width}x{val_result.height} px) "
                "passed validation."
            ),
            metadata={
                "image_format": val_result.image_format,
                "width": val_result.width,
                "height": val_result.height,
            },
        )
        InspectionEvent.objects.create(
            inspection=locked,
            actor=None,
            event_type="INFERENCE_COMPLETED",
            description=(
                f"Background worker completed inference: {pred_data['predicted_class']} "
                f"({pred_data['confidence'] * 100:.2f}% confidence)."
            ),
            metadata=pred_data,
        )

    if batch_id:
        recalculate_batch_status(batch_id)
    return "COMPLETED"


def submit_supervisor_review(
    *,
    inspection_id: int,
    reviewer,
    reviewed_class: str,
    comment: str = "",
) -> SupervisorReview:
    """
    Create or update a SupervisorReview for a completed inspection.
    Strictly enforces that only SUPERVISOR role users can execute reviews.
    Preserves original PredictionResult untouched and appends a ReviewRevision and InspectionEvent.
    """
    if not reviewer or not reviewer.is_authenticated or get_user_role(reviewer) != ROLE_SUPERVISOR:
        raise PermissionDenied(
            "Only users with the SUPERVISOR role are authorized to confirm or correct predictions."
        )

    cleaned_class = (reviewed_class or "").strip()
    if cleaned_class not in (PredictedClass.NORMAL, PredictedClass.DEFECTIVE):
        raise ValidationError(
            f"Invalid reviewed_class '{cleaned_class}'. Must be 'Normal' or 'Defective'."
        )

    cleaned_comment = (comment or "").strip()

    with transaction.atomic():
        inspection = Inspection.objects.select_for_update().get(pk=inspection_id)

        if inspection.status != InspectionStatus.COMPLETED or not hasattr(inspection, "prediction"):
            raise ValidationError(
                "Only COMPLETED inspections with an existing AI prediction can be reviewed."
            )

        original_class = inspection.prediction.predicted_class
        review_status = (
            ReviewStatus.CONFIRMED
            if cleaned_class == original_class
            else ReviewStatus.CORRECTED
        )

        existing_review = (
            SupervisorReview.objects.select_for_update()
            .filter(inspection=inspection)
            .first()
        )

        if existing_review is None:
            previous_class = ""
            review = SupervisorReview.objects.create(
                inspection=inspection,
                reviewer=reviewer,
                reviewed_class=cleaned_class,
                review_status=review_status,
                comment=cleaned_comment,
            )
        else:
            previous_class = existing_review.reviewed_class
            existing_review.reviewer = reviewer
            existing_review.reviewed_class = cleaned_class
            existing_review.review_status = review_status
            existing_review.comment = cleaned_comment
            existing_review.save(
                update_fields=[
                    "reviewer",
                    "reviewed_class",
                    "review_status",
                    "comment",
                    "updated_at",
                ]
            )
            review = existing_review

        revision = ReviewRevision.objects.create(
            review=review,
            reviewer=reviewer,
            previous_class=previous_class,
            new_class=cleaned_class,
            comment=cleaned_comment,
        )

        InspectionEvent.objects.create(
            inspection=inspection,
            actor=reviewer,
            event_type=f"SUPERVISOR_REVIEW_{review_status}",
            description=(
                f"Supervisor {reviewer.username} {review_status.lower()} prediction: "
                f"AI='{original_class}' -> Reviewed='{cleaned_class}'."
                + (f" Comment: {cleaned_comment}" if cleaned_comment else "")
            ),
            metadata={
                "review_id": review.id,
                "revision_id": revision.id,
                "original_ai_class": original_class,
                "previous_reviewed_class": previous_class,
                "reviewed_class": cleaned_class,
                "review_status": review_status,
                "comment": cleaned_comment,
            },
        )

        return review
