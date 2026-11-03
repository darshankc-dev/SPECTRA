"""
Complete automated PostgreSQL test suite for SPECTRΛ (25 mandatory test cases).
Run via:
    python manage.py test tests
"""
import io
from pathlib import Path
from unittest.mock import patch

from django.conf import settings
from django.contrib.auth.models import User
from django.core.exceptions import PermissionDenied, ValidationError
from django.test import TransactionTestCase
from PIL import Image
from rest_framework.test import APIClient

from apps.accounts.roles import (
    ROLE_ADMINISTRATOR,
    ROLE_ENGINEER,
    ROLE_SUPERVISOR,
    assign_user_role,
    ensure_role_groups,
)
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
from services.evidence_verification import verify_inspection_image_integrity
from services.image_validation import validate_uploaded_image_bytes
from services.inspection_lifecycle import (
    create_and_process_single_inspection,
    create_batch_inspections,
    execute_inspection_item_task,
    recalculate_batch_status,
    submit_supervisor_review,
)


def _make_png_bytes(width: int = 128, height: int = 128, color=(120, 120, 120)) -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", (width, height), color=color)
    img.save(buf, format="PNG")
    return buf.getvalue()


class SpectraChallengeTestSuite(TransactionTestCase):
    """Verifies all 25 mandatory challenge requirements on PostgreSQL."""

    def setUp(self):
        ensure_role_groups()
        self.admin_user = User.objects.create_user(
            username="test_admin", email="admin@test.io", password="TestPassword123!"
        )
        assign_user_role(self.admin_user, ROLE_ADMINISTRATOR)

        self.supervisor_user = User.objects.create_user(
            username="test_supervisor", email="sup@test.io", password="TestPassword123!"
        )
        assign_user_role(self.supervisor_user, ROLE_SUPERVISOR)

        self.engineer_1 = User.objects.create_user(
            username="test_eng1", email="eng1@test.io", password="TestPassword123!"
        )
        assign_user_role(self.engineer_1, ROLE_ENGINEER)

        self.engineer_2 = User.objects.create_user(
            username="test_eng2", email="eng2@test.io", password="TestPassword123!"
        )
        assign_user_role(self.engineer_2, ROLE_ENGINEER)

        self.product, _ = Product.objects.get_or_create(
            product_id="P-PLATE01",
            defaults={
                "name": "Demonstration Metal Plate",
                "description": "Synthetic centered plate with scratches or pits",
                "active": True,
                "created_by": self.admin_user,
            },
        )

        self.valid_png_bytes = (settings.SAMPLES_DIR / "images" / "inspection_001.png").read_bytes()
        self.valid_jpg_bytes = (settings.SAMPLES_DIR / "images" / "inspection_002.jpg").read_bytes()
        self.not_an_image_bytes = (settings.VALIDATION_DIR / "not_an_image.jpg").read_bytes()
        self.corrupt_png_bytes = (settings.VALIDATION_DIR / "corrupt_image.png").read_bytes()
        self.too_small_png_bytes = (settings.VALIDATION_DIR / "too_small.png").read_bytes()

    # 1. Valid JPEG accepted
    def test_01_valid_jpeg_accepted(self):
        res = validate_uploaded_image_bytes(self.valid_jpg_bytes, "inspection_002.jpg")
        self.assertTrue(res.is_valid)
        self.assertEqual(res.image_format, "JPEG")
        self.assertEqual(res.width, 256)
        self.assertEqual(res.height, 256)

    # 2. Valid PNG accepted
    def test_02_valid_png_accepted(self):
        res = validate_uploaded_image_bytes(self.valid_png_bytes, "inspection_001.png")
        self.assertTrue(res.is_valid)
        self.assertEqual(res.image_format, "PNG")
        self.assertEqual(res.width, 256)
        self.assertEqual(res.height, 256)

    # 3. Text file renamed to JPG rejected
    def test_03_text_file_renamed_to_jpg_rejected(self):
        res = validate_uploaded_image_bytes(self.not_an_image_bytes, "not_an_image.jpg")
        self.assertFalse(res.is_valid)
        self.assertIn("not a valid decoded image", res.failure_reason.lower())

    # 4. Corrupt image rejected
    def test_04_corrupt_image_rejected(self):
        res = validate_uploaded_image_bytes(self.corrupt_png_bytes, "corrupt_image.png")
        self.assertFalse(res.is_valid)
        self.assertTrue(len(res.failure_reason) > 0)

    # 5. Truncated image rejected
    def test_05_truncated_image_rejected(self):
        truncated = self.valid_jpg_bytes[: len(self.valid_jpg_bytes) // 3]
        res = validate_uploaded_image_bytes(truncated, "truncated.jpg")
        self.assertFalse(res.is_valid)
        self.assertTrue(len(res.failure_reason) > 0)

    # 6. Image smaller than 64 pixels rejected
    def test_06_image_smaller_than_64_pixels_rejected(self):
        res = validate_uploaded_image_bytes(self.too_small_png_bytes, "too_small.png")
        self.assertFalse(res.is_valid)
        self.assertIn("smaller than the minimum required", res.failure_reason.lower())

    # 7. Image larger than 4096 pixels rejected
    def test_07_image_larger_than_4096_pixels_rejected(self):
        oversized_dim_bytes = _make_png_bytes(width=4100, height=64)
        res = validate_uploaded_image_bytes(oversized_dim_bytes, "oversized_width.png")
        self.assertFalse(res.is_valid)
        self.assertIn("exceed the maximum allowed", res.failure_reason.lower())

    # 8. Image over 5 MiB rejected
    def test_08_image_over_5_mib_rejected(self):
        over_5mib = b"\x89PNG\r\n\x1a\n" + (b"\x00" * (5 * 1024 * 1024 + 100))
        res = validate_uploaded_image_bytes(over_5mib, "huge.png")
        self.assertFalse(res.is_valid)
        self.assertIn("exceeds the 5.00 mib maximum limit", res.failure_reason.lower())

    # 9. Empty batch rejected
    def test_09_empty_batch_rejected(self):
        with self.assertRaises(ValidationError):
            create_batch_inspections(
                user=self.engineer_1,
                product=self.product,
                files_payload=[],
            )

    # 10. Batch over 10 items rejected
    def test_10_batch_over_10_items_rejected(self):
        eleven_files = [(f"img_{i}.png", self.valid_png_bytes) for i in range(11)]
        with self.assertRaises(ValidationError):
            create_batch_inspections(
                user=self.engineer_1,
                product=self.product,
                files_payload=eleven_files,
            )

    # 11. Invalid batch item is saved as failed
    def test_11_invalid_batch_item_saved_as_failed(self):
        batch, items = create_batch_inspections(
            user=self.engineer_1,
            product=self.product,
            files_payload=[("not_an_image.jpg", self.not_an_image_bytes)],
        )
        execute_inspection_item_task(items[0].id)
        item_refreshed = Inspection.objects.get(pk=items[0].id)
        self.assertEqual(item_refreshed.status, InspectionStatus.FAILED)
        self.assertEqual(item_refreshed.validation_status, ValidationStatus.FAILED)
        self.assertTrue(len(item_refreshed.failure_reason) > 0)
        self.assertFalse(PredictionResult.objects.filter(inspection=item_refreshed).exists())

    # 12. Invalid image never reaches inference
    def test_12_invalid_image_never_reaches_inference(self):
        with patch("services.inspection_lifecycle.run_validated_inference") as mocked_infer:
            ins = create_and_process_single_inspection(
                user=self.engineer_1,
                product=self.product,
                raw_bytes=self.not_an_image_bytes,
                original_filename="not_an_image.jpg",
            )
            mocked_infer.assert_not_called()
            self.assertEqual(ins.status, InspectionStatus.FAILED)
            self.assertFalse(hasattr(ins, "prediction"))

    # 13. Valid items continue when another batch item fails
    def test_13_valid_items_continue_when_batch_item_fails(self):
        batch, items = create_batch_inspections(
            user=self.engineer_1,
            product=self.product,
            files_payload=[
                ("not_an_image.jpg", self.not_an_image_bytes),
                ("inspection_001.png", self.valid_png_bytes),
                ("too_small.png", self.too_small_png_bytes),
                ("inspection_002.jpg", self.valid_jpg_bytes),
            ],
        )
        for item in items:
            execute_inspection_item_task(item.id)

        batch_refreshed = recalculate_batch_status(batch.id)
        self.assertEqual(batch_refreshed.status, BatchStatus.PARTIAL)
        self.assertEqual(batch_refreshed.completed_items, 2)
        self.assertEqual(batch_refreshed.failed_items, 2)

    # 14. Actual prediction is persisted
    def test_14_actual_prediction_is_persisted(self):
        ins = create_and_process_single_inspection(
            user=self.engineer_1,
            product=self.product,
            raw_bytes=self.valid_png_bytes,
            original_filename="inspection_001.png",
        )
        self.assertEqual(ins.status, InspectionStatus.COMPLETED)
        pred = PredictionResult.objects.get(inspection=ins)
        self.assertEqual(pred.predicted_class, PredictedClass.DEFECTIVE)
        self.assertEqual(pred.model_version, "BIT-PLATE-CV-1.0")
        self.assertGreaterEqual(pred.defect_probability, 0.5)

    # 15. Original prediction remains immutable
    def test_15_original_prediction_remains_immutable(self):
        ins = create_and_process_single_inspection(
            user=self.engineer_1,
            product=self.product,
            raw_bytes=self.valid_png_bytes,
            original_filename="inspection_001.png",
        )
        pred = ins.prediction
        original_class = pred.predicted_class
        original_prob = pred.defect_probability

        # Direct modification attempt on PredictionResult raises ValidationError
        pred.predicted_class = PredictedClass.NORMAL
        with self.assertRaises(ValidationError):
            pred.save()

        # Supervisor correction also preserves original PredictionResult unchanged
        submit_supervisor_review(
            inspection_id=ins.id,
            reviewer=self.supervisor_user,
            reviewed_class=PredictedClass.NORMAL,
            comment="Override test",
        )
        pred_reloaded = PredictionResult.objects.get(inspection=ins)
        self.assertEqual(pred_reloaded.predicted_class, original_class)
        self.assertAlmostEqual(pred_reloaded.defect_probability, original_prob, places=6)

    # 16. Engineer sees only personal inspection history
    def test_16_engineer_sees_only_personal_inspection_history(self):
        ins1 = create_and_process_single_inspection(
            user=self.engineer_1,
            product=self.product,
            raw_bytes=self.valid_png_bytes,
            original_filename="eng1_plate.png",
        )
        ins2 = create_and_process_single_inspection(
            user=self.engineer_2,
            product=self.product,
            raw_bytes=self.valid_jpg_bytes,
            original_filename="eng2_plate.jpg",
        )

        client = APIClient()
        client.force_authenticate(user=self.engineer_1)
        resp = client.get("/api/v1/inspections/")
        self.assertEqual(resp.status_code, 200)
        returned_ids = [item["id"] for item in resp.data["inspections"]]
        self.assertIn(ins1.id, returned_ids)
        self.assertNotIn(ins2.id, returned_ids)

    # 17. Supervisor can review completed inspections
    def test_17_supervisor_can_review_completed_inspections(self):
        ins = create_and_process_single_inspection(
            user=self.engineer_1,
            product=self.product,
            raw_bytes=self.valid_jpg_bytes,
            original_filename="inspection_002.jpg",
        )
        review = submit_supervisor_review(
            inspection_id=ins.id,
            reviewer=self.supervisor_user,
            reviewed_class=PredictedClass.DEFECTIVE,
            comment="Edge scratch observed",
        )
        self.assertEqual(review.review_status, ReviewStatus.CORRECTED)
        self.assertEqual(review.reviewed_class, PredictedClass.DEFECTIVE)

    # 18. Engineer cannot submit a review (service layer enforcement)
    def test_18_engineer_cannot_submit_review(self):
        ins = create_and_process_single_inspection(
            user=self.engineer_1,
            product=self.product,
            raw_bytes=self.valid_png_bytes,
            original_filename="inspection_001.png",
        )
        with self.assertRaises(PermissionDenied):
            submit_supervisor_review(
                inspection_id=ins.id,
                reviewer=self.engineer_1,
                reviewed_class=PredictedClass.NORMAL,
                comment="Engineer trying to self-review",
            )

    # 19. Direct API review attempt by Engineer returns 403
    def test_19_direct_api_review_attempt_by_engineer_returns_403(self):
        ins = create_and_process_single_inspection(
            user=self.engineer_1,
            product=self.product,
            raw_bytes=self.valid_png_bytes,
            original_filename="inspection_001.png",
        )
        client = APIClient()
        client.force_authenticate(user=self.engineer_1)
        resp = client.post(
            f"/api/v1/reviews/{ins.id}/",
            {"reviewed_class": "Normal", "comment": "Direct API bypass attempt"},
            format="json",
        )
        self.assertEqual(resp.status_code, 403)

    # 20. Unauthorized review does not modify data
    def test_20_unauthorized_review_does_not_modify_data(self):
        ins = create_and_process_single_inspection(
            user=self.engineer_1,
            product=self.product,
            raw_bytes=self.valid_png_bytes,
            original_filename="inspection_001.png",
        )
        client = APIClient()
        client.force_authenticate(user=self.engineer_1)
        client.post(
            f"/api/v1/reviews/{ins.id}/",
            {"reviewed_class": "Normal", "comment": "Attempt"},
            format="json",
        )
        self.assertFalse(SupervisorReview.objects.filter(inspection=ins).exists())
        self.assertEqual(
            PredictionResult.objects.get(inspection=ins).predicted_class,
            PredictedClass.DEFECTIVE,
        )

    # 21. Review revisions are preserved
    def test_21_review_revisions_are_preserved(self):
        ins = create_and_process_single_inspection(
            user=self.engineer_1,
            product=self.product,
            raw_bytes=self.valid_png_bytes,
            original_filename="inspection_001.png",
        )
        submit_supervisor_review(
            inspection_id=ins.id,
            reviewer=self.supervisor_user,
            reviewed_class=PredictedClass.DEFECTIVE,
            comment="Initial confirmation",
        )
        review = submit_supervisor_review(
            inspection_id=ins.id,
            reviewer=self.supervisor_user,
            reviewed_class=PredictedClass.NORMAL,
            comment="Re-evaluated under magnification",
        )
        revisions = list(ReviewRevision.objects.filter(review=review).order_by("id"))
        self.assertEqual(len(revisions), 2)
        self.assertEqual(revisions[0].previous_class, "")
        self.assertEqual(revisions[0].new_class, PredictedClass.DEFECTIVE)
        self.assertEqual(revisions[1].previous_class, PredictedClass.DEFECTIVE)
        self.assertEqual(revisions[1].new_class, PredictedClass.NORMAL)

    # 22. Evidence Passport returns correct information
    def test_22_evidence_passport_returns_correct_information(self):
        ins = create_and_process_single_inspection(
            user=self.engineer_1,
            product=self.product,
            raw_bytes=self.valid_png_bytes,
            original_filename="inspection_001.png",
        )
        client = APIClient()
        client.force_authenticate(user=self.engineer_1)
        resp = client.get(f"/api/v1/inspections/{ins.id}/passport/")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["inspection"]["id"], ins.id)
        self.assertEqual(resp.data["inspection"]["image_sha256"], ins.image_sha256)
        self.assertTrue(len(resp.data["events"]) >= 2)

    # 23. Image integrity verification works (MATCH & MISMATCH detection)
    def test_23_image_integrity_verification_works(self):
        ins = create_and_process_single_inspection(
            user=self.engineer_1,
            product=self.product,
            raw_bytes=self.valid_png_bytes,
            original_filename="inspection_001.png",
        )
        res_match = verify_inspection_image_integrity(ins, actor=self.engineer_1)
        self.assertEqual(res_match["status"], "MATCH")
        self.assertEqual(res_match["saved_sha256"], res_match["recomputed_sha256"])

        # Tamper with stored bytes on disk and verify MISMATCH is detected
        img_path = Path(ins.image.path)
        original_disk_bytes = img_path.read_bytes()
        try:
            img_path.write_bytes(original_disk_bytes + b"TAMPERED")
            res_mismatch = verify_inspection_image_integrity(ins, actor=self.engineer_1)
            self.assertEqual(res_mismatch["status"], "MISMATCH")
        finally:
            img_path.write_bytes(original_disk_bytes)

    # 24. Batch status aggregation works (COMPLETED, FAILED, PARTIAL)
    def test_24_batch_status_aggregation_works(self):
        # All valid -> COMPLETED
        b_comp, items_comp = create_batch_inspections(
            user=self.engineer_1,
            product=self.product,
            files_payload=[("a.png", self.valid_png_bytes), ("b.jpg", self.valid_jpg_bytes)],
        )
        for it in items_comp:
            execute_inspection_item_task(it.id)
        self.assertEqual(recalculate_batch_status(b_comp.id).status, BatchStatus.COMPLETED)

        # All invalid -> FAILED
        b_fail, items_fail = create_batch_inspections(
            user=self.engineer_1,
            product=self.product,
            files_payload=[("bad1.jpg", self.not_an_image_bytes), ("bad2.png", self.too_small_png_bytes)],
        )
        for it in items_fail:
            execute_inspection_item_task(it.id)
        self.assertEqual(recalculate_batch_status(b_fail.id).status, BatchStatus.FAILED)

        # Mixed -> PARTIAL
        b_part, items_part = create_batch_inspections(
            user=self.engineer_1,
            product=self.product,
            files_payload=[("good.png", self.valid_png_bytes), ("bad.jpg", self.not_an_image_bytes)],
        )
        for it in items_part:
            execute_inspection_item_task(it.id)
        self.assertEqual(recalculate_batch_status(b_part.id).status, BatchStatus.PARTIAL)

    # 25. Duplicate task execution does not create duplicate predictions
    def test_25_duplicate_task_execution_no_duplicate_predictions(self):
        batch, items = create_batch_inspections(
            user=self.engineer_1,
            product=self.product,
            files_payload=[("inspection_001.png", self.valid_png_bytes)],
        )
        item_id = items[0].id
        first_run = execute_inspection_item_task(item_id)
        second_run = execute_inspection_item_task(item_id)
        self.assertEqual(first_run, "COMPLETED")
        self.assertEqual(second_run, "ALREADY_COMPLETED")
        self.assertEqual(PredictionResult.objects.filter(inspection_id=item_id).count(), 1)
