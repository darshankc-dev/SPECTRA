/**
 * Pure domain logic rules for SPECTRΛ verified by fast unit tests (node:test)
 * and mirrored in Python services (services/inspection_lifecycle.py & services/model_integrity.py).
 */

import { UserProfile, UserRole, PredictedClass, SupervisorReview } from './types';

export type ItemStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type BatchStatus = 'QUEUED' | 'PROCESSING' | 'PARTIAL' | 'COMPLETED' | 'FAILED';

export const EXPECTED_MODEL_HASHES = {
  'inference.py': '322647cb2e9b5466fe675af56564114532a3c50366ea4fad2961d69a88089ffc',
  'classifier.npz': 'd05a524ac10d6cb864e82da5adb69c0762308ddc05f833fd96eac336c4984ed2',
  'model_metadata.json': '945f45a455106bede24345e802a64eafd9a6d6a928829f2b1de7f151c49dd017',
} as const;

export const SUPERVISOR_AUTH_TOKEN = 'SUPV-AUTH-2026';
export const ADMIN_PROVISIONING_KEY = 'ADMIN-PROVISION-KEY-945F';

export function aggregateBatchStatus(statuses: ItemStatus[]): BatchStatus {
  const total = statuses.length;
  if (total === 0) return 'QUEUED';
  const completed = statuses.filter((s) => s === 'COMPLETED').length;
  const failed = statuses.filter((s) => s === 'FAILED').length;
  const processing = statuses.filter((s) => s === 'PROCESSING').length;
  const queued = statuses.filter((s) => s === 'QUEUED').length;

  if (completed === total) return 'COMPLETED';
  if (failed === total) return 'FAILED';
  if (queued === 0 && processing === 0 && completed > 0 && failed > 0) return 'PARTIAL';
  if (processing > 0) return 'PROCESSING';
  return 'QUEUED';
}

export function computeThresholdDistance(defectProbability: number, threshold = 0.5): number {
  return Number(Math.abs(defectProbability - threshold).toFixed(6));
}

export function sortQueueByThresholdProximity<T extends { defectProbability: number }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => computeThresholdDistance(a.defectProbability) - computeThresholdDistance(b.defectProbability)
  );
}

// Role-Based Access Control Rules
export function canAccessPortal(role: UserRole, targetPortal: 'ADMIN' | 'ENGINEER' | 'SUPERVISOR'): boolean {
  if (role === 'ADMINISTRATOR') return true; // Administrator has oversight access
  if (role === 'SUPERVISOR') return targetPortal === 'SUPERVISOR';
  if (role === 'ENGINEER') return targetPortal === 'ENGINEER';
  return false;
}

export function canPerformSupervisorReview(role: UserRole): boolean {
  return role === 'SUPERVISOR' || role === 'ADMINISTRATOR';
}

export function canManageUsers(role: UserRole): boolean {
  return role === 'ADMINISTRATOR';
}

export function classifyDamageSeverity(relevanceScore: number): 'CRITICAL' | 'MODERATE' | 'MINOR' | 'NONE' {
  if (relevanceScore >= 0.75) return 'CRITICAL';
  if (relevanceScore >= 0.50) return 'MODERATE';
  if (relevanceScore >= 0.20) return 'MINOR';
  return 'NONE';
}

export function determineDamageAction(relevanceScore: number, isStructuralCrack = false): 'REJECT' | 'REWORK' | 'MONITOR' | 'ACCEPT' {
  if (relevanceScore >= 0.75 || isStructuralCrack) return 'REJECT';
  if (relevanceScore >= 0.50) return 'REWORK';
  if (relevanceScore >= 0.20) return 'MONITOR';
  return 'ACCEPT';
}

export interface RegistrationRequest {
  targetRole: UserRole;
  authCode?: string;
  provisioningKey?: string;
}

export interface RegistrationValidationResult {
  allowed: boolean;
  assignedRole: UserRole;
  errorMessage?: string;
}

