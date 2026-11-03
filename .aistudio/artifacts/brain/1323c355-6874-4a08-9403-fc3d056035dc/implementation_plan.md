# SPECTRΛ + Manufacturing Manual Assistant — Round 3 Unified Platform Implementation Plan (Corrected)

A unified enterprise industrial software platform integrating SPECTRΛ's visual quality inspection with Manufacturing Manual Assistant's Quality Incident & Action Assistant, complying strictly with Round 3 challenge requirements.

## Mandatory Round 3 Specifications & Confirmed Architecture

> [!IMPORTANT]
> The implementation plan incorporates all 7 mandatory user corrections:

1. **Incident Creation Trigger**: Incidents are **NOT** created automatically on inspection completion. The Engineer opens a saved completed `DEFECTIVE` inspection and explicitly clicks **"CREATE QUALITY INCIDENT"**. On click, the system retrieves applicable SOPs and generates the incident summary and action plan. Repeated requests for the same inspection return the existing incident (1 incident per inspection).
2. **Supervisor Decision Scope**: All references to product release, shipment, or return-to-service authorization are strictly removed. The ONLY permitted supervisor decisions are:
   - **Approved for follow-up**
   - **Needs more information**
   (Both require a mandatory comment. Approval does NOT constitute product clearance).
3. **Immutable AI Predictions**: The original AI model prediction remains strictly immutable. Human corrections/reviews are stored separately and do not alter original incident eligibility.
4. **Existing Architecture Verification**: Preserves existing backend, database, embedding, and retrieval configurations from SPECTRΛ and Manufacturing Manual Assistant without replacing working modules.
5. **Robust Failure Handling**: If SOP retrieval or AI generation fails, the inspection and incident record are preserved with status `MANUAL_REVIEW_REQUIRED`. No citations are fabricated.
6. **Strict Evidence Traceability**: Recommendations enforce verifiable SOP Document ID (`Q-PLATE-01`, `Q-PLATE-02`), Revision (`1.0`), exact 1-indexed PDF page, and supporting passage. `Q-GASKET-01` is strictly excluded from `P-PLATE01` retrieval.
7. **Round 3 Focus**: Scope is focused on the exact challenge workflow (Inference -> Defective Inspection -> Engineer Clicks Create Incident -> SOP RAG Action Plan -> Supervisor Review with Approved for follow-up / Needs more info).

---

## 1. Overview & Core Workflow

- **Engineer Workflow**:
  1. Performs AI inspection scan on `P-PLATE01` (using BIT-PLATE-CV-1.0 model).
  2. If result is `DEFECTIVE`, inspection is saved in personal history.
  3. Engineer opens the inspection and clicks **CREATE QUALITY INCIDENT**.
  4. System queries mapped SOPs (`Q_PLATE_01_Containment_Rev1_0.pdf` and `Q_PLATE_02_Review_Rev1_0.pdf`), attaches structured action plan with exact 1-indexed page citations.
- **Supervisor Workflow**:
  1. Reviews incident in Quality Management Queue.
  2. Inspects AI prediction, SOP citations, and incident details.
  3. Selects decision: **Approved for follow-up** OR **Needs more information** with mandatory comment.
- **Quality RAG & SOP Assistant**:
  - Dedicated view for asking natural language questions about mapped product SOPs with strict product isolation.

---

## 2. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SPECTRΛ FRONTEND (Vite)                            │
│  ┌─────────────────────────────┐ ┌───────────────────────────────────────┐  │
│  │ Engineer Workspace          │ │ Supervisor Workspace                  │  │
│  │ - Saved Inspections         │ │ - Incident Review Queue               │  │
│  │ - "Create Quality Incident" │ │ - Decision: Approved for follow-up /  │  │
│  │ - SOP Action Plan View      │ │             Needs more information    │  │
│  └──────────────┬──────────────┘ └───────────────────┬───────────────────┘  │
└─────────────────┼────────────────────────────────────┼──────────────────────┘
                  │                                    │
                  └──────────────────┬─────────────────┘
                                     │ REST API
                                     v
┌─────────────────────────────────────────────────────────────────────────────┐
│                             EXPRESS BACKEND SERVER                          │
│  ┌──────────────────────────────────┐ ┌──────────────────────────────────┐  │
│  │ Inspection & Incident Service    │ │ RAG & SOP Ingestion Engine       │  │
│  │ - Immutable Original Prediction  │ │ - PyMuPDF Text Extraction        │  │
│  │ - Idempotent Incident Store      │ │ - Product-Isolated SOP Retrieval │  │
│  │ - Separate Human Corrections     │ │ - Gemini Grounded Generation     │  │
│  └────────────────┬─────────────────┘ └────────────────┬─────────────────┘  │
└───────────────────┼────────────────────────────────────┼────────────────────┘
                    │                                    │
                    v                                    v
┌────────────────────────────────────┐ ┌────────────────────────────────────┐
│      PERSISTENT DATABASE STORE     │ │     SOP VECTOR / CHUNK METADATA    │
│ - Inspections (original_prediction)│ │ - Q-PLATE-01 (P-PLATE01, req=true) │
│ - QualityIncidents (1 per inspect) │ │ - Q-PLATE-02 (P-PLATE01, req=true) │
│ - SupervisorReviews (decisions)    │ │ - Q-GASKET-01 (P-GASKET02, isolated)│
└────────────────────────────────────┘ └────────────────────────────────────┘
```

---

## 3. Implementation Steps

1. **SOP Indexing & Mapping Sync**:
   - Ensure `product_sop_mapping.csv` is loaded: `P-PLATE01` -> `Q-PLATE-01` and `Q-PLATE-02`. `Q-GASKET01` isolated to `P-GASKET02`.
   - Pre-index SOP PDFs from `SOPs/` folder with 1-indexed page numbers.
2. **Explicit Incident Creation Endpoint & Handler**:
   - `POST /api/inspections/:id/create-incident`: Checks if inspection is `DEFECTIVE`.
   - If incident already exists for `:id`, return existing incident.
   - Retrieve `P-PLATE01` SOP chunks, generate grounded action plan + citations.
   - If retrieval/generation fails, store incident with status `MANUAL_REVIEW_REQUIRED` without fabricating citations.
3. **Supervisor Decision Endpoint**:
   - `POST /api/incidents/:id/decision`: Accepts `decision` (`APPROVED_FOR_FOLLOW_UP` or `NEEDS_MORE_INFO`) and `comment` (mandatory string).
   - Validates decision values and non-empty comment.
4. **UI Integration**:
   - Update Engineer Inspection Detail view with explicit "CREATE QUALITY INCIDENT" button for `DEFECTIVE` inspections.
   - Update Supervisor Portal with strict decision dropdown ("Approved for follow-up", "Needs more information") + mandatory comment field.
   - Ensure Green and Beige industrial theme consistency across all views.
