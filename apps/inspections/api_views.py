"""Django REST Framework API views for SPECTRΛ."""
import mimetypes
from pathlib import Path

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.core.exceptions import PermissionDenied, ValidationError as DjangoValidationError
from django.db.models import Count, F, FloatField, Func, Q, Value
from django.db.models.functions import Abs, TruncDate
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.roles import (
    ALL_ROLES,
    ROLE_ADMINISTRATOR,
    ROLE_ENGINEER,
    ROLE_SUPERVISOR,
    assign_user_role,
    get_dashboard_url_for_user,
    get_user_role,
    IsAdministrator,
    IsSupervisor,
    IsSupervisorOrAdministrator,
)
from apps.audit.models import InspectionEvent
from apps.batch_processing.models import BatchStatus, InspectionBatch
from apps.inspections.models import (
    Inspection,
    InspectionStatus,
    PredictedClass,
    PredictionResult,
    ValidationStatus,
)
from apps.model_evaluation.models import ModelMetadata
from apps.products.models import Product
from apps.reviews.models import ReviewStatus, SupervisorReview
from services.evidence_verification import (
    INTEGRITY_EXPLANATION,
    verify_inspection_image_integrity,
)
from services.inspection_lifecycle import (
    create_and_process_single_inspection,
    create_batch_inspections,
    submit_supervisor_review,
)
from services.model_integrity import evaluate_supplied_60_samples, verify_model_integrity
from services.task_dispatch import reconcile_pending_and_expired_inspections
from .serializers import (
    InspectionBatchSerializer,
    InspectionEventSerializer,
    InspectionSerializer,
    ProductSerializer,
    ReviewRevisionSerializer,
    SupervisorReviewSerializer,
    UserSummarySerializer,
)


def _filter_inspections_for_user(user, qs=None):
    if qs is None:
        qs = Inspection.objects.select_related(
            "product", "submitted_by", "prediction", "supervisor_review", "supervisor_review__reviewer"
        ).prefetch_related("supervisor_review__revisions")
    role = get_user_role(user)
    if role == ROLE_ENGINEER:
        return qs.filter(submitted_by=user)
    return qs


def _apply_inspection_query_filters(request, qs):
    status_param = (request.query_params.get("status") or "").strip().upper()
    if status_param and status_param != "ALL":
        qs = qs.filter(status=status_param)

    predicted_class = (request.query_params.get("predicted_class") or "").strip()
    if predicted_class and predicted_class.upper() != "ALL":
        qs = qs.filter(prediction__predicted_class__iexact=predicted_class)

    review_status = (request.query_params.get("review_status") or "").strip().upper()
    if review_status and review_status != "ALL":
        if review_status == ReviewStatus.UNREVIEWED:
            qs = qs.filter(supervisor_review__isnull=True)
        else:
            qs = qs.filter(supervisor_review__review_status=review_status)

    disagreement = (request.query_params.get("disagreement") or "").strip().lower()
    if disagreement in ("true", "1", "yes"):
        qs = qs.filter(
            prediction__isnull=False,
            supervisor_review__isnull=False,
        ).exclude(prediction__predicted_class=F("supervisor_review__reviewed_class"))

    product_code = (request.query_params.get("product") or "").strip()
    if product_code and product_code.upper() != "ALL":
        qs = qs.filter(product__product_id__iexact=product_code)

    search = (request.query_params.get("search") or "").strip()
    if search:
        q_filter = (
            Q(original_filename__icontains=search)
            | Q(image_sha256__icontains=search)
            | Q(submitted_by__username__icontains=search)
            | Q(failure_reason__icontains=search)
        )
        if search.isdigit():
            q_filter |= Q(id=int(search)) | Q(batch_id=int(search))
        qs = qs.filter(q_filter)

    return qs


# ============================================================================
# AUTHENTICATION APIs
# ============================================================================


class AuthLoginAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = (request.data.get("username") or "").strip()
        password = request.data.get("password") or ""
        if not username or not password:
            return Response(
                {"error": "Both username and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user = authenticate(request, username=username, password=password)
        if user is None:
            return Response(
                {"error": "Invalid username or password."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        if not user.is_active:
            return Response(
                {"error": "This account is inactive."},
                status=status.HTTP_403_FORBIDDEN,
            )

        login(request, user)
        return Response(
            {
                "message": "Authenticated successfully.",
                "user": UserSummarySerializer(user).data,
                "redirect_url": get_dashboard_url_for_user(user),
            }
        )


class AuthLogoutAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return Response({"message": "Logged out successfully.", "redirect_url": "/login/"})


class AuthRegisterAPIView(APIView):
    """
    Public registration endpoint.
    Strictly creates ENGINEER accounts only. Any supplied role field is ignored/rejected
    to prevent privilege escalation.
    """

    permission_classes = [AllowAny]

    def post(self, request):
        full_name = (request.data.get("full_name") or "").strip()
        username = (request.data.get("username") or "").strip()
        email = (request.data.get("email") or "").strip()
        password = request.data.get("password") or ""
        confirm_password = request.data.get("confirm_password") or ""

        # Reject explicit attempts to self-assign elevated roles via manipulated API payload
        requested_role = (request.data.get("role") or "").strip().upper()
        if requested_role and requested_role != ROLE_ENGINEER:
            return Response(
                {
                    "error": (
                        "Privilege escalation denied: public registration creates ENGINEER accounts only. "
                        "Administrator and Supervisor accounts must be provisioned by an Administrator."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        if not username or not email or not password:
            return Response(
                {"error": "Username, email, and password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(password) < 8:
            return Response(
                {"error": "Password must be at least 8 characters long."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if confirm_password and password != confirm_password:
            return Response(
                {"error": "Passwords do not match."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if User.objects.filter(username__iexact=username).exists():
            return Response(
                {"error": f"Username '{username}' is already registered."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        name_parts = full_name.split(None, 1) if full_name else []
        first_name = name_parts[0] if len(name_parts) >= 1 else ""
        last_name = name_parts[1] if len(name_parts) >= 2 else ""

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
        )
        assign_user_role(user, ROLE_ENGINEER)
        login(request, user)

        return Response(
            {
                "message": "Engineer account created and signed in.",
                "user": UserSummarySerializer(user).data,
                "redirect_url": get_dashboard_url_for_user(user),
            },
            status=status.HTTP_201_CREATED,
        )


class AuthMeAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(
            {
                "user": UserSummarySerializer(request.user).data,
                "dashboard_url": get_dashboard_url_for_user(request.user),
            }
        )


# ============================================================================
# PRODUCTS APIs
# ============================================================================


class ProductListCreateAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        role = get_user_role(request.user)
        qs = Product.objects.all()
        if role != ROLE_ADMINISTRATOR and request.query_params.get("active_only") == "true":
            qs = qs.filter(active=True)
        return Response({"products": ProductSerializer(qs, many=True).data})

    def post(self, request):
        if get_user_role(request.user) != ROLE_ADMINISTRATOR:
            return Response(
                {"error": "Only Administrators are authorized to register or manage products."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = ProductSerializer(data=request.data)
        if serializer.is_valid():
            product = serializer.save(created_by=request.user)
            return Response(ProductSerializer(product).data, status=status.HTTP_201_CREATED)
        return Response(
            {"error": "Product validation failed.", "details": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )


class ProductDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk: int):
        product = get_object_or_404(Product, pk=pk)
        return Response(ProductSerializer(product).data)

    def patch(self, request, pk: int):
        if get_user_role(request.user) != ROLE_ADMINISTRATOR:
            return Response(
                {"error": "Only Administrators are authorized to update products."},
                status=status.HTTP_403_FORBIDDEN,
            )
        product = get_object_or_404(Product, pk=pk)
        serializer = ProductSerializer(product, data=request.data, partial=True)
        if serializer.is_valid():
            updated = serializer.save()
            return Response(ProductSerializer(updated).data)
        return Response(
            {"error": "Product update failed.", "details": serializer.errors},
            status=status.HTTP_400_BAD_REQUEST,
        )


# ============================================================================
# INSPECTIONS APIs
# ============================================================================


def _resolve_product_from_request(request) -> Product:
    product_ref = (
        request.data.get("product_id")
        or request.data.get("product")
        or "P-PLATE01"
    )
    if str(product_ref).isdigit():
        product = Product.objects.filter(pk=int(product_ref)).first()
    else:
        product = Product.objects.filter(product_id__iexact=str(product_ref).strip()).first()

    if not product:
        raise DjangoValidationError(f"Product '{product_ref}' was not found.")
    if not product.active:
        raise DjangoValidationError(f"Product '{product.product_id}' is currently inactive.")
    return product


class SingleInspectionUploadAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            product = _resolve_product_from_request(request)
        except DjangoValidationError as exc:
            return Response({"error": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)

        uploaded_file = request.FILES.get("image") or request.FILES.get("file")
        sample_name = (request.data.get("sample_name") or "").strip()

        if uploaded_file is not None:
            raw_bytes = uploaded_file.read()
            original_filename = uploaded_file.name
        elif sample_name:
            # Support loading directly from official Samples/images or Validation folder for testing
            sample_path = None
            if sample_name.startswith("Validation/"):
                candidate = (settings.BASE_DIR / sample_name).resolve()
                if str(candidate).startswith(str(settings.VALIDATION_DIR.resolve())) and candidate.exists():
                    sample_path = candidate
            else:
                clean_name = Path(sample_name).name
                candidate_sample = settings.SAMPLES_DIR / "images" / clean_name
                candidate_val = settings.VALIDATION_DIR / clean_name
                if candidate_sample.exists():
                    sample_path = candidate_sample
                elif candidate_val.exists():
                    sample_path = candidate_val
            if not sample_path or not sample_path.exists():
                return Response(
                    {"error": f"Requested pack file '{sample_name}' not found."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            raw_bytes = sample_path.read_bytes()
            original_filename = sample_path.name
        else:
            return Response(
                {"error": "No image file provided. Attach an image file under 'image'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        inspection = create_and_process_single_inspection(
            user=request.user,
            product=product,
            raw_bytes=raw_bytes,
            original_filename=original_filename,
        )
        serialized = InspectionSerializer(inspection).data
        http_code = (
            status.HTTP_201_CREATED
            if inspection.status == InspectionStatus.COMPLETED
            else status.HTTP_422_UNPROCESSABLE_ENTITY
        )
        return Response(
            {
                "inspection": serialized,
                "valid": inspection.validation_status == ValidationStatus.PASSED,
                "failure_reason": inspection.failure_reason,
            },
            status=http_code,
        )


class BatchInspectionUploadAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            product = _resolve_product_from_request(request)
        except DjangoValidationError as exc:
            return Response({"error": exc.messages[0]}, status=status.HTTP_400_BAD_REQUEST)

        uploaded_files = request.FILES.getlist("images") or request.FILES.getlist("files")
        preset_files = request.data.get("preset_files")

        files_payload = []
        if uploaded_files:
            for uf in uploaded_files:
                files_payload.append((uf.name, uf.read()))
        elif preset_files and isinstance(preset_files, list):
            for name in preset_files:
                clean = Path(str(name)).name
                cand_s = settings.SAMPLES_DIR / "images" / clean
                cand_v = settings.VALIDATION_DIR / clean
                if cand_s.exists():
                    files_payload.append((clean, cand_s.read_bytes()))
                elif cand_v.exists():
                    files_payload.append((clean, cand_v.read_bytes()))

        try:
            batch, items = create_batch_inspections(
                user=request.user,
                product=product,
                files_payload=files_payload,
            )
        except DjangoValidationError as exc:
            return Response(
                {"error": exc.messages[0] if hasattr(exc, "messages") else str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        batch_Refreshed = InspectionBatch.objects.prefetch_related(
            "items__prediction", "items__supervisor_review", "items__product", "items__submitted_by"
        ).get(pk=batch.pk)

        return Response(
            {
                "batch": InspectionBatchSerializer(batch_Refreshed).data,
                "message": f"Batch #{batch.id} created with {len(items)} item(s) and dispatched to Celery.",
            },
            status=status.HTTP_201_CREATED,
        )


class InspectionListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        reconcile_pending_and_expired_inspections()
        qs = _filter_inspections_for_user(request.user)
        qs = _apply_inspection_query_filters(request, qs)
        limit = min(int(request.query_params.get("limit", 100)), 250)
        items = list(qs[:limit])
        return Response(
            {
                "count": qs.count(),
                "inspections": InspectionSerializer(items, many=True).data,
            }
        )


class InspectionDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk: int):
        qs = _filter_inspections_for_user(request.user)
        inspection = get_object_or_404(qs, pk=pk)
        return Response({"inspection": InspectionSerializer(inspection).data})


class InspectionPassportAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk: int):
        qs = _filter_inspections_for_user(request.user)
        inspection = get_object_or_404(qs, pk=pk)
        events = InspectionEvent.objects.filter(inspection=inspection).select_related("actor")
        revisions = []
        if hasattr(inspection, "supervisor_review") and inspection.supervisor_review:
            revisions = ReviewRevisionSerializer(
                inspection.supervisor_review.revisions.select_related("reviewer").all(),
                many=True,
            ).data

        return Response(
            {
                "inspection": InspectionSerializer(inspection).data,
                "events": InspectionEventSerializer(events, many=True).data,
                "review_revisions": revisions,
                "integrity_explanation": INTEGRITY_EXPLANATION,
            }
        )


class InspectionEventsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk: int):
        qs = _filter_inspections_for_user(request.user)
        inspection = get_object_or_404(qs, pk=pk)
        events = InspectionEvent.objects.filter(inspection=inspection).select_related("actor")
        return Response({"events": InspectionEventSerializer(events, many=True).data})


class InspectionVerifyIntegrityAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk: int):
        qs = _filter_inspections_for_user(request.user)
        inspection = get_object_or_404(qs, pk=pk)
        result = verify_inspection_image_integrity(inspection, actor=request.user)
        return Response(result)


class AuthorizedInspectionImageView(APIView):
    """
    Authorized media endpoint ensuring Engineers can only view their own uploaded images,
    while Supervisors and Administrators can inspect all stored evidence images.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, pk: int):
        qs = _filter_inspections_for_user(request.user)
        inspection = get_object_or_404(qs, pk=pk)
        if not inspection.image:
            raise Http404("No image file associated with this inspection.")
        file_path = Path(inspection.image.path)
        if not file_path.exists():
            raise Http404("Image file missing on disk.")
        content_type, _ = mimetypes.guess_type(str(file_path))
        return FileResponse(open(file_path, "rb"), content_type=content_type or "application/octet-stream")


# ============================================================================
# BATCH PROCESSING APIs
# ============================================================================


class BatchListAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        reconcile_pending_and_expired_inspections()
        qs = InspectionBatch.objects.select_related("product", "submitted_by").prefetch_related(
            "items__prediction", "items__supervisor_review"
        )
        if get_user_role(request.user) == ROLE_ENGINEER:
            qs = qs.filter(submitted_by=request.user)
        batches = list(qs[:50])
        return Response({"batches": InspectionBatchSerializer(batches, many=True).data})


class BatchDetailAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk: int):
        reconcile_pending_and_expired_inspections(batch_id=pk)
        qs = InspectionBatch.objects.select_related("product", "submitted_by").prefetch_related(
            "items__prediction", "items__supervisor_review", "items__product", "items__submitted_by"
        )
        if get_user_role(request.user) == ROLE_ENGINEER:
            qs = qs.filter(submitted_by=request.user)
        batch = get_object_or_404(qs, pk=pk)
        return Response({"batch": InspectionBatchSerializer(batch).data})


class BatchProgressAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk: int):
        reconcile_pending_and_expired_inspections(batch_id=pk)
        qs = InspectionBatch.objects.select_related("product", "submitted_by").prefetch_related(
            "items__prediction", "items__supervisor_review", "items__product", "items__submitted_by"
        )
        if get_user_role(request.user) == ROLE_ENGINEER:
            qs = qs.filter(submitted_by=request.user)
        batch = get_object_or_404(qs, pk=pk)
        data = InspectionBatchSerializer(batch).data
        return Response(
            {
                "batch_id": batch.id,
                "status": batch.status,
                "total_items": batch.total_items,
                "completed_items": batch.completed_items,
                "failed_items": batch.failed_items,
                "progress_percent": data["progress_percent"],
                "items": data["items"],
            }
        )


# ============================================================================
# SUPERVISOR REVIEW APIs
# ============================================================================


class ReviewQueueAPIView(APIView):
    """
    Threshold-aware review queue sorted by abs(defect_probability - 0.5) ascending.
    This prioritizes predictions closest to the 0.5 decision boundary.
    """

    permission_classes = [IsSupervisorOrAdministrator]

    def get(self, request):
        include_reviewed = request.query_params.get("include_reviewed", "false").lower() == "true"
        qs = (
            Inspection.objects.filter(
                status=InspectionStatus.COMPLETED,
                prediction__isnull=False,
            )
            .select_related(
                "product",
                "submitted_by",
                "prediction",
                "supervisor_review",
                "supervisor_review__reviewer",
            )
            .annotate(
                boundary_distance=Abs(
                    F("prediction__defect_probability") - Value(0.5),
                    output_field=FloatField(),
                )
            )
            .order_by("boundary_distance", "-created_at")
        )
        if not include_reviewed:
            qs = qs.filter(supervisor_review__isnull=True)

        items = list(qs[:100])
        return Response(
            {
                "queue_heuristic": "abs(defect_probability - 0.5) ascending",
                "heuristic_note": (
                    "Prioritizes inspections closest to the 0.5 decision threshold. "
                    "This is a review prioritization heuristic, not calibrated uncertainty."
                ),
                "count": len(items),
                "queue": InspectionSerializer(items, many=True).data,
            }
        )


class SupervisorReviewDetailSubmitAPIView(APIView):
    """
    GET: View review details for an inspection.
    POST: Confirm or correct a completed inspection's prediction.
    Strictly enforces IsSupervisor on POST: Engineers receive HTTP 403 Forbidden.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request, inspection_id: int):
        qs = _filter_inspections_for_user(request.user)
        inspection = get_object_or_404(qs, pk=inspection_id)
        review = getattr(inspection, "supervisor_review", None)
        return Response(
            {
                "inspection_id": inspection.id,
                "original_prediction": (
                    InspectionSerializer(inspection).data.get("prediction")
                ),
                "supervisor_review": (
                    SupervisorReviewSerializer(review).data if review else None
                ),
            }
        )

    def post(self, request, inspection_id: int):
        if get_user_role(request.user) != ROLE_SUPERVISOR:
            return Response(
                {
                    "error": (
                        "Forbidden: Only Supervisors are authorized to confirm or correct predictions. "
                        "Engineers cannot review inspection results."
                    )
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        reviewed_class = request.data.get("reviewed_class") or ""
        comment = request.data.get("comment") or ""

        try:
            review = submit_supervisor_review(
                inspection_id=inspection_id,
                reviewer=request.user,
                reviewed_class=reviewed_class,
                comment=comment,
            )
        except Inspection.DoesNotExist:
            return Response(
                {"error": f"Inspection #{inspection_id} not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        except PermissionDenied as exc:
            return Response({"error": str(exc)}, status=status.HTTP_403_FORBIDDEN)
        except DjangoValidationError as exc:
            return Response(
                {"error": exc.messages[0] if hasattr(exc, "messages") else str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        inspection = _filter_inspections_for_user(request.user).get(pk=inspection_id)
        return Response(
            {
                "message": f"Review saved ({review.review_status}). Original AI prediction remains unchanged.",
                "inspection": InspectionSerializer(inspection).data,
                "supervisor_review": SupervisorReviewSerializer(review).data,
            }
        )


class ReviewHistoryAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, inspection_id: int):
        qs = _filter_inspections_for_user(request.user)
        inspection = get_object_or_404(qs, pk=inspection_id)
        review = getattr(inspection, "supervisor_review", None)
        revisions = (
            ReviewRevisionSerializer(
                review.revisions.select_related("reviewer").all(), many=True
            ).data
            if review
            else []
        )
        return Response(
            {
                "inspection_id": inspection.id,
                "original_prediction": InspectionSerializer(inspection).data.get("prediction"),
                "current_review": SupervisorReviewSerializer(review).data if review else None,
                "revisions": revisions,
            }
        )


# ============================================================================
# ANALYTICS APIs
# ============================================================================


class AdminAnalyticsAPIView(APIView):
    permission_classes = [IsAdministrator]

    def get(self, request):
        total_inspections = Inspection.objects.count()
        completed_inspections = Inspection.objects.filter(status=InspectionStatus.COMPLETED).count()
        failed_inspections = Inspection.objects.filter(status=InspectionStatus.FAILED).count()
        queued_or_processing = Inspection.objects.filter(
            status__in=[InspectionStatus.QUEUED, InspectionStatus.PROCESSING]
        ).count()
        total_batches = InspectionBatch.objects.count()

        normal_predictions = PredictionResult.objects.filter(
            predicted_class=PredictedClass.NORMAL
        ).count()
        defective_predictions = PredictionResult.objects.filter(
            predicted_class=PredictedClass.DEFECTIVE
        ).count()

        pending_reviews = Inspection.objects.filter(
            status=InspectionStatus.COMPLETED, supervisor_review__isnull=True
        ).count()
        confirmed_reviews = SupervisorReview.objects.filter(
            review_status=ReviewStatus.CONFIRMED
        ).count()
        corrected_reviews = SupervisorReview.objects.filter(
            review_status=ReviewStatus.CORRECTED
        ).count()

        users = User.objects.prefetch_related("groups").all()
        engineers_count = sum(1 for u in users if get_user_role(u) == ROLE_ENGINEER)
        supervisors_count = sum(1 for u in users if get_user_role(u) == ROLE_SUPERVISOR)
        admins_count = sum(1 for u in users if get_user_role(u) == ROLE_ADMINISTRATOR)

        recent_events = InspectionEvent.objects.select_related("actor", "inspection")[:20]

        return Response(
            {
                "kpis": {
                    "total_inspections": total_inspections,
                    "completed_inspections": completed_inspections,
                    "failed_inspections": failed_inspections,
                    "queued_or_processing": queued_or_processing,
                    "total_batches": total_batches,
                    "normal_predictions": normal_predictions,
                    "defective_predictions": defective_predictions,
                    "pending_supervisor_reviews": pending_reviews,
                    "confirmed_reviews": confirmed_reviews,
                    "corrected_reviews": corrected_reviews,
                    "registered_engineers": engineers_count,
                    "registered_supervisors": supervisors_count,
                    "registered_administrators": admins_count,
                },
                "recent_events": InspectionEventSerializer(recent_events, many=True).data,
            }
        )


class EngineerAnalyticsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        my_qs = Inspection.objects.filter(submitted_by=request.user)
        total = my_qs.count()
        completed = my_qs.filter(status=InspectionStatus.COMPLETED).count()
        failed = my_qs.filter(status=InspectionStatus.FAILED).count()
        normal = my_qs.filter(prediction__predicted_class=PredictedClass.NORMAL).count()
        defective = my_qs.filter(prediction__predicted_class=PredictedClass.DEFECTIVE).count()
        batches = InspectionBatch.objects.filter(submitted_by=request.user).count()
        reviewed = my_qs.filter(supervisor_review__isnull=False).count()
        completion_rate = round((completed / total) * 100.0, 1) if total > 0 else 0.0

        return Response(
            {
                "kpis": {
                    "personal_inspections": total,
                    "completed_inspections": completed,
                    "failed_inspections": failed,
                    "completion_rate_percent": completion_rate,
                    "normal_predictions": normal,
                    "defective_predictions": defective,
                    "personal_batches": batches,
                    "supervisor_reviewed_count": reviewed,
                }
            }
        )


class SupervisorAnalyticsAPIView(APIView):
    permission_classes = [IsSupervisorOrAdministrator]

    def get(self, request):
        total = Inspection.objects.count()
        completed = Inspection.objects.filter(status=InspectionStatus.COMPLETED).count()
        pending_reviews = Inspection.objects.filter(
            status=InspectionStatus.COMPLETED, supervisor_review__isnull=True
        ).count()
        confirmed = SupervisorReview.objects.filter(review_status=ReviewStatus.CONFIRMED).count()
        corrected = SupervisorReview.objects.filter(review_status=ReviewStatus.CORRECTED).count()
        disagreements = (
            Inspection.objects.filter(
                prediction__isnull=False,
                supervisor_review__isnull=False,
            )
            .exclude(prediction__predicted_class=F("supervisor_review__reviewed_class"))
            .count()
        )

        return Response(
            {
                "kpis": {
                    "total_inspections": total,
                    "completed_inspections": completed,
                    "pending_reviews": pending_reviews,
                    "confirmed_predictions": confirmed,
                    "corrected_predictions": corrected,
                    "human_ai_disagreement_count": disagreements,
                },
                "disagreement_note": (
                    "Human-AI disagreement reflects cases where a supervisor recorded a reviewed class "
                    "different from the immutable original AI output. Disagreement is tracked for quality "
                    "accountability and is not automatically labeled as model error."
                ),
            }
        )


# ============================================================================
# MODEL STATUS & 60-SAMPLE EVALUATION APIs
# ============================================================================


class ModelStatusAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        integrity = verify_model_integrity()
        return Response(integrity)


class ModelEvaluationAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        force_refresh = request.query_params.get("refresh", "false").lower() == "true"
        latest_meta = ModelMetadata.objects.first()
        if latest_meta and latest_meta.evaluation_data and not force_refresh:
            return Response(latest_meta.evaluation_data)

        eval_data = evaluate_supplied_60_samples()
        integrity = verify_model_integrity()
        ModelMetadata.objects.create(
            model_version=integrity["model_version"],
            model_file_hash=integrity["files"]["classifier.npz"]["actual_sha256"] or "",
            inference_file_hash=integrity["files"]["inference.py"]["actual_sha256"] or "",
            metadata_file_hash=integrity["files"]["model_metadata.json"]["actual_sha256"] or "",
            decision_threshold=integrity["decision_threshold"],
            model_status=integrity["status"],
            evaluation_data=eval_data,
        )
        return Response(eval_data)


# ============================================================================
# ADMIN USER MANAGEMENT API
# ============================================================================


class AdminUserManagementAPIView(APIView):
    permission_classes = [IsAdministrator]

    def get(self, request):
        users = User.objects.prefetch_related("groups").order_by("id")
        return Response({"users": UserSummarySerializer(users, many=True).data})

    def post(self, request):
        username = (request.data.get("username") or "").strip()
        email = (request.data.get("email") or "").strip()
        password = request.data.get("password") or ""
        full_name = (request.data.get("full_name") or "").strip()
        role = (request.data.get("role") or ROLE_ENGINEER).strip().upper()

        if role not in ALL_ROLES:
            return Response(
                {"error": f"Invalid role '{role}'. Allowed roles: {', '.join(ALL_ROLES)}."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not username or not password or len(password) < 8:
            return Response(
                {"error": "Username and a password of at least 8 characters are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if User.objects.filter(username__iexact=username).exists():
            return Response(
                {"error": f"User '{username}' already exists."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        parts = full_name.split(None, 1) if full_name else []
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
            first_name=parts[0] if len(parts) >= 1 else "",
            last_name=parts[1] if len(parts) >= 2 else "",
        )
        assign_user_role(user, role)
        return Response(
            {
                "message": f"Provisioned {role} account '{username}'.",
                "user": UserSummarySerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )
