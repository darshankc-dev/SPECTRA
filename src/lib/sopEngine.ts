import {
  QualityIncident,
  SOPCitationItem,
  PredictedClass,
  IncidentStatus,
  SupervisorDecision,
} from '../types';

export interface SOPDocumentMeta {
  productId: string;
  productName: string;
  documentId: string;
  revision: string;
  pdfFilename: string;
  required: boolean;
}

export interface SOPChunk {
  documentId: string;
  documentName: string;
  revision: string;
  productId: string;
  pageNumber: number; // 1-indexed
  text: string;
}

// In-memory pre-indexed SOP Chunks from official challenge files (SOPs/Q_PLATE_01, Q_PLATE_02, Q_GASKET_01)
export const OFFICIAL_SOP_MAPPING: SOPDocumentMeta[] = [
  {
    productId: 'P-PLATE01',
    productName: 'Demonstration metal plate',
    documentId: 'Q-PLATE-01',
    revision: '1.0',
    pdfFilename: 'Q_PLATE_01_Containment_Rev1_0.pdf',
    required: true,
  },
  {
    productId: 'P-PLATE01',
    productName: 'Demonstration metal plate',
    documentId: 'Q-PLATE-02',
    revision: '1.0',
    pdfFilename: 'Q_PLATE_02_Review_Rev1_0.pdf',
    required: true,
  },
  {
    productId: 'P-GASKET02',
    productName: 'Demonstration sealing gasket',
    documentId: 'Q-GASKET-01',
    revision: '1.0',
    pdfFilename: 'Q_GASKET_01_Review_Rev1_0.pdf',
    required: true,
  },
];

export const INDEXED_SOP_CHUNKS: SOPChunk[] = [
  // Q-PLATE-01 (P-PLATE01 Containment Procedure)
  {
    documentId: 'Q-PLATE-01',
    documentName: 'Q_PLATE_01_Containment_Rev1_0.pdf',
    revision: '1.0',
    productId: 'P-PLATE01',
    pageNumber: 1,
    text: `Q-PLATE-01 | Rev 1.0 | Page 1
Quality Containment Procedure: Metal Plate Defects
Document ID: Q-PLATE-01 | Product: P-PLATE01 (Demonstration metal plate) | Revision: 1.0

1. Immediate Containment Sequence
When a Defective visual inspection result or surface flaw is identified on P-PLATE01:
1.1. Immediately isolate the affected plate batch and halt transfer to downstream machining.
1.2. Apply a physical RED HOLD TAG to the container and move it to the Quarantine Holding Bay.
1.3. Record the inspection ID, timestamp, operator ID, and defect classification in the Quality Log.
1.4. Notify the shift Quality Supervisor within 15 minutes of defect detection.`,
  },
  {
    documentId: 'Q-PLATE-01',
    documentName: 'Q_PLATE_01_Containment_Rev1_0.pdf',
    revision: '1.0',
    productId: 'P-PLATE01',
    pageNumber: 2,
    text: `Q-PLATE-01 | Rev 1.0 | Page 2
Containment Verification & Initial Checks

2. Preliminary Physical Inspection
2.1. Verify plate serial number and batch code against the work order traveler.
2.2. Measure plate thickness using calibrated digital micrometer (3 points: center, rim 12 o'clock, rim 6 o'clock).
2.3. Check for external oil/coolant contamination before surface flaw evaluation.
2.4. Verify sight-glass fluid levels and hydraulic pressure on pressing station before resuming line testing.
2.5. Do NOT release quarantined plates until formal Supervisor review is completed.`,
  },

  // Q-PLATE-02 (P-PLATE01 Technical Review & Follow-up)
  {
    documentId: 'Q-PLATE-02',
    documentName: 'Q_PLATE_02_Review_Rev1_0.pdf',
    revision: '1.0',
    productId: 'P-PLATE01',
    pageNumber: 1,
    text: `Q-PLATE-02 | Rev 1.0 | Page 1
Quality Review & Disciplinary Disposition Procedure
Document ID: Q-PLATE-02 | Product: P-PLATE01 (Demonstration metal plate) | Revision: 1.0

1. Technical Review Protocol
1.1. The Quality Supervisor shall inspect all quarantined P-PLATE01 defective items within 2 hours.
1.2. Compare visual flaw characteristics against the Defect Catalog (Radial Crack, Scoring, Pitting, Warping).
1.3. Audit the AI defect probability score and confirm whether the flaw exceeds critical scrap threshold (>= 0.50).
1.4. Review preceding 5 batch inspections to evaluate if defect is systematic or isolated.`,
  },
  {
    documentId: 'Q-PLATE-02',
    documentName: 'Q_PLATE_02_Review_Rev1_0.pdf',
    revision: '1.0',
    productId: 'P-PLATE01',
    pageNumber: 2,
    text: `Q-PLATE-02 | Rev 1.0 | Page 2
Supervisor Decision & Action Mandates

2. Supervisor Decision Protocol
2.1. Permitted Supervisor Decisions are strictly limited to:
     a) "Approved for follow-up" (for further NDT testing, metallurgical lab evaluation, or rework).
     b) "Needs more information" (requiring additional cleaning, re-measurement, or secondary scan).
2.2. A non-empty explanation comment is MANDATORY for all decisions.
2.3. CRITICAL MANDATE: Supervisor approval indicates agreement for technical follow-up only and MUST NEVER be interpreted as product clearance, release, or shipment authorization.`,
  },

  // Q-GASKET-01 (P-GASKET02 Sealing Gasket SOP - Strictly Isolated from P-PLATE01)
  {
    documentId: 'Q-GASKET-01',
    documentName: 'Q_GASKET_01_Review_Rev1_0.pdf',
    revision: '1.0',
    productId: 'P-GASKET02',
    pageNumber: 1,
    text: `Q-GASKET-01 | Rev 1.0 | Page 1
Sealing Gasket Inspection & Review SOP
Document ID: Q-GASKET-01 | Product: P-GASKET02 (Demonstration sealing gasket) | Revision: 1.0

1. Gasket Flaw Evaluation
1.1. Inspect elastomer seating surface for tears, voids, or extrusion flashes.
1.2. Measure gasket cross-section thickness at 4 cardinal points (90 deg intervals).`,
  },
  {
    documentId: 'Q-GASKET-01',
    documentName: 'Q_GASKET_01_Review_Rev1_0.pdf',
    revision: '1.0',
    productId: 'P-GASKET02',
    pageNumber: 2,
    text: `Q-GASKET-01 | Rev 1.0 | Page 2
Gasket Containment Protocol
2.1. Quarantined gaskets must be stored in antistatic poly bags away from direct UV exposure.`,
  },
];

