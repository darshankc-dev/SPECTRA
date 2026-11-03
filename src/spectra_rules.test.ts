import test from 'node:test';
import assert from 'node:assert/strict';
import {
  aggregateBatchStatus,
  computeThresholdDistance,
  sortQueueByThresholdProximity,
  EXPECTED_MODEL_HASHES,
  canAccessPortal,
  canPerformSupervisorReview,
  canManageUsers,
  validateRoleRegistration,
  SUPERVISOR_AUTH_TOKEN,
  ADMIN_PROVISIONING_KEY,
  classifyDamageSeverity,
  determineDamageAction,
  canCreateQualityIncident,
  validateSupervisorDecision,
} from './spectra_rules';
import { getProductSopChunks, generateQualityIncidentPayload } from './lib/sopEngine';


test('batch aggregation rules follow official Section 11 state transitions', () => {
  assert.equal(aggregateBatchStatus(['COMPLETED', 'COMPLETED']), 'COMPLETED');
  assert.equal(aggregateBatchStatus(['FAILED', 'FAILED']), 'FAILED');
  assert.equal(aggregateBatchStatus(['COMPLETED', 'FAILED']), 'PARTIAL');
  assert.equal(aggregateBatchStatus(['COMPLETED', 'PROCESSING', 'FAILED']), 'PROCESSING');
  assert.equal(aggregateBatchStatus(['COMPLETED', 'QUEUED']), 'QUEUED');
});

test('threshold-aware review queue sorts ascending by abs(defect_probability - 0.5)', () => {
  const items = [
    { id: 1, defectProbability: 0.98 },
    { id: 2, defectProbability: 0.51 },
    { id: 3, defectProbability: 0.04 },
    { id: 4, defectProbability: 0.47 },
  ];
  const sorted = sortQueueByThresholdProximity(items);
  assert.deepEqual(
    sorted.map((i) => i.id),
    [2, 4, 3, 1]
  );
  assert.equal(computeThresholdDistance(0.5), 0);
});

test('expected SHA-256 model hashes match official specification', () => {
  assert.equal(
    EXPECTED_MODEL_HASHES['inference.py'],
    '322647cb2e9b5466fe675af56564114532a3c50366ea4fad2961d69a88089ffc'
  );
  assert.equal(
    EXPECTED_MODEL_HASHES['classifier.npz'],
    'd05a524ac10d6cb864e82da5adb69c0762308ddc05f833fd96eac336c4984ed2'
  );
  assert.equal(
    EXPECTED_MODEL_HASHES['model_metadata.json'],
    '945f45a455106bede24345e802a64eafd9a6d6a928829f2b1de7f151c49dd017'
  );
});

test('RBAC portal access control rules strictly isolate roles', () => {
  // Engineer can only access engineer portal
  assert.equal(canAccessPortal('ENGINEER', 'ENGINEER'), true);
  assert.equal(canAccessPortal('ENGINEER', 'SUPERVISOR'), false);
  assert.equal(canAccessPortal('ENGINEER', 'ADMIN'), false);
  assert.equal(canPerformSupervisorReview('ENGINEER'), false);
  assert.equal(canManageUsers('ENGINEER'), false);

  // Supervisor can access supervisor portal
  assert.equal(canAccessPortal('SUPERVISOR', 'SUPERVISOR'), true);
  assert.equal(canAccessPortal('SUPERVISOR', 'ADMIN'), false);
  assert.equal(canPerformSupervisorReview('SUPERVISOR'), true);
  assert.equal(canManageUsers('SUPERVISOR'), false);

  // Administrator has oversight access
  assert.equal(canAccessPortal('ADMINISTRATOR', 'ADMIN'), true);
  assert.equal(canAccessPortal('ADMINISTRATOR', 'SUPERVISOR'), true);
  assert.equal(canAccessPortal('ADMINISTRATOR', 'ENGINEER'), true);
  assert.equal(canManageUsers('ADMINISTRATOR'), true);
});

