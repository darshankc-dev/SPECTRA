import {
  Inspection,
  InspectionBatch,
  Product,
  SupervisorReview,
  ReviewRevision,
  UserProfile,
  UserRole,
  PredictedClass,
  ReviewStatus,
  BatchStatus,
  DiskDamageAnalysis,
} from '../types';

const STORAGE_KEY = 'spectra_damage_platform_v3';

export interface AppState {
  currentUser: UserProfile;
  sessionUser: UserProfile | null;
  users: UserProfile[];
  products: Product[];
  inspections: Inspection[];
  batches: InspectionBatch[];
}

export const DEFAULT_USERS: Record<UserRole, UserProfile> = {
  ADMINISTRATOR: { id: 1, username: 'admin', email: 'admin@spectra-qa.io', fullName: 'Elena Vance', role: 'ADMINISTRATOR' },
  SUPERVISOR: { id: 2, username: 'supervisor', email: 'supervisor@spectra-qa.io', fullName: 'Marcus Sterling', role: 'SUPERVISOR' },
  ENGINEER: { id: 3, username: 'engineer', email: 'engineer@spectra-qa.io', fullName: 'Arjun Mehta', role: 'ENGINEER' },
};

export const INITIAL_USER_LIST: UserProfile[] = [
  DEFAULT_USERS.ADMINISTRATOR,
  DEFAULT_USERS.SUPERVISOR,
  DEFAULT_USERS.ENGINEER,
];

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 1,
    productId: 'P-PLATE01',
    name: 'High-Carbon Ventilated Brake Disc',
    description: 'Ventilated cast grey iron disc rotor for heavy-duty automotive and rail applications.',
    materialSpec: 'Cast Iron EN-GJL-250 (GG25)',
    nominalThicknessMm: 32.0,
    relevanceThreshold: 0.50,
    active: true,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 2,
    productId: 'P-PLATE02',
    name: 'Sintered Metallic Clutch Friction Plate',
    description: 'High-friction multi-pack plate for commercial powertrain & earthmoving transmissions.',
    materialSpec: 'Sintered Bronze / Steel Backing',
    nominalThicknessMm: 4.5,
    relevanceThreshold: 0.55,
    active: true,
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: 3,
    productId: 'P-PLATE03',
    name: 'Titanium Turbine Compressor Blisk / Disc',
    description: 'Integrally bladed rotor disc subject to severe aerodynamic and centrifugal stress.',
    materialSpec: 'Ti-6Al-4V Grade 5',
    nominalThicknessMm: 18.0,
    relevanceThreshold: 0.40,
    active: true,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 4,
    productId: 'P-PLATE04',
    name: 'Precision Wafer Lapping Plate',
    description: 'Ultra-flat conditioning plate for silicon ingot lapping and CMP semiconductor wafer polishing.',
    materialSpec: 'Silicon Carbide (SiC) Composite',
    nominalThicknessMm: 25.4,
    relevanceThreshold: 0.35,
    active: true,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

