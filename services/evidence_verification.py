"""Evidence Passport image integrity verification service."""
import hashlib
from pathlib import Path
from typing import Any, Dict

from apps.audit.models import InspectionEvent
from apps.inspections.models import Inspection

INTEGRITY_EXPLANATION = (
    "A matching SHA-256 hash verifies that the stored image bytes on disk match the "
    "digest recorded at ingestion time, but does not independently prove the external "
    "source or physical authenticity of the image."
)


def verify_inspection_image_integrity(inspection: Inspection, actor=None) -> Dict[str, Any]:
    """
    Recompute SHA-256 from the stored original image file and compare it with
    the saved inspection.image_sha256 digest.
    Returns MATCH, MISMATCH, or VERIFICATION ERROR.
    """
    saved_hash = (inspection.image_sha256 or "").strip().lower()
    if not inspection.image:
        result = {
            "status": "VERIFICATION ERROR",
            "saved_sha256": saved_hash,
            "recomputed_sha256": None,
            "file_size_on_disk": None,
            "message": "No stored image file reference is attached to this inspection record.",
            "explanation": INTEGRITY_EXPLANATION,
        }
        InspectionEvent.objects.create(
            inspection=inspection,
            actor=actor,
            event_type="INTEGRITY_VERIFICATION_ERROR",
            description="Image integrity verification failed: no file reference.",
            metadata=result,
        )
        return result

    try:
        file_path = Path(inspection.image.path)
        if not file_path.exists():
            result = {
                "status": "VERIFICATION ERROR",
                "saved_sha256": saved_hash,
                "recomputed_sha256": None,
                "file_size_on_disk": None,
                "message": "Stored image file could not be found on disk.",
                "explanation": INTEGRITY_EXPLANATION,
            }
            InspectionEvent.objects.create(
                inspection=inspection,
                actor=actor,
                event_type="INTEGRITY_VERIFICATION_ERROR",
                description="Image integrity verification failed: stored file missing on disk.",
                metadata=result,
            )
            return result

        hasher = hashlib.sha256()
        total_bytes = 0
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                total_bytes += len(chunk)
                hasher.update(chunk)
        recomputed_hash = hasher.hexdigest().lower()

        if saved_hash and recomputed_hash == saved_hash:
            status_str = "MATCH"
            msg = "Stored image bytes match the original SHA-256 digest recorded at upload."
        else:
            status_str = "MISMATCH"
            msg = (
                "Stored image bytes do NOT match the saved SHA-256 digest. "
                "The stored file may have been altered or corrupted after upload."
            )

        result = {
            "status": status_str,
            "saved_sha256": saved_hash,
            "recomputed_sha256": recomputed_hash,
            "file_size_on_disk": total_bytes,
            "message": msg,
            "explanation": INTEGRITY_EXPLANATION,
        }
        InspectionEvent.objects.create(
            inspection=inspection,
            actor=actor,
            event_type=f"INTEGRITY_{status_str}",
            description=f"Evidence integrity check returned {status_str}.",
            metadata={
                "status": status_str,
                "saved_sha256": saved_hash,
                "recomputed_sha256": recomputed_hash,
                "file_size_on_disk": total_bytes,
            },
        )
        return result

    except Exception as exc:
        result = {
            "status": "VERIFICATION ERROR",
            "saved_sha256": saved_hash,
            "recomputed_sha256": None,
            "file_size_on_disk": None,
            "message": f"Error reading stored evidence bytes: {exc}",
            "explanation": INTEGRITY_EXPLANATION,
        }
        InspectionEvent.objects.create(
            inspection=inspection,
            actor=actor,
            event_type="INTEGRITY_VERIFICATION_ERROR",
            description=f"Evidence integrity check encountered an error: {exc}",
            metadata={"error": str(exc)},
        )
        return result
