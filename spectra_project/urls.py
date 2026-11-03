"""URL configuration for spectra_project."""
from django.contrib import admin
from django.urls import path

from apps.inspections import api_views, web_views

urlpatterns = [
    # Django Built-In Admin
    path("django-admin/", admin.site.urls),
    # Web Application Routes (Django Templates + Bootstrap 5 + Vanilla JS)
    path("", web_views.root_redirect_view, name="root"),
    path("login/", web_views.login_register_view, name="login"),
    path("logout/", web_views.logout_view, name="logout"),
    path("admin-console/", web_views.admin_control_room_view, name="admin_control_room"),
    path("engineer/", web_views.engineer_console_view, name="engineer_console"),
    path("supervisor/", web_views.supervisor_desk_view, name="supervisor_desk"),
    path(
        "inspections/<int:pk>/passport/",
        web_views.evidence_passport_view,
        name="evidence_passport",
    ),
    path("model-evaluation/", web_views.model_evaluation_view, name="model_evaluation"),
    path(
        "samples/preview/<str:filename>/",
        web_views.pack_sample_preview_view,
        name="sample_preview",
    ),
    # REST API v1 — Authentication
    path("api/v1/auth/login/", api_views.AuthLoginAPIView.as_view(), name="api_auth_login"),
    path("api/v1/auth/logout/", api_views.AuthLogoutAPIView.as_view(), name="api_auth_logout"),
    path(
        "api/v1/auth/register/",
        api_views.AuthRegisterAPIView.as_view(),
        name="api_auth_register",
    ),
    path("api/v1/auth/me/", api_views.AuthMeAPIView.as_view(), name="api_auth_me"),
    # REST API v1 — Products
    path(
        "api/v1/products/",
        api_views.ProductListCreateAPIView.as_view(),
        name="api_products_list_create",
    ),
    path(
        "api/v1/products/<int:pk>/",
        api_views.ProductDetailAPIView.as_view(),
        name="api_products_detail",
    ),
    # REST API v1 — Inspections & Evidence Passport
    path(
        "api/v1/inspections/single/",
        api_views.SingleInspectionUploadAPIView.as_view(),
        name="api_inspections_single",
    ),
    path(
        "api/v1/inspections/batch/",
        api_views.BatchInspectionUploadAPIView.as_view(),
        name="api_inspections_batch",
    ),
    path(
        "api/v1/inspections/",
        api_views.InspectionListAPIView.as_view(),
        name="api_inspections_list",
    ),
    path(
        "api/v1/inspections/<int:pk>/",
        api_views.InspectionDetailAPIView.as_view(),
        name="api_inspections_detail",
    ),
    path(
        "api/v1/inspections/<int:pk>/image/",
        api_views.AuthorizedInspectionImageView.as_view(),
        name="api_inspections_image",
    ),
    path(
        "api/v1/inspections/<int:pk>/passport/",
        api_views.InspectionPassportAPIView.as_view(),
        name="api_inspections_passport",
    ),
    path(
        "api/v1/inspections/<int:pk>/events/",
        api_views.InspectionEventsAPIView.as_view(),
        name="api_inspections_events",
    ),
    path(
        "api/v1/inspections/<int:pk>/verify-integrity/",
        api_views.InspectionVerifyIntegrityAPIView.as_view(),
        name="api_inspections_verify_integrity",
    ),
    # REST API v1 — Batch Processing
    path("api/v1/batches/", api_views.BatchListAPIView.as_view(), name="api_batches_list"),
    path(
        "api/v1/batches/<int:pk>/",
        api_views.BatchDetailAPIView.as_view(),
        name="api_batches_detail",
    ),
    path(
        "api/v1/batches/<int:pk>/progress/",
        api_views.BatchProgressAPIView.as_view(),
        name="api_batches_progress",
    ),
    # REST API v1 — Supervisor Reviews
    path(
        "api/v1/reviews/queue/",
        api_views.ReviewQueueAPIView.as_view(),
        name="api_reviews_queue",
    ),
    path(
        "api/v1/reviews/<int:inspection_id>/",
        api_views.SupervisorReviewDetailSubmitAPIView.as_view(),
        name="api_reviews_detail_submit",
    ),
    path(
        "api/v1/reviews/<int:inspection_id>/history/",
        api_views.ReviewHistoryAPIView.as_view(),
        name="api_reviews_history",
    ),
    # REST API v1 — Analytics
    path(
        "api/v1/analytics/admin/",
        api_views.AdminAnalyticsAPIView.as_view(),
        name="api_analytics_admin",
    ),
    path(
        "api/v1/analytics/engineer/",
        api_views.EngineerAnalyticsAPIView.as_view(),
        name="api_analytics_engineer",
    ),
    path(
        "api/v1/analytics/supervisor/",
        api_views.SupervisorAnalyticsAPIView.as_view(),
        name="api_analytics_supervisor",
    ),
    # REST API v1 — Model Status & Evaluation
    path(
        "api/v1/model/status/",
        api_views.ModelStatusAPIView.as_view(),
        name="api_model_status",
    ),
    path(
        "api/v1/model/evaluation/",
        api_views.ModelEvaluationAPIView.as_view(),
        name="api_model_evaluation",
    ),
    # REST API v1 — Admin User Management
    path(
        "api/v1/users/",
        api_views.AdminUserManagementAPIView.as_view(),
        name="api_users_list_create",
    ),
]