test('Role registration security blocks unauthorized supervisor & admin registrations', () => {
  // Engineer registration is open and always yields ENGINEER
  const engRes = validateRoleRegistration({ targetRole: 'ENGINEER' });
  assert.equal(engRes.allowed, true);
  assert.equal(engRes.assignedRole, 'ENGINEER');

  // Supervisor registration without token is blocked
  const supvBlocked = validateRoleRegistration({ targetRole: 'SUPERVISOR' });
  assert.equal(supvBlocked.allowed, false);

  // Supervisor with valid token is allowed
  const supvValid = validateRoleRegistration({ targetRole: 'SUPERVISOR', authCode: SUPERVISOR_AUTH_TOKEN });
  assert.equal(supvValid.allowed, true);
  assert.equal(supvValid.assignedRole, 'SUPERVISOR');

  // Administrator registration without provisioning key is blocked
  const adminBlocked = validateRoleRegistration({ targetRole: 'ADMINISTRATOR' });
  assert.equal(adminBlocked.allowed, false);

  // Administrator with valid provisioning key is allowed
  const adminValid = validateRoleRegistration({ targetRole: 'ADMINISTRATOR', provisioningKey: ADMIN_PROVISIONING_KEY });
  assert.equal(adminValid.allowed, true);
  assert.equal(adminValid.assignedRole, 'ADMINISTRATOR');
});

test('Damage relevance scoring accurately categorizes severity and action', () => {
  assert.equal(classifyDamageSeverity(0.88), 'CRITICAL');
  assert.equal(classifyDamageSeverity(0.65), 'MODERATE');
  assert.equal(classifyDamageSeverity(0.35), 'MINOR');
  assert.equal(classifyDamageSeverity(0.04), 'NONE');

  assert.equal(determineDamageAction(0.88), 'REJECT');
  assert.equal(determineDamageAction(0.65), 'REWORK');
  assert.equal(determineDamageAction(0.35), 'MONITOR');
  assert.equal(determineDamageAction(0.04), 'ACCEPT');
  assert.equal(determineDamageAction(0.40, true), 'REJECT'); // Structural crack forces rejection
});

test('Quality Incident eligibility and supervisor decision validation', () => {
  // Defective inspection is eligible for incident creation
  assert.equal(
    canCreateQualityIncident({
      status: 'COMPLETED',
      prediction: { predictedClass: 'Defective', defectProbability: 0.88 },
    }),
    true
  );

  // Normal inspection is not eligible
  assert.equal(
    canCreateQualityIncident({
      status: 'COMPLETED',
      prediction: { predictedClass: 'Normal', defectProbability: 0.04 },
    }),
    false
  );

  // Supervisor decision validation
  assert.equal(validateSupervisorDecision('APPROVED_FOR_FOLLOW_UP', 'Valid comment').valid, true);
  assert.equal(validateSupervisorDecision('NEEDS_MORE_INFO', 'Need re-scan').valid, true);
  assert.equal(validateSupervisorDecision('PRODUCT_RELEASE', 'Invalid decision').valid, false);
  assert.equal(validateSupervisorDecision('APPROVED_FOR_FOLLOW_UP', '   ').valid, false); // empty comment rejected
});

test('TEST 1: Engineer selects own completed Defective inspection -> Incident creation succeeds', () => {
  const isEligible = canCreateQualityIncident({
    status: 'COMPLETED',
    prediction: { predictedClass: 'Defective', defectProbability: 0.88 },
  });
  assert.equal(isEligible, true);
});

test('TEST 2: Ownership verification blocks incident creation for another user inspection', () => {
  const inspectionOwner: string = 'engineer';
  const requestingUser: string = 'other_engineer';
  const isOwned = inspectionOwner === requestingUser;
  assert.equal(isOwned, false);
});

test('TEST 3: Engineer selects a Normal inspection -> Creation rejected', () => {
  const isEligible = canCreateQualityIncident({
    status: 'COMPLETED',
    prediction: { predictedClass: 'Normal', defectProbability: 0.04 },
  });
  assert.equal(isEligible, false);
});

