"""Inference adapter invoking the supplied Model/inference.py after hash verification."""
from pathlib import Path
from typing import Any, Dict, Union
from django.conf import settings
from .model_integrity import load_supplied_inference_module


def run_validated_inference(image_path: Union[str, Path]) -> Dict[str, Any]:
    """
    Verify model integrity, load the official supplied Model/inference.py helper,
    and run prediction on a validated image file on disk.
    """
    module, integrity = load_supplied_inference_module()
    model_npz_path = settings.MODEL_DIR / "classifier.npz"

    raw_output = module.predict(str(image_path), str(model_npz_path))

    return {
        "predicted_class": str(raw_output["predicted_class"]),
        "confidence": float(raw_output["confidence"]),
        "defect_probability": float(raw_output["defect_probability"]),
        "model_version": str(raw_output["model_version"]),
        "decision_threshold": float(integrity.get("decision_threshold", 0.5)),
    }