export function validateRoleRegistration(req: RegistrationRequest): RegistrationValidationResult {
  // 1. Engineers can self-register publicly and are ALWAYS assigned 'ENGINEER'
  if (req.targetRole === 'ENGINEER') {
    return {
      allowed: true,
      assignedRole: 'ENGINEER',
    };
  }

  // 2. Supervisor accounts require valid supervisor invitation / authorization code
  if (req.targetRole === 'SUPERVISOR') {
    if (!req.authCode || req.authCode.trim() !== SUPERVISOR_AUTH_TOKEN) {
      return {
        allowed: false,
        assignedRole: 'ENGINEER',
        errorMessage: 'Supervisor account registration requires a valid administrative authorization code (SUPV-AUTH-2026).',
      };
    }
    return {
      allowed: true,
      assignedRole: 'SUPERVISOR',
    };
  }

  // 3. Administrator accounts require system provisioning secret
  if (req.targetRole === 'ADMINISTRATOR') {
    if (!req.provisioningKey || req.provisioningKey.trim() !== ADMIN_PROVISIONING_KEY) {
      return {
        allowed: false,
        assignedRole: 'ENGINEER',
        errorMessage: 'Administrator provisioning requires an authorized system provisioning secret.',
      };
    }
    return {
      allowed: true,
      assignedRole: 'ADMINISTRATOR',
    };
  }

  return {
    allowed: false,
    assignedRole: 'ENGINEER',
    errorMessage: 'Invalid role request.',
  };
}

/**
 * Validates that an append-only supervisor review does not mutate original prediction
 */
export function createSupervisorReviewRecord(
  reviewerUsername: string,
  newClass: PredictedClass,
  originalAIClass: PredictedClass,
  comment: string,
  existingReview?: SupervisorReview
): SupervisorReview {
  const isConfirmed = newClass === originalAIClass;
  const reviewStatus = isConfirmed ? 'CONFIRMED' : 'CORRECTED';
  const now = new Date().toISOString();

  const newRevision = {
    id: (existingReview?.revisions.length || 0) + 1,
    reviewerUsername,
    previousClass: existingReview ? existingReview.reviewedClass : originalAIClass,
    newClass,
    comment,
    createdAt: now,
  };

  return {
    id: existingReview ? existingReview.id : Date.now(),
    reviewerUsername,
    reviewedClass: newClass,
    reviewStatus,
    comment,
    createdAt: existingReview ? existingReview.createdAt : now,
    updatedAt: now,
    revisions: existingReview ? [...existingReview.revisions, newRevision] : [newRevision],
  };
}

/**
 * Checks if an inspection is eligible for Quality Incident creation.
 * Must be a completed inspection with Defective prediction or defect score >= 0.50.
 */
export function canCreateQualityIncident(inspection: {
  status: string;
  prediction?: { predictedClass: PredictedClass; defectProbability: number };
  damageAnalysis?: { relevanceScore: number };
}): boolean {
  if (inspection.status !== 'COMPLETED') return false;
  const isDefectiveClass = inspection.prediction?.predictedClass === 'Defective';
  const highProbability = (inspection.prediction?.defectProbability || 0) >= 0.50;
  const highRelevance = (inspection.damageAnalysis?.relevanceScore || 0) >= 0.50;
  return isDefectiveClass || highProbability || highRelevance;
}

/**
 * Validates supervisor incident decision and mandatory comment.
 */
export function validateSupervisorDecision(
  decision: string,
  comment: string,
  hasSufficientEvidence = true
): { valid: boolean; errorMessage?: string } {
  const allowed = ['APPROVED_FOR_FOLLOW_UP', 'NEEDS_MORE_INFO'];
  if (!allowed.includes(decision)) {
    return {
      valid: false,
      errorMessage: 'Invalid decision. Permitted choices are "Approved for follow-up" and "Needs more information".',
    };
  }
  if (!comment || comment.trim().length === 0) {
    return {
      valid: false,
      errorMessage: 'A non-empty explanation comment is mandatory for supervisor decisions.',
    };
  }
  if (!hasSufficientEvidence && decision === 'APPROVED_FOR_FOLLOW_UP') {
    return {
      valid: false,
      errorMessage: 'Cannot approve for follow-up when SOP evidence is insufficient or missing. Select "Needs more information".',
    };
  }
  return { valid: true };
}