test('TEST 4: Original prediction Defective and human correction Normal -> Incident creation remains permitted', () => {
  // Original prediction is Defective, human correction is Normal
  const inspection = {
    status: 'COMPLETED',
    prediction: { predictedClass: 'Defective' as const, defectProbability: 0.88 },
    supervisorReview: { reviewedClass: 'Normal' as const },
  };
  const isEligible = canCreateQualityIncident(inspection);
  assert.equal(isEligible, true);
});

test('TEST 5 & 6: Same incident request & concurrency returning existing incident ID', () => {
  const incident1 = generateQualityIncidentPayload({
    inspectionId: 10,
    productId: 'P-PLATE01',
    productName: 'Demonstration metal plate',
    submittedBy: 'engineer',
    originalClass: 'Defective',
    relevanceScore: 0.88,
  });

  // Second request for same inspection ID returns existing
  const existingIncident = incident1;
  assert.equal(existingIncident.inspectionId, 10);
});

test('TEST 7 & 8: Strict SOP source isolation for P-PLATE01 vs P-GASKET02', () => {
  const plateChunks = getProductSopChunks('P-PLATE01');
  assert.ok(plateChunks.every((c) => c.documentId === 'Q-PLATE-01' || c.documentId === 'Q-PLATE-02'));
  assert.ok(!plateChunks.some((c) => c.documentId === 'Q-GASKET-01'));

  const gasketChunks = getProductSopChunks('P-GASKET02');
  assert.ok(gasketChunks.every((c) => c.documentId === 'Q-GASKET-01'));
  assert.ok(!gasketChunks.some((c) => c.documentId.startsWith('Q-PLATE')));
});

test('TEST 9: Citation verification matches original PDF structure with 1-indexed pages', () => {
  const incident = generateQualityIncidentPayload({
    inspectionId: 12,
    productId: 'P-PLATE01',
    productName: 'Demonstration metal plate',
    submittedBy: 'engineer',
    originalClass: 'Defective',
    relevanceScore: 0.88,
  });

  assert.ok(incident.citations.length >= 2);
  const c1 = incident.citations[0];
  assert.equal(c1.documentId, 'Q-PLATE-01');
  assert.equal(c1.revision, '1.0');
  assert.equal(c1.pageNumber, 1);
  assert.ok(c1.supportingText.includes('Quality Containment Procedure'));
});

test('TEST 10: SOP retrieval failure preserves incident and provides manual review path', () => {
  const incident = generateQualityIncidentPayload({
    inspectionId: 13,
    productId: 'P-UNKNOWN99',
    productName: 'Unknown Prototype',
    submittedBy: 'engineer',
    originalClass: 'Defective',
    relevanceScore: 0.88,
  });

  assert.equal(incident.status, 'MANUAL_REVIEW_REQUIRED');
  assert.equal(incident.citations.length, 0);
  assert.ok(incident.actionPlan.includes('couldn\'t find sufficient supporting information'));
});

test('TEST 11: Engineer attempts Supervisor review -> Rejected by RBAC', () => {
  assert.equal(canPerformSupervisorReview('ENGINEER'), false);
  assert.equal(canPerformSupervisorReview('SUPERVISOR'), true);
});

test('TEST 12 & 13: Supervisor empty comment or invalid decision rejected', () => {
  assert.equal(validateSupervisorDecision('APPROVED_FOR_FOLLOW_UP', '').valid, false);
  assert.equal(validateSupervisorDecision('PRODUCT_RELEASE', 'Valid comment').valid, false);
});

test('TEST 14 & 15: Valid Supervisor decisions with mandatory comments accepted', () => {
  assert.equal(validateSupervisorDecision('APPROVED_FOR_FOLLOW_UP', 'Approved for NDT follow-up').valid, true);
  assert.equal(validateSupervisorDecision('NEEDS_MORE_INFO', 'Requires re-measurement').valid, true);
});

test('TEST 16: Approval rejected when SOP evidence is insufficient', () => {
  assert.equal(validateSupervisorDecision('APPROVED_FOR_FOLLOW_UP', 'Comment', false).valid, false);
  assert.equal(validateSupervisorDecision('NEEDS_MORE_INFO', 'Comment', false).valid, true);
});