const SAMPLE_ANALYSIS_1: DiskDamageAnalysis = {
  id: 'DDA-CRACK-01',
  relevanceScore: 0.88,
  primaryDamageType: 'RADIAL_CRACK',
  overallSeverity: 'CRITICAL',
  structuralHealthIndex: 32,
  recommendedAction: 'REJECT',
  detectedDamages: [
    {
      id: 'DMG-001',
      type: 'RADIAL_CRACK',
      name: 'Radial Thermal Stress Fracture',
      severity: 'CRITICAL',
      relevanceScore: 0.88,
      confidence: 0.97,
      boundingBox: { ymin: 24, xmin: 42, ymax: 58, xmax: 68 },
      locationDescription: 'Primary friction track swept zone at 2 o\'clock radius',
      dimensionsEstimateMm: '28.4 mm length x 0.65 mm width',
      engineeringNotes: 'Radial crack propagating towards outer chamfer. High risk of catastrophic burst under high RPM centrifugal load.',
    },
    {
      id: 'DMG-002',
      type: 'MICRO_CRACK',
      name: 'Secondary Thermal Fatigue Micro-Cracking',
      severity: 'MODERATE',
      relevanceScore: 0.62,
      confidence: 0.91,
      boundingBox: { ymin: 58, xmin: 32, ymax: 72, xmax: 48 },
      locationDescription: 'Inner flange boundary at 7 o\'clock position',
      dimensionsEstimateMm: '7.8 mm micro-crack chain',
      engineeringNotes: 'Thermal fatigue craze-cracking resulting from repetitive rapid heating cycles.',
    },
  ],
  sectors: [
    { sectorName: 'Center Hub & Bore', status: 'NORMAL', damageCount: 0, relevanceScore: 0.05 },
    { sectorName: 'Inner Mounting Flange', status: 'WARN', damageCount: 1, relevanceScore: 0.62 },
    { sectorName: 'Primary Friction Band', status: 'CRITICAL', damageCount: 1, relevanceScore: 0.88 },
    { sectorName: 'Outer Bevel / Rim', status: 'NORMAL', damageCount: 0, relevanceScore: 0.08 },
  ],
  rootCauseHypothesis: 'Thermal shock cycling exceeding critical fracture toughness K_IC in cast iron structure.',
  rulImpactPercent: 78,
  technicalSummary: 'Critical radial fracture detected with 88% relevance score. Immediate scrap and quarantine mandated.',
  detectionEngine: 'GEMINI_AI_VISION',
  analyzedAt: new Date(Date.now() - 3600000 * 4).toISOString(),
};

const SAMPLE_ANALYSIS_2: DiskDamageAnalysis = {
  id: 'DDA-SCORE-02',
  relevanceScore: 0.68,
  primaryDamageType: 'SCORING_SCRATCH',
  overallSeverity: 'MODERATE',
  structuralHealthIndex: 64,
  recommendedAction: 'REWORK',
  detectedDamages: [
    {
      id: 'DMG-001',
      type: 'SCORING_SCRATCH',
      name: 'Deep Circumferential Furrow / Gouge',
      severity: 'MODERATE',
      relevanceScore: 0.68,
      confidence: 0.94,
      boundingBox: { ymin: 34, xmin: 24, ymax: 60, xmax: 62 },
      locationDescription: 'Primary swept channel, outer diameter 240mm track',
      dimensionsEstimateMm: '1.45 mm groove depth x 4.2 mm width',
      engineeringNotes: 'Hard abrasive foreign particulate entrapment. Plate can be salvaged via CNC precision resurfacing.',
    },
  ],
  sectors: [
    { sectorName: 'Center Hub & Bore', status: 'NORMAL', damageCount: 0, relevanceScore: 0.04 },
    { sectorName: 'Inner Mounting Flange', status: 'NORMAL', damageCount: 0, relevanceScore: 0.05 },
    { sectorName: 'Primary Friction Band', status: 'WARN', damageCount: 1, relevanceScore: 0.68 },
    { sectorName: 'Outer Bevel / Rim', status: 'NORMAL', damageCount: 0, relevanceScore: 0.06 },
  ],
  rootCauseHypothesis: 'Abrasive particle intrusion between pad friction interface and rotating plate face.',
  rulImpactPercent: 42,
  technicalSummary: 'Circumferential scoring with 68% relevance score. Precision surface grinding approved for rework.',
  detectionEngine: 'CV_MULTI_SPECTRAL_ENGINE',
  analyzedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
};

