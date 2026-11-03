"""Dedicated 12-step image validation service executed before any model inference."""
import hashlib
import io
import os
import warnings
from dataclasses import dataclass
from typing import Optional
from PIL import Image, UnidentifiedImageError

MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MiB
MIN_DIMENSION_PX = 64
MAX_DIMENSION_PX = 4096

ALLOWED_PIL_FORMATS = {"JPEG", "PNG"}
EXTENSION_TO_FORMAT = {
    ".jpg": "JPEG",
    ".jpeg": "JPEG",
    ".png": "PNG",
}


@dataclass(frozen=True)
class ImageValidationResult:
    is_valid: bool
    sha256: str
    file_size: int
    image_format: str
    width: Optional[int]
    height: Optional[int]
    failure_reason: str = ""


def validate_uploaded_image_bytes(
    raw_bytes: bytes,
    original_filename: str,
) -> ImageValidationResult:
    """
    Execute the mandatory 12-step image validation sequence:
    1. Receive original file bytes.
    2. Check file size (non-empty and <= 5 MiB).
    3. Open image with Pillow and call verify().
    4. Verify actual file format (JPEG or PNG).
    5. Close and reopen the image.
    6. Check extension and decoded format consistency.
    7. Read dimensions before full decoding.
    8. Validate minimum (64) and maximum (4096) dimensions inclusive.
    9. Fully decode image using Pillow load(), treating DecompressionBombWarning as error.
    10. Compute SHA-256 over exact original bytes.
    11. Preserve original image bytes for evidence storage.
    """
    file_size = len(raw_bytes) if raw_bytes else 0
    sha256_hex = hashlib.sha256(raw_bytes or b"").hexdigest()
    filename = (original_filename or "upload").strip()
    _, ext = os.path.splitext(filename.lower())

    # Step 2: Check file size
    if file_size == 0:
        return ImageValidationResult(
            is_valid=False,
            sha256=sha256_hex,
            file_size=0,
            image_format="",
            width=None,
            height=None,
            failure_reason="Empty file uploaded (0 bytes).",
        )

    if file_size > MAX_FILE_SIZE_BYTES:
        size_mib = file_size / (1024 * 1024)
        return ImageValidationResult(
            is_valid=False,
            sha256=sha256_hex,
            file_size=file_size,
            image_format="",
            width=None,
            height=None,
            failure_reason=f"File size ({size_mib:.2f} MiB) exceeds the 5.00 MiB maximum limit.",
        )

    # Check extension upfront for unsupported extensions, while also decoding content to give accurate reason
    expected_format_for_ext = EXTENSION_TO_FORMAT.get(ext)

    # Steps 3 & 4: Open image with Pillow and verify structure/format
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            stream_verify = io.BytesIO(raw_bytes)
            with Image.open(stream_verify) as img_verify:
                detected_format = (img_verify.format or "").upper()
                img_verify.verify()
    except (Image.DecompressionBombWarning, Image.DecompressionBombError):
        return ImageValidationResult(
            is_valid=False,
            sha256=sha256_hex,
            file_size=file_size,
            image_format="",
            width=None,
            height=None,
            failure_reason="Image rejected due to decompression bomb protection warning.",
        )
    except UnidentifiedImageError:
        return ImageValidationResult(
            is_valid=False,
            sha256=sha256_hex,
            file_size=file_size,
            image_format="",
            width=None,
            height=None,
            failure_reason=(
                f"File '{filename}' is not a valid decoded image (unidentified or non-image content)."
            ),
        )
    except Exception as exc:
        return ImageValidationResult(
            is_valid=False,
            sha256=sha256_hex,
            file_size=file_size,
            image_format="",
            width=None,
            height=None,
            failure_reason=f"Corrupt or truncated image structure: {exc}",
        )

    if detected_format not in ALLOWED_PIL_FORMATS:
        return ImageValidationResult(
            is_valid=False,
            sha256=sha256_hex,
            file_size=file_size,
            image_format=detected_format,
            width=None,
            height=None,
            failure_reason=(
                f"Unsupported decoded image format '{detected_format or 'UNKNOWN'}'. Only JPEG and PNG are permitted."
            ),
        )

    # Step 5: Reopen the image for dimension check and full pixel decoding
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            stream_decode = io.BytesIO(raw_bytes)
            with Image.open(stream_decode) as img_decode:
                reopened_format = (img_decode.format or "").upper()
                width, height = img_decode.size

                # Step 6: Check extension and decoded format consistency
                if expected_format_for_ext is None:
                    return ImageValidationResult(
                        is_valid=False,
                        sha256=sha256_hex,
                        file_size=file_size,
                        image_format=reopened_format,
                        width=width,
                        height=height,
                        failure_reason=(
                            f"Unsupported file extension '{ext or 'none'}'. Allowed extensions are .jpg, .jpeg, and .png."
                        ),
                    )

                if expected_format_for_ext != reopened_format:
                    return ImageValidationResult(
                        is_valid=False,
                        sha256=sha256_hex,
                        file_size=file_size,
                        image_format=reopened_format,
                        width=width,
                        height=height,
                        failure_reason=(
                            f"Extension/format mismatch: file extension '{ext}' expects {expected_format_for_ext}, "
                            f"but decoded content is {reopened_format}."
                        ),
                    )

                # Step 7 & 8: Validate minimum and maximum dimensions before full decoding
                if width < MIN_DIMENSION_PX or height < MIN_DIMENSION_PX:
                    return ImageValidationResult(
                        is_valid=False,
                        sha256=sha256_hex,
                        file_size=file_size,
                        image_format=reopened_format,
                        width=width,
                        height=height,
                        failure_reason=(
                            f"Image dimensions ({width}x{height} px) are smaller than the minimum required "
                            f"{MIN_DIMENSION_PX}x{MIN_DIMENSION_PX} px."
                        ),
                    )

                if width > MAX_DIMENSION_PX or height > MAX_DIMENSION_PX:
                    return ImageValidationResult(
                        is_valid=False,
                        sha256=sha256_hex,
                        file_size=file_size,
                        image_format=reopened_format,
                        width=width,
                        height=height,
                        failure_reason=(
                            f"Image dimensions ({width}x{height} px) exceed the maximum allowed "
                            f"{MAX_DIMENSION_PX}x{MAX_DIMENSION_PX} px."
                        ),
                    )

                # Step 9 & 10: Fully decode pixel data using load()
                img_decode.load()

    except (Image.DecompressionBombWarning, Image.DecompressionBombError):
        return ImageValidationResult(
            is_valid=False,
            sha256=sha256_hex,
            file_size=file_size,
            image_format=detected_format,
            width=None,
            height=None,
            failure_reason="Image rejected during full decode due to decompression bomb protection.",
        )
    except Exception as exc:
        return ImageValidationResult(
            is_valid=False,
            sha256=sha256_hex,
            file_size=file_size,
            image_format=detected_format,
            width=None,
            height=None,
            failure_reason=f"Corrupt or truncated pixel stream during full image decode: {exc}",
        )

    return ImageValidationResult(
        is_valid=True,
        sha256=sha256_hex,
        file_size=file_size,
        image_format=detected_format,
        width=width,
        height=height,
        failure_reason="",
    )
