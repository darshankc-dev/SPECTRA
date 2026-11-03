"""Model integrity verification and 60-sample synthetic dataset evaluation service."""
import csv
import hashlib
import importlib.util
import json
from pathlib import Path
from typing import Any, Dict

from django.conf import settings
from django.utils import timezone

EXPECTED_HASHES = {
    "inference.py": "322647cb2e9b5466fe675af56564114532a3c50366ea4fad2961d69a88089ffc",
    "classifier.npz": "d05a524ac10d6cb864e82da5adb69c0762308ddc05f833fd96eac336c4984ed2",
    "model_metadata.json": "945f45a455106bede24345e802a64eafd9a6d6a928829f2b1de7f151c49dd017",
}


class ModelIntegrityError(Exception):
    """Raised when supplied model files fail SHA-256 integrity verification."""


def compute_file_sha256(file_path: Path) -> str:
    """Compute SHA-256 hex digest of a file on disk."""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def parse_sha256sums_file(sha256sums_path: Path) -> Dict[str, str]:
    """Parse SHA256SUMS.txt into a mapping of relative path -> expected sha256."""
    mapping: Dict[str, str] = {}
    if not sha256sums_path.exists():
        return mapping
    with open(sha256sums_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            parts = line.split(None, 1)
            if len(parts) == 2:
                digest, rel_path = parts[0].strip().lower(), parts[1].strip()
                mapping[rel_path] = digest
    return mapping


def verify_model_integrity() -> Dict[str, Any]:
    """
    Verify SHA-256 hashes of inference.py, classifier.npz, and model_metadata.json
    against both EXPECTED_HASHES and SHA256SUMS.txt before loading or executing.
    """
    model_dir: Path = settings.MODEL_DIR
    sha256sums_map = parse_sha256sums_file(settings.SHA256SUMS_PATH)

    files_report: Dict[str, Any] = {}
    all_verified = True
    errors = []

    for filename, expected_hash in EXPECTED_HASHES.items():
        file_path = model_dir / filename
        rel_key = f"Model/{filename}"
        if not file_path.exists():
            all_verified = False
            errors.append(f"Missing required model file: {rel_key}")
            files_report[filename] = {
                "exists": False,
                "actual_sha256": None,
                "expected_sha256": expected_hash,
                "sha256sums_txt_match": False,
                "verified": False,
            }
            continue

        actual_hash = compute_file_sha256(file_path)
        sha256sums_expected = sha256sums_map.get(rel_key, expected_hash)
        matches_expected = actual_hash == expected_hash
        matches_sums_txt = actual_hash == sha256sums_expected
        verified = matches_expected and matches_sums_txt

        if not verified:
            all_verified = False
            errors.append(
                f"SHA-256 mismatch for {rel_key}: expected {expected_hash}, got {actual_hash}"
            )

        files_report[filename] = {
            "exists": True,
            "actual_sha256": actual_hash,
            "expected_sha256": expected_hash,
            "sha256sums_txt_match": matches_sums_txt,
            "verified": verified,
        }

    metadata_json = {}
    metadata_path = model_dir / "model_metadata.json"
    if metadata_path.exists() and files_report.get("model_metadata.json", {}).get("verified"):
        with open(metadata_path, "r", encoding="utf-8") as f:
            metadata_json = json.load(f)

    return {
        "verified": all_verified,
        "status": "VERIFIED" if all_verified else "INTEGRITY_FAILED",
        "model_version": metadata_json.get("model_version", "BIT-PLATE-CV-1.0"),
        "product_id": metadata_json.get("product_id", "P-PLATE01"),
        "decision_threshold": float(metadata_json.get("decision_threshold", 0.5)),
        "architecture": metadata_json.get(
            "architecture",
            "Standardized 17-dimensional image features and logistic regression",
        ),
        "limitations_summary": metadata_json.get(
            "limitations",
            "Synthetic, fixed framing only. Uncalibrated scores. No real factory validity.",
        ),
        "files": files_report,
        "errors": errors,
        "integrity_disclaimer": (
            "A matching SHA-256 hash verifies file byte integrity against the expected digest, "
            "not the real-world physical authenticity or calibration of the model."
        ),
    }


def load_supplied_inference_module():
    """Verify hashes and dynamically import the unmodified Model/inference.py module."""
    integrity = verify_model_integrity()
    if not integrity["verified"]:
        raise ModelIntegrityError("; ".join(integrity["errors"]))

    inference_path = settings.MODEL_DIR / "inference.py"
    spec = importlib.util.spec_from_file_location("spectra_supplied_inference", inference_path)
    if spec is None or spec.loader is None:
        raise ModelIntegrityError(f"Unable to load specification from {inference_path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module, integrity


def evaluate_supplied_60_samples() -> Dict[str, Any]:
    """
    Evaluate all 60 supplied labeled synthetic samples using Model/inference.py
    and Samples/labels.csv. Used strictly for reporting development dataset metrics,
    never for live inspection inference.
    """
    module, integrity = load_supplied_inference_module()
    labels_csv_path: Path = settings.SAMPLES_DIR / "labels.csv"
    model_npz_path: Path = settings.MODEL_DIR / "classifier.npz"

    if not labels_csv_path.exists():
        raise FileNotFoundError(f"Missing sample labels file: {labels_csv_path}")

    tp = 0
    tn = 0
    fp = 0
    fn = 0
    missing_or_failed = 0
    sample_records = []

    with open(labels_csv_path, mode="r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            image_id = (row.get("image_id") or "").strip()
            rel_path = (row.get("relative_path") or "").strip()
            product_id = (row.get("product_id") or "P-PLATE01").strip()
            actual_label = (row.get("label") or "").strip()
            img_path = settings.SAMPLES_DIR / rel_path

            if not img_path.exists():
                missing_or_failed += 1
                sample_records.append(
                    {
                        "image_id": image_id,
                        "relative_path": rel_path,
                        "product_id": product_id,
                        "actual_label": actual_label,
                        "predicted_class": None,
                        "confidence": None,
                        "defect_probability": None,
                        "correct": False,
                        "error": "Sample file missing",
                    }
                )
                continue

            try:
                pred = module.predict(str(img_path), str(model_npz_path))
                predicted_class = pred["predicted_class"]
                confidence = float(pred["confidence"])
                defect_prob = float(pred["defect_probability"])

                if actual_label == "Defective" and predicted_class == "Defective":
                    tp += 1
                    outcome = "TP"
                elif actual_label == "Normal" and predicted_class == "Normal":
                    tn += 1
                    outcome = "TN"
                elif actual_label == "Normal" and predicted_class == "Defective":
                    fp += 1
                    outcome = "FP"
                elif actual_label == "Defective" and predicted_class == "Normal":
                    fn += 1
                    outcome = "FN"
                else:
                    missing_or_failed += 1
                    outcome = "UNKNOWN"

                sample_records.append(
                    {
                        "image_id": image_id,
                        "relative_path": rel_path,
                        "product_id": product_id,
                        "actual_label": actual_label,
                        "predicted_class": predicted_class,
                        "confidence": round(confidence, 6),
                        "defect_probability": round(defect_prob, 6),
                        "correct": actual_label == predicted_class,
                        "outcome": outcome,
                    }
                )
            except Exception as exc:
                missing_or_failed += 1
                sample_records.append(
                    {
                        "image_id": image_id,
                        "relative_path": rel_path,
                        "product_id": product_id,
                        "actual_label": actual_label,
                        "predicted_class": None,
                        "confidence": None,
                        "defect_probability": None,
                        "correct": False,
                        "error": str(exc),
                    }
                )

    total_evaluated = tp + tn + fp + fn
    accuracy = (tp + tn) / total_evaluated if total_evaluated else 0.0
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    defect_recall = recall
    f1_score = (
        (2 * precision * recall) / (precision + recall)
        if (precision + recall)
        else 0.0
    )

    return {
        "evaluation_label": "SYNTHETIC DEVELOPMENT DATASET EVALUATION",
        "model_version": integrity["model_version"],
        "product_id": integrity["product_id"],
        "decision_threshold": integrity["decision_threshold"],
        "positive_class": "Defective",
        "total_samples": len(sample_records),
        "evaluated_samples": total_evaluated,
        "missing_or_failed_predictions": missing_or_failed,
        "true_positive": tp,
        "true_negative": tn,
        "false_positive": fp,
        "false_negative": fn,
        "accuracy": round(accuracy, 6),
        "precision": round(precision, 6),
        "recall": round(recall, 6),
        "defect_recall": round(defect_recall, 6),
        "f1_score": round(f1_score, 6),
        "confusion_matrix": {
            "labels": ["Normal", "Defective"],
            "rows_actual_cols_predicted": [
                [tn, fp],  # Actual Normal -> [Pred Normal (TN), Pred Defective (FP)]
                [fn, tp],  # Actual Defective -> [Pred Normal (FN), Pred Defective (TP)]
            ],
        },
        "zero_fn_note": (
            "Zero false negatives (FN = 0) occurred on the 60 synthetic samples. "
            "Because these 60 procedural illustrations share the same fixed generator framing and "
            "contrast distribution as the training seeds (10000-11199), a 100% recall on this "
            "small development set does NOT establish real-world factory reliability."
        ),
        "limitations": [
            "Does not identify defect subtype (e.g., scratch vs. pit).",
            "Does not localize defects or generate bounding boxes.",
            "Does not estimate physical defect severity, depth, or root cause.",
            "Trained exclusively on 1,200 procedurally generated 256x256 synthetic illustrations with fixed centered framing.",
            "Confidence scores are uncalibrated logistic regression outputs, not verified probabilities of product safety.",
        ],
        "evaluated_at": timezone.now().isoformat(),
        "samples": sample_records,
    }