const SAMPLE_ANALYSIS_3: DiskDamageAnalysis = {
  id: 'DDA-PRISTINE-03',
  relevanceScore: 0.04,
  primaryDamageType: 'PRISTINE_SURFACE',
  overallSeverity: 'NONE',
  structuralHealthIndex: 99,
  recommendedAction: 'ACCEPT',
  detectedDamages: [
    {
      id: 'DMG-001',
      type: 'PRISTINE_SURFACE',
      name: 'Nominal Surface Integrity',
      severity: 'NONE',
      relevanceScore: 0.04,
      confidence: 0.99,
      boundingBox: { ymin: 15, xmin: 15, ymax: 85, xmax: 85 },
      locationDescription: 'Full 360° circular rotor swept track and hub concentricity',
      dimensionsEstimateMm: 'Nominal OEM flatness Ra 0.8 µm',
      engineeringNotes: 'Uniform cross-hatch finish adhering to DIN EN ISO standards. Zero crack indications.',
    },
  ],
  sectors: [
    { sectorName: 'Center Hub & Bore', status: 'NORMAL', damageCount: 0, relevanceScore: 0.03 },
    { sectorName: 'Inner Mounting Flange', status: 'NORMAL', damageCount: 0, relevanceScore: 0.04 },
    { sectorName: 'Primary Friction Band', status: 'NORMAL', damageCount: 0, relevanceScore: 0.04 },
    { sectorName: 'Outer Bevel / Rim', status: 'NORMAL', damageCount: 0, relevanceScore: 0.05 },
  ],
  rootCauseHypothesis: 'Compliant manufacturing process meeting all structural and surface roughness parameters.',
  rulImpactPercent: 0,
  technicalSummary: 'Nominal pristine condition. Relevance score 4.0%. Certified fit for service and release.',
  detectionEngine: 'GEMINI_AI_VISION',
  analyzedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
};

const SAMPLE_ANALYSIS_4: DiskDamageAnalysis = {
  id: 'DDA-CAVIT-04',
  relevanceScore: 0.74,
  primaryDamageType: 'PITTING_CAVITATION',
  overallSeverity: 'MODERATE',
  structuralHealthIndex: 58,
  recommendedAction: 'REWORK',
  detectedDamages: [
    {
      id: 'DMG-001',
      type: 'PITTING_CAVITATION',
      name: 'Localized Spalling & Cavitation Pitting',
      severity: 'MODERATE',
      relevanceScore: 0.74,
      confidence: 0.92,
      boundingBox: { ymin: 38, xmin: 44, ymax: 64, xmax: 68 },
      locationDescription: 'Mid-radius cooling boundary, 5 o\'clock quadrant',
      dimensionsEstimateMm: '14.5 mm² cluster area x 0.8 mm depth',
      engineeringNotes: 'Chemical/pressure micro-implosions forming concentrated stress pit craters.',
    },
  ],
  sectors: [
    { sectorName: 'Center Hub & Bore', status: 'NORMAL', damageCount: 0, relevanceScore: 0.04 },
    { sectorName: 'Inner Mounting Flange', status: 'NORMAL', damageCount: 0, relevanceScore: 0.06 },
    { sectorName: 'Primary Friction Band', status: 'CRITICAL', damageCount: 1, relevanceScore: 0.74 },
    { sectorName: 'Outer Bevel / Rim', status: 'NORMAL', damageCount: 0, relevanceScore: 0.07 },
  ],
  rootCauseHypothesis: 'Localized fluid cavitation erosion and cyclic pressure shock.',
  rulImpactPercent: 52,
  technicalSummary: 'Significant cavitation pitting detected with 74% relevance score. Rework or selective metal deposition needed.',
  detectionEngine: 'CV_MULTI_SPECTRAL_ENGINE',
  analyzedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
};

