export type UserRole = 'ADMINISTRATOR' | 'ENGINEER' | 'SUPERVISOR';

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface Product {
  id: number;
  productId: string;
  name: string;
  description: string;
  materialSpec?: string;
  nominalThicknessMm?: number;
  relevanceThreshold?: number; // e.g. 0.50
  active: boolean;
  createdAt: string;
}

export type InspectionStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type ValidationStatus = 'PENDING' | 'PASSED' | 'FAILED';
export type PredictedClass = 'Normal' | 'Defective';
export type ReviewStatus = 'UNREVIEWED' | 'CONFIRMED' | 'CORRECTED';
export type BatchStatus = 'QUEUED' | 'PROCESSING' | 'PARTIAL' | 'COMPLETED' | 'FAILED';

export type DamageType =
  | 'RADIAL_CRACK'
  | 'CIRCUMFERENTIAL_FRACTURE'
  | 'MICRO_CRACK'
  | 'SCORING_SCRATCH'
  | 'SURFACE_ABRASION'
  | 'PITTING_CAVITATION'
  | 'CORROSION_OXIDATION'
  | 'THERMAL_WARPING'
  | 'CHIPPED_RIM'
  | 'BORE_ECCENTRICITY'
  | 'PRISTINE_SURFACE';

export type DamageSeverity = 'NONE' | 'MINOR' | 'MODERATE' | 'CRITICAL';
export type DamageAction = 'ACCEPT' | 'MONITOR' | 'REWORK' | 'REJECT';

export interface BoundingBox {
  ymin: number; // 0 to 100 (%)
  xmin: number; // 0 to 100 (%)
  ymax: number; // 0 to 100 (%)
  xmax: number; // 0 to 100 (%)
}

export interface DamageItem {
  id: string;
  type: DamageType;
  name: string;
  severity: DamageSeverity;
  relevanceScore: number; // 0.0 to 1.0 (relevance to structural/functional failure)
  confidence: number; // 0.0 to 1.0
  boundingBox: BoundingBox;
  locationDescription: string;
  dimensionsEstimateMm?: string;
  engineeringNotes?: string;
}

export interface SectorAnalysis {
  sectorName: string; // e.g. "Center Hub", "Inner Web", "Friction Band", "Outer Bevel"
  status: 'NORMAL' | 'WARN' | 'CRITICAL';
  damageCount: number;
  relevanceScore: number;
}

export interface DiskDamageAnalysis {
  id: string;
  relevanceScore: number; // Overall relevance score 0.00 to 1.00 (how relevant damage is to failure/scrap)
  primaryDamageType: DamageType;
  overallSeverity: DamageSeverity;
  structuralHealthIndex: number; // 0% to 100%
  recommendedAction: DamageAction;
  detectedDamages: DamageItem[];
  sectors: SectorAnalysis[];
  rootCauseHypothesis: string;
  rulImpactPercent: number; // Estimated % reduction in Remaining Useful Life
  technicalSummary: string;
  detectionEngine: 'GEMINI_AI_VISION' | 'CV_MULTI_SPECTRAL_ENGINE';
  analyzedAt: string;
}

export interface PredictionResult {
  id: number;
  predictedClass: PredictedClass;
  confidence: number; // 0 to 1
  defectProbability: number; // 0 to 1 (relevance score as probability)
  modelVersion: string;
  decisionThreshold: number;
  damageAnalysis?: DiskDamageAnalysis;
  createdAt: string;
}

export interface ReviewRevision {
  id: number;
  reviewerUsername: string;
  previousClass: string;
  newClass: PredictedClass;
  previousRelevanceScore?: number;
  newRelevanceScore?: number;
  comment: string;
  createdAt: string;
}

export interface SupervisorReview {
  id: number;
  reviewerUsername: string;
  reviewedClass: PredictedClass;
  reviewStatus: ReviewStatus;
  reviewedRelevanceScore?: number;
  verifiedDamages?: DamageItem[];
  comment: string;
  createdAt: string;
  updatedAt: string;
  revisions: ReviewRevision[];
}

export interface InspectionEvent {
  id: number;
  actorUsername: string;
  eventType: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type IncidentStatus = 'PENDING_REVIEW' | 'APPROVED_FOR_FOLLOW_UP' | 'NEEDS_MORE_INFO' | 'MANUAL_REVIEW_REQUIRED';
export type SupervisorDecision = 'APPROVED_FOR_FOLLOW_UP' | 'NEEDS_MORE_INFO';

export interface SOPCitationItem {
  documentId: string;
  documentName: string;
  revision: string;
  pageNumber: number;
  supportingText: string;
}

export interface QualityIncident {
  id: number;
  inspectionId: number;
  productId: string;
  productName: string;
  submittedBy: string;
  originalPredictionClass: PredictedClass;
  originalRelevanceScore: number;
  status: IncidentStatus;
  actionPlan: string;
  containmentSteps: string[];
  reviewSteps: string[];
  citations: SOPCitationItem[];
  supervisorDecision?: SupervisorDecision;
  supervisorComment?: string;
  supervisorUsername?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Inspection {
  id: number;
  batchId?: number | null;
  productId: string;
  productName: string;
  submittedBy: string;
  imageUrl: string;
  imageSha256: string;
  originalFilename: string;
  fileSize: number;
  imageFormat: string;
  width?: number;
  height?: number;
  status: InspectionStatus;
  validationStatus: ValidationStatus;
  failureReason?: string;
  prediction?: PredictionResult;
  originalPrediction?: PredictionResult;
  damageAnalysis?: DiskDamageAnalysis;
  supervisorReview?: SupervisorReview;
  qualityIncident?: QualityIncident;
  events: InspectionEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface InspectionBatch {
  id: number;
  submittedBy: string;
  productId: string;
  status: BatchStatus;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  averageRelevanceScore?: number;
  criticalDamageCount?: number;
  items: Inspection[];
  createdAt: string;
}

export interface SampleLabel {
  imageId: string;
  relativePath: string;
  productId: string;
  actualLabel: PredictedClass;
  damageType?: DamageType;
  relevanceScore?: number;
  predictedClass?: PredictedClass;
  confidence?: number;
  defectProbability?: number;
  outcome?: 'TP' | 'TN' | 'FP' | 'FN';
}

export interface EvaluationMetrics {
  total: number;
  evaluated: number;
  tp: number;
  tn: number;
  fp: number;
  fn: number;
  accuracy: number;
  precision: number;
  recall: number;
  defectRecall: number;
  f1: number;
  averageRelevanceScore?: number;
  criticalDetectionsCount?: number;
  confusionMatrix: {
    labels: string[];
    matrix: number[][]; // [[TN, FP], [FN, TP]]
  };
}
