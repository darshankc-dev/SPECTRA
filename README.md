# SPECTRΛ — AI Visual Quality Assurance & Evidence Platform

🌐 **Live Deployment**: [https://spectr-ai-visual-quality-assurance-evidence-platf.ai.studio](https://spectr-ai-visual-quality-assurance-evidence-platf.ai.studio)

**SPECTRΛ** is a full-stack visual quality inspection and evidence management platform built with AI Optical Damage Detection, SOP Retrieval-Augmented Generation (RAG), and SPECTRΛ EvidenceTrace™ PDF Traceability.

---

## 1. Architecture & Technology Stack

- **Backend**: Python 3, Django (`spectra_project`), Django REST Framework, Django Session Authentication, Django Groups & Permissions (`ADMINISTRATOR`, `ENGINEER`, `SUPERVISOR`).
- **Database**: PostgreSQL (`spectra_db`) via `psycopg[binary]` (Psycopg 3). PostgreSQL is the sole configured database engine; no SQLite fallback exists.
- **Background Processing**: Celery (`spectra_project.celery`) + Redis (`redis://127.0.0.1:6379/0`) with atomic inspection claiming (`select_for_update()`), `processing_token` fencing, lease expiration recovery, and `transaction.on_commit()` task dispatch.
- **Computer Vision Engine**: Supplied frozen logistic regression classifier `BIT-PLATE-CV-1.0` (`Model/inference.py` and `Model/classifier.npz`) verified against SHA-256 checksums before execution.
- **Frontend**: Server-rendered Django Templates (`templates/`), Bootstrap 5.3, Bootstrap Icons, Chart.js, and Vanilla JavaScript (`static/js/spectra.js`, `static/css/spectra.css`).

### Directory Structure

```text
spectra/
├── manage.py
├── requirements.txt
├── .env.example
├── README.md
├── IMPLEMENTATION_REPORT.md
├── spectra_project/
│   ├── __init__.py
│   ├── settings.py
│   ├── urls.py
│   ├── wsgi.py
│   ├── asgi.py
│   └── celery.py
├── apps/
│   ├── accounts/          # Role groups (ADMINISTRATOR, ENGINEER, SUPERVISOR) & seed_spectra command
│   ├── products/          # Product model (P-PLATE01 — Demonstration Metal Plate)
│   ├── inspections/       # Inspection & immutable PredictionResult models, REST APIs & web views
│   ├── reviews/           # SupervisorReview & append-only ReviewRevision models
│   ├── batch_processing/  # InspectionBatch model & Celery worker task
│   ├── audit/             # Append-only InspectionEvent audit trail
│   └── model_evaluation/  # ModelMetadata & 60-sample evaluation cache
├── services/
│   ├── image_validation.py       # 12-step Pillow validation before inference
│   ├── inference_adapter.py      # SHA-256 verified wrapper around Model/inference.py
│   ├── inspection_lifecycle.py   # Single sync, batch async, atomic claiming & supervisor reviews
│   ├── task_dispatch.py          # transaction.on_commit() dispatch & expired lease recovery
│   ├── evidence_verification.py  # Evidence Passport SHA-256 recomputation (MATCH / MISMATCH)
│   └── model_integrity.py        # SHA-256 verification & 60-sample evaluation engine
├── templates/
│   ├── base.html
│   ├── auth/login.html
│   ├── admin/control_room.html
│   ├── admin/model_evaluation.html
│   ├── engineer/inspection_console.html
│   ├── supervisor/assurance_desk.html
│   └── passport/evidence_passport.html
├── static/
│   ├── css/spectra.css
│   └── js/spectra.js
├── Model/                 # Unmodified classifier.npz, inference.py, model_metadata.json
├── Samples/               # 60 labeled synthetic images & labels.csv
├── Validation/            # Intentional invalid test files (not_an_image.jpg, corrupt_image.png, too_small.png)
└── tests/
    └── test_spectra_suite.py     # 25 automated PostgreSQL tests
```

---

## 2. Windows PowerShell Execution Instructions

Follow these exact steps in **Windows PowerShell** from the project root folder:

### Step 1: Open the Project Folder & Create Virtual Environment
```powershell
cd $PSScriptRoot
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### Step 2: Install Dependencies
```powershell
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### Step 3: Configure `.env`
Copy `.env.example` to `.env` and set your local PostgreSQL credentials:
```powershell
Copy-Item .env.example .env
```
Edit `.env`:
```ini
DEBUG=True
SECRET_KEY=spectra-local-dev-secret-key-2026
ALLOWED_HOSTS=localhost,127.0.0.1
DB_NAME=spectra_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432
REDIS_URL=redis://127.0.0.1:6379/0
```

### Step 4: Create the PostgreSQL Database (`spectra_db`) if Not Present
```powershell
psql -U postgres -h localhost -p 5432 -tc "SELECT 1 FROM pg_database WHERE datname = 'spectra_db'" | Select-String -Quiet "1"
if (-not $?) {
    createdb -U postgres -h localhost -p 5432 spectra_db
}
```

### Step 5: Run System Check, Apply Migrations & Seed Official Data
```powershell
python manage.py check
python manage.py makemigrations
python manage.py migrate
python manage.py seed_spectra
```
*(Note: `python manage.py seed_spectra` detects existing `P-PLATE01` records without creating duplicates, verifies model SHA-256 hashes, and provisions default role accounts: `admin` / `SpectraAdmin2026!`, `supervisor` / `SpectraSuper2026!`, `engineer` / `SpectraEng2026!`. You can also create an additional superuser via `python manage.py createsuperuser`.)*

### Step 6: Start Redis, Celery Worker (Windows `--pool=solo`), and Django Server
Open three PowerShell terminals in the activated `.venv`:

**Terminal 1 — Redis Server** (via Memurai/Redis for Windows or WSL2):
```powershell
redis-server
```

**Terminal 2 — Celery Worker** (Windows development requires `--pool=solo` because `prefork` is not supported on native Windows):
```powershell
.\.venv\Scripts\Activate.ps1
celery -A spectra_project worker --pool=solo -l info
```

**Terminal 3 — Django Application Server**:
```powershell
.\.venv\Scripts\Activate.ps1
python manage.py runserver 127.0.0.1:8000
```

### Step 7: Open the Web Application
Open `http://127.0.0.1:8000/` in your browser:
- Sign In / Register: `http://127.0.0.1:8000/login/`
- Administrator Control Room: `http://127.0.0.1:8000/admin-console/`
- Engineer Inspection Console: `http://127.0.0.1:8000/engineer/`
- Supervisor Assurance Desk: `http://127.0.0.1:8000/supervisor/`
- 60-Sample Model Evaluation: `http://127.0.0.1:8000/model-evaluation/`

### Step 8: Run the 25 Automated PostgreSQL Tests
```powershell
python manage.py test tests --verbosity=2
```

---

## 3. Role Descriptions & Security Model

1. **ADMINISTRATOR (`admin` / `SpectraAdmin2026!`)**:
   - Registers and manages supported products (`P-PLATE01 — Demonstration Metal Plate`), preventing duplicate product codes.
   - Monitors platform-wide KPIs, batch processing queues, frozen model SHA-256 verification, and 60-sample evaluation metrics.
   - Provisions authorized `SUPERVISOR`, `ENGINEER`, and `ADMINISTRATOR` user accounts.
2. **ENGINEER (`engineer` / `SpectraEng2026!`)**:
   - Uploads single JPEG/PNG images or 1–10 image batches for `P-PLATE01`.
   - Views personal inspection history, batch progress, and Evidence Passports.
   - Strictly blocked from viewing other engineers' inspections and strictly denied (`HTTP 403 Forbidden`) from submitting supervisor reviews.
3. **SUPERVISOR (`supervisor` / `SpectraSuper2026!`)**:
   - Views all saved inspections across all engineers.
   - Prioritizes reviews via the threshold-aware queue sorted by `abs(defect_probability - 0.5)` ascending.
   - Confirms or corrects completed predictions with optional comments in `SupervisorReview` and `ReviewRevision` while preserving `PredictionResult` unchanged.

---

## 4. REST API Reference (`/api/v1/`)

- `POST /api/v1/auth/login/` — Authenticate session
- `POST /api/v1/auth/logout/` — Terminate session
- `POST /api/v1/auth/register/` — Public registration (provisions `ENGINEER` role only; rejects role escalation)
- `GET /api/v1/auth/me/` — Current user profile & role
- `GET / POST /api/v1/products/` — List or register products (`POST` restricted to `ADMINISTRATOR`)
- `GET / PATCH /api/v1/products/{id}/` — Retrieve or update product (`PATCH` restricted to `ADMINISTRATOR`)
- `POST /api/v1/inspections/single/` — Validate and run synchronous single-image inference
- `POST /api/v1/inspections/batch/` — Validate batch bounds (1–10 files) and enqueue Celery tasks via `transaction.on_commit()`
- `GET /api/v1/inspections/` — List inspections (scoped to personal records for `ENGINEER`)
- `GET /api/v1/inspections/{id}/` — Inspection detail
- `GET /api/v1/inspections/{id}/image/` — Authorized evidence image stream
- `GET /api/v1/inspections/{id}/passport/` — Complete Evidence Passport payload
- `GET /api/v1/inspections/{id}/events/` — Append-only `InspectionEvent` timeline
- `POST /api/v1/inspections/{id}/verify-integrity/` — Recompute SHA-256 from disk and compare with saved digest (`MATCH` / `MISMATCH` / `VERIFICATION ERROR`)
- `GET /api/v1/batches/` — List batches
- `GET /api/v1/batches/{id}/` & `/api/v1/batches/{id}/progress/` — Real-time batch item progress
- `GET /api/v1/reviews/queue/` — Threshold-aware priority queue (`abs(defect_probability - 0.5)` ascending)
- `GET / POST /api/v1/reviews/{inspection_id}/` — View or submit supervisor review (`POST` strictly restricted to `SUPERVISOR`; returns `403` for `ENGINEER`)
- `GET /api/v1/reviews/{inspection_id}/history/` — Append-only `ReviewRevision` list
- `GET /api/v1/analytics/admin/`, `/engineer/`, `/supervisor/` — Role-specific PostgreSQL analytics
- `GET /api/v1/model/status/` & `/api/v1/model/evaluation/` — Model SHA-256 integrity & 60-sample evaluation metrics

---

## 5. 60-Sample Synthetic Development Dataset Evaluation & Model Limitations

Evaluated using unmodified `Model/inference.py` (`BIT-PLATE-CV-1.0`) against `Samples/labels.csv` (`Defective` = positive class):

- **Evaluated Samples**: 60 (30 Normal, 30 Defective; 0 missing/failed)
- **True Positive (TP)**: 30
- **True Negative (TN)**: 30
- **False Positive (FP)**: 0
- **False Negative (FN)**: 0
- **Accuracy**: 100.0% (`1.0000`)
- **Precision**: 100.0% (`1.0000`)
- **Recall / Defect Recall**: 100.0% (`1.0000`)
- **F1 Score**: `1.0000`

### Mandatory Limitations & Zero-FN Disclosure
- **Synthetic Development Set**: Zero false negatives (`FN = 0`) occurred on these 60 procedural illustrations because they were generated by the same fixed synthetic pipeline as the training seeds (`10000–11199`). This does **not** establish real-world factory reliability.
- **No Defect Subtype or Localization**: The logistic regression classifier outputs a binary class (`Normal` vs `Defective`) from 17 global/cropped intensity statistics; it does not identify scratch vs. pit, bounding boxes, severity, or physical root cause.
- **Uncalibrated Confidence**: Scores are uncalibrated sigmoid outputs and must not be treated as guaranteed probabilities of product safety.
