"""Management command to initialize SPECTRΛ roles, users, P-PLATE01 product, model metadata, and initial real inspections."""
from django.conf import settings
from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from apps.accounts.roles import (
    ROLE_ADMINISTRATOR,
    ROLE_ENGINEER,
    ROLE_SUPERVISOR,
    assign_user_role,
    ensure_role_groups,
)
from apps.batch_processing.models import BatchStatus, InspectionBatch
from apps.inspections.models import Inspection
from apps.model_evaluation.models import ModelMetadata
from apps.products.models import Product
from services.inspection_lifecycle import (
    create_and_process_single_inspection,
    execute_inspection_item_task,
    recalculate_batch_status,
    submit_supervisor_review,
)
from services.model_integrity import evaluate_supplied_60_samples, verify_model_integrity


class Command(BaseCommand):
    help = "Idempotently seed SPECTRΛ groups, default role accounts, P-PLATE01 product, model metadata, and initial inspections."

    def handle(self, *args, **options):
        self.stdout.write("1. Ensuring Django role groups (ADMINISTRATOR, ENGINEER, SUPERVISOR)...")
        ensure_role_groups()

        # Provision default role accounts idempotently
        accounts_spec = [
            ("admin", "admin@spectra-qa.io", "SpectraAdmin2026!", "Elena", "Vance", ROLE_ADMINISTRATOR, True),
            ("supervisor", "supervisor@spectra-qa.io", "SpectraSuper2026!", "Marcus", "Sterling", ROLE_SUPERVISOR, False),
            ("engineer", "engineer@spectra-qa.io", "SpectraEng2026!", "Arjun", "Mehta", ROLE_ENGINEER, False),
        ]

        created_users = {}
        for username, email, pwd, first, last, role, is_super in accounts_spec:
            user = User.objects.filter(username=username).first()
            if not user:
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=pwd,
                    first_name=first,
                    last_name=last,
                )
                if is_super:
                    user.is_superuser = True
                    user.is_staff = True
                    user.save()
                self.stdout.write(f"   Created user '{username}' ({role})")
            assign_user_role(user, role)
            created_users[role] = user

        # Detect existing P-PLATE01 before seeding — never create duplicates
        self.stdout.write("2. Checking product P-PLATE01...")
        product = Product.objects.filter(product_id__iexact="P-PLATE01").first()
        if not product:
            product = Product.objects.create(
                product_id="P-PLATE01",
                name="Demonstration Metal Plate",
                description="Synthetic centered plate with scratches or pits",
                active=True,
                created_by=created_users[ROLE_ADMINISTRATOR],
            )
            self.stdout.write("   Registered product P-PLATE01 — Demonstration Metal Plate")
        else:
            self.stdout.write(f"   Existing product detected: {product.product_id} — {product.name}")

        # Verify model integrity and seed 60-sample evaluation cache
        self.stdout.write("3. Verifying supplied model SHA-256 hashes and running 60-sample evaluation...")
        integrity = verify_model_integrity()
        if not ModelMetadata.objects.exists():
            eval_data = evaluate_supplied_60_samples()
            ModelMetadata.objects.create(
                model_version=integrity["model_version"],
                model_file_hash=integrity["files"]["classifier.npz"]["actual_sha256"] or "",
                inference_file_hash=integrity["files"]["inference.py"]["actual_sha256"] or "",
                metadata_file_hash=integrity["files"]["model_metadata.json"]["actual_sha256"] or "",
                decision_threshold=integrity["decision_threshold"],
                model_status=integrity["status"],
                evaluation_data=eval_data,
            )
            self.stdout.write(
                f"   Verified {integrity['model_version']} (TP={eval_data['true_positive']}, "
                f"TN={eval_data['true_negative']}, FP={eval_data['false_positive']}, FN={eval_data['false_negative']})"
            )

        # Seed initial real inspections if database has none yet
        if Inspection.objects.count() == 0:
            self.stdout.write("4. Seeding initial real inspections using supplied Model/inference.py...")
            eng_user = created_users[ROLE_ENGINEER]
            sup_user = created_users[ROLE_SUPERVISOR]

            single_samples = [
                ("inspection_001.png", settings.SAMPLES_DIR / "images" / "inspection_001.png"),
                ("inspection_002.jpg", settings.SAMPLES_DIR / "images" / "inspection_002.jpg"),
                ("inspection_003.png", settings.SAMPLES_DIR / "images" / "inspection_003.png"),
            ]
            seeded_inspections = []
            for fname, fpath in single_samples:
                if fpath.exists():
                    ins = create_and_process_single_inspection(
                        user=eng_user,
                        product=product,
                        raw_bytes=fpath.read_bytes(),
                        original_filename=fname,
                    )
                    seeded_inspections.append(ins)

            # Also seed one invalid upload to demonstrate failed validation persistence
            invalid_path = settings.VALIDATION_DIR / "not_an_image.jpg"
            if invalid_path.exists():
                create_and_process_single_inspection(
                    user=eng_user,
                    product=product,
                    raw_bytes=invalid_path.read_bytes(),
                    original_filename="not_an_image.jpg",
                )

            # Seed one mixed batch (3 valid + 1 invalid too_small.png) processed through the lifecycle
            batch_files = [
                ("inspection_004.jpg", settings.SAMPLES_DIR / "images" / "inspection_004.jpg"),
                ("inspection_005.png", settings.SAMPLES_DIR / "images" / "inspection_005.png"),
                ("inspection_006.jpg", settings.SAMPLES_DIR / "images" / "inspection_006.jpg"),
                ("too_small.png", settings.VALIDATION_DIR / "too_small.png"),
            ]
            valid_batch_files = [(n, p.read_bytes()) for n, p in batch_files if p.exists()]
            if valid_batch_files:
                from django.core.files.base import ContentFile
                from apps.audit.models import InspectionEvent
                from apps.inspections.models import InspectionStatus, ValidationStatus
                from services.inspection_lifecycle import _safe_storage_filename
                import hashlib

                batch = InspectionBatch.objects.create(
                    submitted_by=eng_user,
                    product=product,
                    status=BatchStatus.QUEUED,
                    total_items=len(valid_batch_files),
                )
                for fname, rbytes in valid_batch_files:
                    sha = hashlib.sha256(rbytes).hexdigest()
                    item = Inspection(
                        batch=batch,
                        product=product,
                        submitted_by=eng_user,
                        original_filename=fname,
                        file_size=len(rbytes),
                        image_sha256=sha,
                        status=InspectionStatus.QUEUED,
                        validation_status=ValidationStatus.PENDING,
                    )
                    item.image.save(_safe_storage_filename(fname), ContentFile(rbytes), save=False)
                    item.save()
                    InspectionEvent.objects.create(
                        inspection=item,
                        actor=eng_user,
                        event_type="BATCH_ITEM_QUEUED",
                        description=f"Queued in Batch #{batch.id} ({fname}, {len(rbytes)} bytes).",
                        metadata={"batch_id": batch.id, "original_filename": fname},
                    )
                    execute_inspection_item_task(item.id)
                recalculate_batch_status(batch.id)

        # Ensure initial supervisor reviews exist if none have been recorded yet
        from apps.reviews.models import SupervisorReview
        from apps.inspections.models import InspectionStatus

        if SupervisorReview.objects.count() == 0:
            sup_user = created_users[ROLE_SUPERVISOR]
            completed_ins = list(
                Inspection.objects.filter(
                    status=InspectionStatus.COMPLETED, prediction__isnull=False
                )
                .select_related("prediction")
                .order_by("id")[:2]
            )
            if len(completed_ins) >= 2:
                submit_supervisor_review(
                    inspection_id=completed_ins[0].id,
                    reviewer=sup_user,
                    reviewed_class=completed_ins[0].prediction.predicted_class,
                    comment="Surface defect verified under high-contrast optical inspection. AI classification confirmed.",
                )
                opposite_class = (
                    "Defective"
                    if completed_ins[1].prediction.predicted_class == "Normal"
                    else "Normal"
                )
                submit_supervisor_review(
                    inspection_id=completed_ins[1].id,
                    reviewer=sup_user,
                    reviewed_class=opposite_class,
                    comment="Micro-pit near edge requires secondary QA hold despite nominal center reflectance.",
                )

        self.stdout.write(self.style.SUCCESS("SPECTRΛ database initialization complete."))