export const DEFAULT_INSPECTIONS: Inspection[] = [
  {
    id: 1,
    productId: 'P-PLATE01',
    productName: 'High-Carbon Ventilated Brake Disc',
    submittedBy: 'engineer',
    imageUrl: '/Samples/images/inspection_001.png',
    imageSha256: '5654a5a10b17984bdc74124f1e07c52014ea259a221ded178ecdc5bedcbae6ec',
    originalFilename: 'brake_disc_batch_01_crack.png',
    fileSize: 28925,
    imageFormat: 'PNG',
    width: 256,
    height: 256,
    status: 'COMPLETED',
    validationStatus: 'PASSED',
    prediction: {
      id: 1,
      predictedClass: 'Defective',
      confidence: 0.97,
      defectProbability: 0.88,
      modelVersion: 'SPECTRΛ-VISION-V3.8',
      decisionThreshold: 0.5,
      damageAnalysis: SAMPLE_ANALYSIS_1,
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    damageAnalysis: SAMPLE_ANALYSIS_1,
    supervisorReview: {
      id: 1,
      reviewerUsername: 'supervisor',
      reviewedClass: 'Defective',
      reviewStatus: 'CONFIRMED',
      reviewedRelevanceScore: 0.88,
      comment: 'Radial crack confirmed across active friction band. Exceeds permissible safety threshold. Plate scrapped.',
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      revisions: [
        {
          id: 1,
          reviewerUsername: 'supervisor',
          previousClass: '',
          newClass: 'Defective',
          previousRelevanceScore: 0.88,
          newRelevanceScore: 0.88,
          comment: 'Radial crack confirmed across active friction band. Exceeds permissible safety threshold. Plate scrapped.',
          createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
        },
      ],
    },
    qualityIncident: {
      id: 101,
      inspectionId: 1,
      productId: 'P-PLATE01',
      productName: 'High-Carbon Ventilated Brake Disc',
      submittedBy: 'engineer',
      originalPredictionClass: 'Defective',
      originalRelevanceScore: 0.88,
      status: 'APPROVED_FOR_FOLLOW_UP',
      actionPlan: `QUALITY INCIDENT ACTION PLAN — P-PLATE01 (High-Carbon Ventilated Brake Disc)

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
   - Audit defect score (88.0%) against scrap threshold (50.0%).
   - Supervisor selects "Approved for follow-up" or "Needs more information" with mandatory comment.
   - NOTE: Approval constitutes technical follow-up authorization ONLY and NEVER product clearance or release.`,
      containmentSteps: [
        '1.1. Immediately halt transfer of P-PLATE01 and isolate affected plate batch.',
        '1.2. Apply a physical RED HOLD TAG and relocate item to Quarantine Holding Bay.',
        '1.3. Record inspection ID, timestamp, and defect score in Quality Incident Log.',
        '1.4. Notify shift Quality Supervisor within 15 minutes of detection.',
      ],
      reviewSteps: [
        '2.1. Quality Supervisor performs physical flaw inspection within 2 hours.',
        '2.2. Measure plate thickness using digital micrometer across 3 points.',
        '2.3. Confirm defect probability score (>= 0.50) and review preceding 5 batch scans.',
        '2.4. Select Supervisor Decision: "Approved for follow-up" or "Needs more information" with mandatory comment.',
      ],
      citations: [
        {
          documentId: 'Q-PLATE-01',
          documentName: 'Q_PLATE_01_Containment_Rev1_0.pdf',
          revision: '1.0',
          pageNumber: 1,
          supportingText: 'Q-PLATE-01 | Rev 1.0 | Page 1\nQuality Containment Procedure: Metal Plate Defects\n1. Immediate Containment Sequence:\n1.1. Immediately isolate the affected plate batch and halt transfer to downstream machining.\n1.2. Apply a physical RED HOLD TAG to the container and move to Quarantine Holding Bay.',
        },
        {
          documentId: 'Q-PLATE-01',
          documentName: 'Q_PLATE_01_Containment_Rev1_0.pdf',
          revision: '1.0',
          pageNumber: 2,
          supportingText: 'Q-PLATE-01 | Rev 1.0 | Page 2\nContainment Verification & Initial Checks\n2. Preliminary Physical Inspection:\n2.1. Verify plate serial number and batch code against work order.\n2.2. Measure plate thickness using calibrated digital micrometer (3 points).',
        },
        {
          documentId: 'Q-PLATE-02',
          documentName: 'Q_PLATE_02_Review_Rev1_0.pdf',
          revision: '1.0',
          pageNumber: 1,
          supportingText: 'Q-PLATE-02 | Rev 1.0 | Page 1\nQuality Review Procedure\n1. Technical Review Protocol:\n1.1. Quality Supervisor shall inspect all quarantined P-PLATE01 defective items within 2 hours.\n1.3. Audit AI defect probability score against scrap threshold (>= 0.50).',
        },
        {
          documentId: 'Q-PLATE-02',
          documentName: 'Q_PLATE_02_Review_Rev1_0.pdf',
          revision: '1.0',
          pageNumber: 2,
          supportingText: 'Q-PLATE-02 | Rev 1.0 | Page 2\nSupervisor Decision Protocol:\n2.1. Permitted Supervisor Decisions are strictly limited to: a) "Approved for follow-up", b) "Needs more information".\n2.3. CRITICAL MANDATE: Approval indicates agreement for technical follow-up only and MUST NEVER be interpreted as product clearance or release.',
        },
      ],
      supervisorDecision: 'APPROVED_FOR_FOLLOW_UP',
      supervisorComment: 'Approved for metallurgic NDT laboratory follow-up and material hardness testing.',
      supervisorUsername: 'supervisor',
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
      updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
    events: [
      { id: 1, actorUsername: 'engineer', eventType: 'INSPECTION_CREATED', description: 'Brake disc image uploaded (28,925 bytes).', createdAt: new Date(Date.now() - 3600000 * 4.1).toISOString() },
      { id: 2, actorUsername: 'engineer', eventType: 'VALIDATION_PASSED', description: 'Decoded PNG passed 12-step optical calibration.', createdAt: new Date(Date.now() - 3600000 * 4).toISOString() },
      { id: 3, actorUsername: 'engineer', eventType: 'DAMAGE_ANALYSIS_COMPLETED', description: 'AI Detector identified RADIAL_CRACK with 88.0% relevance score.', createdAt: new Date(Date.now() - 3600000 * 4).toISOString() },
      { id: 4, actorUsername: 'supervisor', eventType: 'SUPERVISOR_REVIEW_CONFIRMED', description: 'Supervisor confirmed critical rejection verdict.', createdAt: new Date(Date.now() - 3600000 * 3).toISOString() },
    ],
    createdAt: new Date(Date.now() - 3600000 * 4.1).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 2,
    productId: 'P-PLATE01',
    productName: 'High-Carbon Ventilated Brake Disc',
    submittedBy: 'engineer',
    imageUrl: '/Samples/images/inspection_002.png',
    imageSha256: '831dca21ce2c7ea1b5a5c68f23fcfb62e49980dcf2cf5b8e907293a59df79ca3',
    originalFilename: 'brake_disc_scoring_wear.png',
    fileSize: 29140,
    imageFormat: 'PNG',
    width: 256,
    height: 256,
    status: 'COMPLETED',
    validationStatus: 'PASSED',
    prediction: {
      id: 2,
      predictedClass: 'Defective',
      confidence: 0.94,
      defectProbability: 0.68,
      modelVersion: 'SPECTRΛ-VISION-V3.8',
      decisionThreshold: 0.5,
      damageAnalysis: SAMPLE_ANALYSIS_2,
      createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
    damageAnalysis: SAMPLE_ANALYSIS_2,
    events: [
      { id: 5, actorUsername: 'engineer', eventType: 'INSPECTION_CREATED', description: 'Disk image uploaded for damage scan.', createdAt: new Date(Date.now() - 3600000 * 3.1).toISOString() },
      { id: 6, actorUsername: 'engineer', eventType: 'DAMAGE_ANALYSIS_COMPLETED', description: 'Detected SCORING_SCRATCH. Relevance score 68.0%. Recommended action: REWORK.', createdAt: new Date(Date.now() - 3600000 * 3).toISOString() },
    ],
    createdAt: new Date(Date.now() - 3600000 * 3.1).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 3,
    productId: 'P-PLATE02',
    productName: 'Sintered Metallic Clutch Friction Plate',
    submittedBy: 'engineer',
    imageUrl: '/Samples/images/inspection_003.png',
    imageSha256: '25eb393967d16a5a3a787ee9cb8a5df9be31f5f3e9b60daaeeb0fa3240dccebb',
    originalFilename: 'clutch_plate_nominal_oem.png',
    fileSize: 28410,
    imageFormat: 'PNG',
    width: 256,
    height: 256,
    status: 'COMPLETED',
    validationStatus: 'PASSED',
    prediction: {
      id: 3,
      predictedClass: 'Normal',
      confidence: 0.99,
      defectProbability: 0.04,
      modelVersion: 'SPECTRΛ-VISION-V3.8',
      decisionThreshold: 0.5,
      damageAnalysis: SAMPLE_ANALYSIS_3,
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    damageAnalysis: SAMPLE_ANALYSIS_3,
    events: [
      { id: 7, actorUsername: 'engineer', eventType: 'INSPECTION_CREATED', description: 'Clutch plate uploaded for pre-dispatch inspection.', createdAt: new Date(Date.now() - 3600000 * 2.1).toISOString() },
      { id: 8, actorUsername: 'engineer', eventType: 'DAMAGE_ANALYSIS_COMPLETED', description: 'Pristine condition confirmed. Relevance score 4.0%. Passed quality gate.', createdAt: new Date(Date.now() - 3600000 * 2).toISOString() },
    ],
    createdAt: new Date(Date.now() - 3600000 * 2.1).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 4,
    productId: 'P-PLATE03',
    productName: 'Titanium Turbine Compressor Blisk / Disc',
    submittedBy: 'engineer',
    imageUrl: '/Samples/images/inspection_004.png',
    imageSha256: '992bca21ce2c7ea1b5a5c68f23fcfb62e49980dcf2cf5b8e907293a59df79cc4',
    originalFilename: 'turbine_blisk_cavitation_pit.png',
    fileSize: 31200,
    imageFormat: 'PNG',
    width: 256,
    height: 256,
    status: 'COMPLETED',
    validationStatus: 'PASSED',
    prediction: {
      id: 4,
      predictedClass: 'Defective',
      confidence: 0.92,
      defectProbability: 0.74,
      modelVersion: 'SPECTRΛ-VISION-V3.8',
      decisionThreshold: 0.5,
      damageAnalysis: SAMPLE_ANALYSIS_4,
      createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    },
    damageAnalysis: SAMPLE_ANALYSIS_4,
    events: [
      { id: 9, actorUsername: 'engineer', eventType: 'INSPECTION_CREATED', description: 'Aerospace turbine blisk disc uploaded for nondestructive testing.', createdAt: new Date(Date.now() - 3600000 * 1.1).toISOString() },
      { id: 10, actorUsername: 'engineer', eventType: 'DAMAGE_ANALYSIS_COMPLETED', description: 'Cavitation pitting detected. Relevance score 74.0%. Action: REWORK.', createdAt: new Date(Date.now() - 3600000 * 1).toISOString() },
    ],
    createdAt: new Date(Date.now() - 3600000 * 1.1).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
];

export const DEFAULT_BATCHES: InspectionBatch[] = [
  {
    id: 1,
    submittedBy: 'engineer',
    productId: 'P-PLATE01',
    status: 'COMPLETED',
    totalItems: 4,
    completedItems: 4,
    failedItems: 0,
    averageRelevanceScore: 0.585,
    criticalDamageCount: 2,
    items: DEFAULT_INSPECTIONS,
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
];

export function getStoredState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.users && parsed.inspections && parsed.products) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error loading state from localStorage:', err);
  }

  return {
    currentUser: DEFAULT_USERS.ENGINEER,
    sessionUser: null,
    users: INITIAL_USER_LIST,
    products: DEFAULT_PRODUCTS,
    inspections: DEFAULT_INSPECTIONS,
    batches: DEFAULT_BATCHES,
  };
}

export function saveStoredState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Error saving state to localStorage:', err);
  }
}
