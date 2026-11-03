"""Django template views for SPECTRΛ role dashboards, authentication, and Evidence Passport."""
import mimetypes
from pathlib import Path

from django.conf import settings
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.models import User
from django.http import FileResponse, Http404, HttpResponseForbidden
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_POST

from apps.accounts.roles import (
    ROLE_ADMINISTRATOR,
    ROLE_ENGINEER,
    ROLE_SUPERVISOR,
    get_dashboard_url_for_user,
    get_user_role,
)
from apps.audit.models import InspectionEvent
from apps.batch_processing.models import InspectionBatch
from apps.inspections.models import Inspection
from apps.model_evaluation.models import ModelMetadata
from apps.products.models import Product
from services.evidence_verification import INTEGRITY_EXPLANATION
from services.model_integrity import evaluate_supplied_60_samples, verify_model_integrity


def _base_context(request, active_nav: str = ""):
    role = get_user_role(request.user) if request.user.is_authenticated else ""
    products = list(Product.objects.filter(active=True).order_by("product_id"))
    all_products = list(Product.objects.all().order_by("product_id"))
    return {
        "current_user": request.user,
        "user_role": role,
        "active_nav": active_nav,
        "active_products": products,
        "all_products": all_products,
        "dashboard_url": get_dashboard_url_for_user(request.user) if request.user.is_authenticated else "/login/",
    }


@ensure_csrf_cookie
def root_redirect_view(request):
    """Redirect authenticated users to their role dashboard, or support ?demo_role= / ?autostart=1."""
    demo_role = (request.GET.get("demo_role") or "").strip().lower()
    autostart = (request.GET.get("autostart") or "").strip() == "1"

    if demo_role in ("admin", "administrator"):
        user = User.objects.filter(username="admin").first()
        if user:
            login(request, user, backend="django.contrib.auth.backends.ModelBackend")
            return redirect("/admin-console/")
    elif demo_role == "supervisor":
        user = User.objects.filter(username="supervisor").first()
        if user:
            login(request, user, backend="django.contrib.auth.backends.ModelBackend")
            return redirect("/supervisor/")
    elif demo_role == "engineer" or (autostart and not request.user.is_authenticated):
        user = User.objects.filter(username="engineer").first()
        if user:
            login(request, user, backend="django.contrib.auth.backends.ModelBackend")
            return redirect("/engineer/")

    if request.user.is_authenticated:
        return redirect(get_dashboard_url_for_user(request.user))
    return redirect("/login/")


@ensure_csrf_cookie
def login_register_view(request):
    """Render the premium SPECTRΛ Sign In / Register screen."""
    if request.user.is_authenticated and request.GET.get("switch") != "1":
        return redirect(get_dashboard_url_for_user(request.user))
    ctx = _base_context(request, active_nav="auth")
    return render(request, "auth/login.html", ctx)


@require_POST
def logout_view(request):
    logout(request)
    return redirect("/login/")


@login_required
@ensure_csrf_cookie
def admin_control_room_view(request):
    """Administrator — Control Room dashboard."""
    role = get_user_role(request.user)
    if role != ROLE_ADMINISTRATOR:
        return HttpResponseForbidden(
            "403 Forbidden: Administrator privileges are required to access the Control Room."
        )
    ctx = _base_context(request, active_nav="admin")
    ctx["model_integrity"] = verify_model_integrity()
    return render(request, "admin/control_room.html", ctx)


@login_required
@ensure_csrf_cookie
def engineer_console_view(request):
    """Engineer — Inspection Console dashboard."""
    role = get_user_role(request.user)
    if role not in (ROLE_ENGINEER, ROLE_ADMINISTRATOR):
        return redirect(get_dashboard_url_for_user(request.user))
    ctx = _base_context(request, active_nav="engineer")
    return render(request, "engineer/inspection_console.html", ctx)


@login_required
@ensure_csrf_cookie
def supervisor_desk_view(request):
    """Supervisor — Assurance Desk dashboard."""
    role = get_user_role(request.user)
    if role not in (ROLE_SUPERVISOR, ROLE_ADMINISTRATOR):
        return HttpResponseForbidden(
            "403 Forbidden: Supervisor privileges are required to access the Assurance Desk."
        )
    ctx = _base_context(request, active_nav="supervisor")
    return render(request, "supervisor/assurance_desk.html", ctx)


@login_required
@ensure_csrf_cookie
def evidence_passport_view(request, pk: int):
    """Dedicated Evidence Passport view for a single inspection."""
    role = get_user_role(request.user)
    qs = Inspection.objects.select_related(
        "product",
        "submitted_by",
        "batch",
        "prediction",
        "supervisor_review",
        "supervisor_review__reviewer",
    ).prefetch_related("supervisor_review__revisions__reviewer")

    if role == ROLE_ENGINEER:
        qs = qs.filter(submitted_by=request.user)

    inspection = get_object_or_404(qs, pk=pk)
    events = list(InspectionEvent.objects.filter(inspection=inspection).select_related("actor"))
    revisions = (
        list(inspection.supervisor_review.revisions.select_related("reviewer").all())
        if hasattr(inspection, "supervisor_review") and inspection.supervisor_review
        else []
    )

    ctx = _base_context(request, active_nav="passport")
    ctx.update(
        {
            "inspection": inspection,
            "events": events,
            "revisions": revisions,
            "integrity_explanation": INTEGRITY_EXPLANATION,
            "can_review": role == ROLE_SUPERVISOR and inspection.status == "COMPLETED",
        }
    )
    return render(request, "passport/evidence_passport.html", ctx)


@login_required
@ensure_csrf_cookie
def model_evaluation_view(request):
    """Dedicated 60-sample Synthetic Development Dataset Evaluation & Model Integrity view."""
    latest_meta = ModelMetadata.objects.first()
    if latest_meta and latest_meta.evaluation_data:
        eval_data = latest_meta.evaluation_data
    else:
        eval_data = evaluate_supplied_60_samples()
    integrity = verify_model_integrity()

    ctx = _base_context(request, active_nav="evaluation")
    ctx.update(
        {
            "eval_data": eval_data,
            "model_integrity": integrity,
        }
    )
    return render(request, "admin/model_evaluation.html", ctx)


@login_required
def pack_sample_preview_view(request, filename: str):
    """Serve sample image previews from the official Samples/images folder for authenticated users."""
    clean_name = Path(filename).name
    img_path = settings.SAMPLES_DIR / "images" / clean_name
    if not img_path.exists():
        raise Http404("Sample image not found.")
    content_type, _ = mimetypes.guess_type(str(img_path))
    return FileResponse(open(img_path, "rb"), content_type=content_type or "image/png")