/**
 * Product-isolated SOP chunk retrieval.
 * For P-PLATE01: Returns Q-PLATE-01 and Q-PLATE-02 chunks ONLY. Excludes Q-GASKET-01.
 */
export function getProductSopChunks(productId: string): SOPChunk[] {
  const normalizedId = productId.trim().toUpperCase();
  return INDEXED_SOP_CHUNKS.filter(
    (chunk) => chunk.productId.toUpperCase() === normalizedId
  );
}

/**
 * Generates Quality Incident Action Plan & Citations for a Defective inspection.
 */
export function generateQualityIncidentPayload(params: {
  inspectionId: number;
  productId: string;
  productName: string;
  submittedBy: string;
  originalClass: PredictedClass;
  relevanceScore: number;
}): QualityIncident {
  const { inspectionId, productId, productName, submittedBy, originalClass, relevanceScore } = params;

  const sopChunks = getProductSopChunks(productId);
  const now = new Date().toISOString();

  if (sopChunks.length === 0) {
    return {
      id: Date.now(),
      inspectionId,
      productId,
      productName,
      submittedBy,
      originalPredictionClass: originalClass,
      originalRelevanceScore: relevanceScore,
      status: 'MANUAL_REVIEW_REQUIRED',
      actionPlan: 'I couldn\'t find sufficient supporting information in the available product SOP manuals to generate an automated action plan reliably.',
      containmentSteps: [
        'Halt product transfer and apply a physical RED HOLD TAG.',
        'Move item to Quarantine Holding Bay.',
        'Request manual Quality Supervisor review.',
      ],
      reviewSteps: [
        'Manual inspection and NDT measurement required by Quality Supervisor.',
      ],
      citations: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  // Build verifiable 1-indexed page citations strictly from mapped chunks
  const citations: SOPCitationItem[] = sopChunks.map((chunk) => ({
    documentId: chunk.documentId,
    documentName: chunk.documentName,
    revision: chunk.revision,
    pageNumber: chunk.pageNumber,
    supportingText: chunk.text,
  }));

  const containmentSteps = [
    '1.1. Immediately halt transfer of P-PLATE01 and isolate the affected plate batch.',
    '1.2. Apply a physical RED HOLD TAG and relocate item to the Quarantine Holding Bay.',
    '1.3. Record inspection ID, timestamp, and defect score in the Quality Incident Log.',
    '1.4. Notify the shift Quality Supervisor within 15 minutes of detection.',
  ];

  const reviewSteps = [
    '2.1. Quality Supervisor performs physical flaw inspection within 2 hours.',
    '2.2. Measure plate thickness using digital micrometer across 3 points.',
    '2.3. Confirm defect probability score (>= 0.50) and review preceding 5 batch scans.',
    '2.4. Select Supervisor Decision: "Approved for follow-up" or "Needs more information" with mandatory comment.',
  ];

  const actionPlan = `QUALITY INCIDENT ACTION PLAN — ${productId} (${productName})

1. IMMEDIATE CONTAINMENT MANDATE (Ref: Q-PLATE-01, Rev 1.0, Page 1):
   - Immediately halt plate transfer to downstream machining.
   - Apply a physical RED HOLD TAG to the plate container and move to Quarantine Holding Bay.
   - Notify shift Quality Supervisor within 15 minutes.

2. PRELIMINARY PHYSICAL CHECKS (Ref: Q-PLATE-01, Rev 1.0, Page 2):
   - Verify plate serial number and batch traveler.
   - Measure 3-point thickness (center, 12 o'clock, 6 o'clock).
   - Check oil/coolant contamination before flaw evaluation.

3. SUPERVISOR REVIEW PROTOCOL (Ref: Q-PLATE-02, Rev 1.0, Pages 1-2):
   - Supervisor conducts technical flaw audit within 2 hours.
   - Audit defect score (${(relevanceScore * 100).toFixed(1)}%) against scrap threshold (50.0%).
   - Supervisor selects "Approved for follow-up" or "Needs more information" with mandatory comment.
   - NOTE: Approval constitutes technical follow-up authorization ONLY and NEVER product clearance or release.`;

  return {
    id: Date.now(),
    inspectionId,
    productId,
    productName,
    submittedBy,
    originalPredictionClass: originalClass,
    originalRelevanceScore: relevanceScore,
    status: 'PENDING_REVIEW',
    actionPlan,
    containmentSteps,
    reviewSteps,
    citations,
    createdAt: now,
    updatedAt: now,
  };
}
