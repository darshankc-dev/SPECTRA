import React, { useState } from 'react';
import {
  Eye,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
  Search,
  Filter,
  BarChart3,
  FileText,
  User,
  LogOut,
  ArrowLeft,
  ChevronRight,
  SlidersHorizontal,
  Layers,
  ArrowRight,
  Activity,
  History,
  Copy,
  Check,
  Crosshair,
  Wrench,
  AlertTriangle,
  BookOpen,
} from 'lucide-react';
import {
  UserProfile,
  Inspection,
  Product,
  PredictedClass,
  SupervisorReview,
  ReviewRevision,
} from '../../types';
import { DamageVisualizer } from '../engineer/DamageVisualizer';
import { DAMAGE_TYPE_LABELS } from '../../lib/damageDetector';

import { SopAssistantView } from '../SopAssistantView';
import { validateSupervisorDecision } from '../../spectra_rules';
import { SmartEvidenceSection } from '../evidence/SmartEvidenceSection';

interface SupervisorPortalProps {
  currentUser: UserProfile;
  products: Product[];
  inspections: Inspection[];
  onUpdateInspectionReview: (inspectionId: number, review: SupervisorReview) => void;
  onUpdateIncidentSupervisorDecision?: (
    inspectionId: number,
    decision: 'APPROVED_FOR_FOLLOW_UP' | 'NEEDS_MORE_INFO',
    comment: string
  ) => void;
  onSignOut: () => void;
  onRequestAdminActionBlocked?: () => void;
  onGoToPrevious?: () => void;
}

type SupervisorTab =
  | 'REVIEW_QUEUE'
  | 'QUALITY_INCIDENTS'
  | 'QUALITY_RAG'
  | 'ALL_INSPECTIONS'
  | 'CONFIRMED'
  | 'CORRECTED'
  | 'EVIDENCE_PASSPORT';

export const SupervisorPortal: React.FC<SupervisorPortalProps> = ({
  currentUser,
  products,
  inspections,
  onUpdateInspectionReview,
  onUpdateIncidentSupervisorDecision,
  onSignOut,
  onRequestAdminActionBlocked,
  onGoToPrevious,
}) => {
  const [activeTab, setActiveTab] = useState<SupervisorTab>('REVIEW_QUEUE');
  const [selectedInspectionId, setSelectedInspectionId] = useState<number>(
    inspections.find((i) => !i.supervisorReview)?.id || inspections[0]?.id || 1
  );

  // Review action modal state
  const [reviewComment, setReviewComment] = useState('');
  const [reviewClassChoice, setReviewClassChoice] = useState<PredictedClass>('Defective');
  const [adjustedRelevance, setAdjustedRelevance] = useState<number>(0.85);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedSha, setCopiedSha] = useState(false);

  // Active selected inspection
  const activeInspection =
    inspections.find((i) => i.id === selectedInspectionId) || inspections[0];

  // Queue: prioritized by relevance score and pending review status
  const unreviewedInspections = inspections
    .filter((i) => i.prediction && !i.supervisorReview)
    .sort((a, b) => {
      const relA = a.damageAnalysis?.relevanceScore || a.prediction?.defectProbability || 0;
      const relB = b.damageAnalysis?.relevanceScore || b.prediction?.defectProbability || 0;
      return relB - relA; // high relevance first
    });

  const confirmedInspections = inspections.filter(
    (i) => i.supervisorReview?.reviewStatus === 'CONFIRMED'
  );
  const correctedInspections = inspections.filter(
    (i) => i.supervisorReview?.reviewStatus === 'CORRECTED'
  );

  const handleSelectInspection = (insp: Inspection) => {
    setSelectedInspectionId(insp.id);
    setReviewComment('');
    setActionError(null);
    const predClass = insp.prediction?.predictedClass || 'Defective';
    setReviewClassChoice(predClass);
    setAdjustedRelevance(insp.damageAnalysis?.relevanceScore ?? (insp.prediction?.defectProbability ?? 0.5));
  };

  const handleSubmitReview = (overrideClass?: PredictedClass) => {
    if (!activeInspection) return;
    if (!reviewComment.trim()) {
      setActionError('Supervisory justification and engineering rationale are required.');
      return;
    }

    const chosenClass = overrideClass || reviewClassChoice;
    const aiClass = activeInspection.prediction?.predictedClass || 'Normal';
    const isConfirmed = chosenClass === aiClass;

    const existingReview = activeInspection.supervisorReview;
    const revision: ReviewRevision = {
      id: Date.now(),
      reviewerUsername: currentUser.username,
      previousClass: existingReview ? existingReview.reviewedClass : aiClass,
      newClass: chosenClass,
      previousRelevanceScore: activeInspection.damageAnalysis?.relevanceScore,
      newRelevanceScore: adjustedRelevance,
      comment: reviewComment,
      createdAt: new Date().toISOString(),
    };

    const newReview: SupervisorReview = {
      id: existingReview ? existingReview.id : Date.now(),
      reviewerUsername: currentUser.username,
      reviewedClass: chosenClass,
      reviewStatus: isConfirmed ? 'CONFIRMED' : 'CORRECTED',
      reviewedRelevanceScore: adjustedRelevance,
      comment: reviewComment,
      createdAt: existingReview ? existingReview.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      revisions: existingReview ? [...existingReview.revisions, revision] : [revision],
    };

    onUpdateInspectionReview(activeInspection.id, newReview);
    setReviewComment('');
    setActionError(null);
  };

  return (
    <div className="min-h-screen bg-[#f7f5ef] text-[#13251c] flex flex-col font-sans selection:bg-[#1b4332] selection:text-white">
      {/* Top Enterprise Header */}
      <header className="border-b border-[#e2ddd0] bg-[#faf8f3]/95 backdrop-blur sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-9 h-9 bg-gradient-to-br from-[#2d6a4f] to-[#1b4332] rounded-xl flex items-center justify-center text-white font-mono font-black text-lg shadow-sm">
              Λ
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-base text-[#122419] tracking-wider">SPECTRΛ</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#ebf5ed] text-[#2d6a4f] border border-[#c0e3ce] uppercase font-semibold">
                  Supervisor Quality Audit Console
                </span>
              </div>
              <div className="text-[11px] text-[#55675c] hidden sm:block">
                Disk Damage Verification · Relevance Calibration · Quality Sign-off
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-white border border-[#ded7c7] text-xs shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#2d6a4f]"></span>
              <span className="text-[#55675c]">Auditor:</span>
              <span className="text-[#122419] font-semibold">{currentUser.fullName}</span>
              <span className="text-[#2d6a4f] font-mono font-medium">(@{currentUser.username})</span>
            </div>

            {onGoToPrevious && (
              <button
                type="button"
                onClick={onGoToPrevious}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#ede8dc] hover:bg-[#e2ded2] border border-[#dcd5c4] text-[#122419] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#55675c]" />
                <span>Go to Previous</span>
              </button>
            )}

            <button
              onClick={onSignOut}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#ede8dc] hover:bg-[#e2ded2] border border-[#dcd5c4] text-[#122419] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-[#55675c]" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Sidebar */}
        <aside className="w-full md:w-64 bg-[#faf8f3] border-r border-[#e2ddd0] p-4 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-[#76877c] font-semibold">
              Audit Workbench
            </div>

            <button
              onClick={() => setActiveTab('REVIEW_QUEUE')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors text-left cursor-pointer ${
                activeTab === 'REVIEW_QUEUE'
                  ? 'bg-[#1b4332] text-white shadow-xs'
                  : 'text-[#405448] hover:bg-[#ede8dc] hover:text-[#122419]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <AlertCircle className="w-4 h-4 text-[#b45309]" />
                <span>Damage Review Queue</span>
              </div>
              <span className="px-2 py-0.5 bg-white text-[#1b4332] text-[10px] rounded-md font-bold font-mono">
                {unreviewedInspections.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('QUALITY_INCIDENTS')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors text-left cursor-pointer ${
                activeTab === 'QUALITY_INCIDENTS'
                  ? 'bg-[#1b4332] text-white shadow-xs'
                  : 'text-[#405448] hover:bg-[#ede8dc] hover:text-[#122419]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <AlertTriangle className="w-4 h-4 text-[#b45309]" />
                <span>Quality Incidents</span>
              </div>
              <span className="px-2 py-0.5 bg-white text-[#1b4332] text-[10px] rounded-md font-bold font-mono">
                {inspections.filter((i) => i.qualityIncident).length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('QUALITY_RAG')}
              className={`w-full flex items-center space-x-2.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors text-left cursor-pointer ${
                activeTab === 'QUALITY_RAG'
                  ? 'bg-[#1b4332] text-white shadow-xs'
                  : 'text-[#405448] hover:bg-[#ede8dc] hover:text-[#122419]'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Quality SOP Assistant</span>
            </button>

            <button
              onClick={() => setActiveTab('ALL_INSPECTIONS')}
              className={`w-full flex items-center space-x-2.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors text-left cursor-pointer ${
                activeTab === 'ALL_INSPECTIONS'
                  ? 'bg-[#1b4332] text-white shadow-xs'
                  : 'text-[#405448] hover:bg-[#ede8dc] hover:text-[#122419]'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>All Disks ({inspections.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('CONFIRMED')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors text-left cursor-pointer ${
                activeTab === 'CONFIRMED'
                  ? 'bg-[#1b4332] text-white shadow-xs'
                  : 'text-[#405448] hover:bg-[#ede8dc] hover:text-[#122419]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#16a34a]" />
                <span>Confirmed ({confirmedInspections.length})</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('CORRECTED')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors text-left cursor-pointer ${
                activeTab === 'CORRECTED'
                  ? 'bg-[#1b4332] text-white shadow-xs'
                  : 'text-[#405448] hover:bg-[#ede8dc] hover:text-[#122419]'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <SlidersHorizontal className="w-4 h-4 text-[#b45309]" />
                <span>Rework / Overrides ({correctedInspections.length})</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('EVIDENCE_PASSPORT')}
              className={`w-full flex items-center space-x-2.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-colors text-left cursor-pointer ${
                activeTab === 'EVIDENCE_PASSPORT'
                  ? 'bg-[#1b4332] text-white shadow-xs'
                  : 'text-[#405448] hover:bg-[#ede8dc] hover:text-[#122419]'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Audit Passport</span>
            </button>
          </div>

          {/* Quick Metrics */}
          <div className="mt-6 pt-4 border-t border-[#ede7d8] space-y-2.5 text-xs bg-white p-3.5 rounded-xl border border-[#e2ddd0]">
            <div className="text-[10px] uppercase text-[#76877c] font-semibold tracking-wider">Review Metrics</div>
            <div className="flex justify-between items-center text-[#55675c]">
              <span>Pending Review:</span>
              <span className="text-[#b45309] font-bold font-mono">{unreviewedInspections.length}</span>
            </div>
            <div className="flex justify-between items-center text-[#55675c]">
              <span>Audit Concordance:</span>
              <span className="text-[#16a34a] font-bold font-mono">
                {inspections.length > 0
                  ? `${Math.round(((confirmedInspections.length + 1) / (confirmedInspections.length + correctedInspections.length + 1)) * 100)}%`
                  : '100%'}
              </span>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {/* TAB: REVIEW QUEUE */}
          {activeTab === 'REVIEW_QUEUE' && (
            <div className="space-y-6 max-w-6xl">
              <div>
                <h1 className="text-2xl font-bold text-[#122419] flex items-center gap-2">
                  <AlertCircle className="w-6 h-6 text-[#b45309]" />
                  Supervisor Damage Verification & Sign-off
                </h1>
                <p className="text-sm text-[#55675c] mt-1">
                  Examine detected damage bounding boxes, verify AI operational relevance scores, and authorize scrap vs precision rework decisions.
                </p>
              </div>

              {/* Two Column Layout: Left Queue / Right Workbench */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left 4 Cols: Sorted Queue */}
                <div className="lg:col-span-4 space-y-3">
                  <div className="text-xs font-semibold text-[#55675c] uppercase tracking-wider flex items-center justify-between">
                    <span>Priority Review Queue</span>
                    <span className="text-[10px] text-[#1b4332] font-semibold bg-[#eaf4ed] px-2 py-0.5 rounded">High Relevance First</span>
                  </div>

                  <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                    {unreviewedInspections.length > 0 ? (
                      unreviewedInspections.map((insp) => {
                        const isSelected = insp.id === selectedInspectionId;
                        const analysis = insp.damageAnalysis;
                        const relevance = analysis?.relevanceScore ?? (insp.prediction?.defectProbability ?? 0);
                        const pType = analysis?.primaryDamageType || 'RADIAL_CRACK';
                        const typeConfig = DAMAGE_TYPE_LABELS[pType] || { label: pType, color: '#dc2626' };

                        return (
                          <div
                            key={insp.id}
                            onClick={() => handleSelectInspection(insp)}
                            className={`p-3.5 rounded-xl border cursor-pointer text-xs transition-all ${
                              isSelected
                                ? 'bg-[#eaf4ed] border-[#1b4332] text-[#122419] shadow-xs'
                                : 'bg-white border-[#e2ddd0] text-[#55675c] hover:bg-[#faf8f4]'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#122419] font-mono">{insp.productId}</span>
                              <span
                                className={`text-[11px] font-bold font-mono ${
                                  relevance >= 0.75 ? 'text-[#991b1b]' : 'text-[#b45309]'
                                }`}
                              >
                                {(relevance * 100).toFixed(1)}% Rel
                              </span>
                            </div>

                            <div className="text-[11px] font-semibold mt-1" style={{ color: typeConfig.color }}>
                              {typeConfig.label}
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-[#76877c] mt-1.5 pt-1.5 border-t border-[#ede7d8]">
                              <span>By @{insp.submittedBy}</span>
                              <span className="truncate max-w-[120px] font-mono">{insp.originalFilename}</span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="bg-white border border-[#e2ddd0] p-6 text-center text-[#76877c] text-xs rounded-2xl shadow-xs">
                        <CheckCircle2 className="w-8 h-8 text-[#16a34a] mx-auto mb-2" />
                        <span>All staged disks reviewed and certified.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right 8 Cols: Interactive Visual Verification Workbench */}
                <div className="lg:col-span-8 space-y-4">
                  {activeInspection && activeInspection.damageAnalysis ? (
                    <div className="space-y-4">
                      {/* Damage Visualizer Component */}
                      <DamageVisualizer
                        imageUrl={activeInspection.imageUrl}
                        analysis={activeInspection.damageAnalysis}
                      />

                      {/* Supervisory Review Decision Card */}
                      <div className="bg-white border border-[#e2ddd0] p-6 rounded-2xl space-y-4 shadow-xs">
                        <div className="flex items-center justify-between border-b border-[#ede7d8] pb-3">
                          <span className="font-bold text-[#122419] text-sm flex items-center gap-2">
                            <Wrench className="w-4 h-4 text-[#1b4332]" />
                            Supervisor Review & Disposition Form
                          </span>
                          <span className="text-xs text-[#55675c] font-mono">
                            Disk ID: #{activeInspection.id}
                          </span>
                        </div>

                        {/* Relevance Calibration Slider */}
                        <div>
                          <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
                            <span className="text-[#55675c]">Calibrated Damage Relevance Score:</span>
                            <span className="text-[#1b4332] font-bold text-sm font-mono">
                              {(adjustedRelevance * 100).toFixed(1)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.00"
                            max="1.00"
                            step="0.01"
                            value={adjustedRelevance}
                            onChange={(e) => setAdjustedRelevance(parseFloat(e.target.value))}
                            className="w-full accent-[#1b4332] bg-[#ede8dc] rounded-lg h-2 cursor-pointer"
                          />
                          <div className="flex justify-between text-[10px] text-[#76877c] mt-1 font-mono">
                            <span>0.0% (Cosmetic / Nominal)</span>
                            <span>50.0% (Threshold)</span>
                            <span>100.0% (Catastrophic Burst Risk)</span>
                          </div>
                        </div>

                        {/* Rationale Comment Box */}
                        <div>
                          <label className="block text-xs font-semibold text-[#55675c] mb-1.5 uppercase tracking-wide">
                            Supervisory Engineering Justification (Mandatory):
                          </label>
                          <textarea
                            rows={3}
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            placeholder="State reason for confirming scrap or overriding to precision surface rework..."
                            className="w-full bg-[#faf8f4] border border-[#dcd5c4] rounded-xl p-3 text-xs text-[#122419] placeholder-[#9ca89f] focus:outline-none focus:border-[#1b4332]"
                          />
                          {actionError && (
                            <p className="text-xs text-[#991b1b] mt-1 flex items-center gap-1 font-medium">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {actionError}
                            </p>
                          )}
                        </div>

                        {/* Decision Action Buttons */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                          <button
                            type="button"
                            onClick={() => handleSubmitReview('Defective')}
                            className="py-3 px-3 bg-[#991b1b] hover:bg-[#7f1d1d] text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>Confirm Scrap (Reject)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSubmitReview('Defective')}
                            className="py-3 px-3 bg-[#b45309] hover:bg-[#92400e] text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                          >
                            <Wrench className="w-4 h-4" />
                            <span>Authorize Rework</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSubmitReview('Normal')}
                            className="py-3 px-3 bg-[#1b4332] hover:bg-[#245842] text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Override (Fit for Service)</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-[#e2ddd0] p-12 text-center text-[#76877c] text-xs rounded-2xl shadow-xs">
                      Select an inspection from the left queue to open the review workbench.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: QUALITY INCIDENTS */}
          {activeTab === 'QUALITY_INCIDENTS' && (
            <div className="space-y-6 max-w-5xl">
              <div>
                <h1 className="text-2xl font-bold text-[#122419] flex items-center gap-2">
                  <AlertTriangle className="w-6 h-6 text-[#b45309]" />
                  Quality Incidents Queue & Supervisor Decisions
                </h1>
                <p className="text-sm text-[#55675c] mt-1">
                  Audit SOP-grounded Quality Incident Action Plans generated from defective plate scans.
                </p>
              </div>

              <div className="space-y-5">
                {inspections.filter((i) => i.qualityIncident).length === 0 ? (
                  <div className="bg-white border border-[#e2ddd0] p-12 text-center text-[#76877c] text-xs rounded-2xl shadow-xs">
                    No Quality Incidents have been created yet. Engineers can create an incident from any defective inspection.
                  </div>
                ) : (
                  inspections
                    .filter((i) => i.qualityIncident)
                    .map((insp) => {
                      const incident = insp.qualityIncident!;
                      return (
                        <div key={insp.id} className="bg-white border-2 border-[#1b4332] rounded-2xl p-6 space-y-5 shadow-xs">
                          {/* Incident Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#ede7d8] gap-2">
                            <div>
                              <div className="text-[10px] font-mono uppercase text-[#1b4332] font-bold">
                                INCIDENT #{incident.id} · INSPECTION #{insp.id}
                              </div>
                              <h2 className="text-base font-bold text-[#122419] mt-0.5">
                                {incident.productId} — {incident.productName}
                              </h2>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-[#55675c]">Original AI Prediction:</span>
                              <span className="px-2.5 py-0.5 bg-[#fdf2f2] text-[#991b1b] border border-[#f5c6cb] text-xs font-bold rounded-md font-mono">
                                {incident.originalPredictionClass} ({(incident.originalRelevanceScore * 100).toFixed(1)}%)
                              </span>
                            </div>
                          </div>

                          {/* Grounded Action Plan Box */}
                          <div className="space-y-2">
                            <div className="text-xs font-bold text-[#122419] uppercase tracking-wide">
                              SOP Grounded Action Plan:
                            </div>
                            <div className="p-4 bg-[#faf8f4] border border-[#e2ddd0] rounded-xl text-xs text-[#122419] font-mono whitespace-pre-wrap leading-relaxed">
                              {incident.actionPlan}
                            </div>
                          </div>

                          <SmartEvidenceSection
                            citations={incident.citations}
                            actionPlan={incident.actionPlan}
                            productId={incident.productId}
                          />

                          {/* Supervisor Decision Form */}
                          <div className="p-4 bg-[#f8faf4] border border-[#c4e3cd] rounded-xl space-y-3">
                            <div className="text-xs font-bold text-[#1b4332] uppercase tracking-wide">
                              Supervisor Incident Decision & Mandate
                            </div>

                            {incident.supervisorDecision ? (
                              <div className="space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-[#122419]">
                                    Decision Status: {incident.supervisorDecision === 'APPROVED_FOR_FOLLOW_UP' ? 'Approved for follow-up' : 'Needs more information'}
                                  </span>
                                  <span className="text-[11px] text-[#76877c] font-mono">@{incident.supervisorUsername}</span>
                                </div>
                                <div className="p-2.5 bg-white border border-[#e2ddd0] rounded-lg text-xs italic text-slate-800">
                                  &ldquo;{incident.supervisorComment}&rdquo;
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const comment = prompt('Enter mandatory supervisory explanation comment for Approved for follow-up:');
                                      if (comment && comment.trim() && onUpdateIncidentSupervisorDecision) {
                                        onUpdateIncidentSupervisorDecision(insp.id, 'APPROVED_FOR_FOLLOW_UP', comment.trim());
                                      } else if (comment !== null) {
                                        alert('A non-empty explanation comment is mandatory for supervisor decisions.');
                                      }
                                    }}
                                    className="py-2.5 px-4 bg-[#1b4332] hover:bg-[#245842] text-white font-semibold text-xs rounded-xl transition cursor-pointer shadow-xs whitespace-nowrap"
                                  >
                                    Approve for Follow-Up
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const comment = prompt('Enter mandatory supervisory explanation comment for Needs more information:');
                                      if (comment && comment.trim() && onUpdateIncidentSupervisorDecision) {
                                        onUpdateIncidentSupervisorDecision(insp.id, 'NEEDS_MORE_INFO', comment.trim());
                                      } else if (comment !== null) {
                                        alert('A non-empty explanation comment is mandatory for supervisor decisions.');
                                      }
                                    }}
                                    className="py-2.5 px-4 bg-[#b45309] hover:bg-[#92400e] text-white font-semibold text-xs rounded-xl transition cursor-pointer shadow-xs whitespace-nowrap"
                                  >
                                    Request More Information
                                  </button>
                                </div>
                              </div>
                            )}

                            <div className="p-2.5 bg-white/80 border border-[#e2ddd0] rounded-lg text-[11px] text-[#55675c]">
                              <strong>Mandatory Policy Notice:</strong> Supervisor approval indicates agreement for technical follow-up (NDT, lab metallurgical evaluation, or rework) ONLY and MUST NEVER be interpreted as product clearance, shipment, or release authorization. Original AI prediction remains immutable.
                            </div>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          )}

          {/* TAB: QUALITY RAG ASSISTANT */}
          {activeTab === 'QUALITY_RAG' && (
            <SopAssistantView products={products} />
          )}

          {/* TAB: ALL INSPECTIONS */}
          {activeTab === 'ALL_INSPECTIONS' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-[#122419] flex items-center gap-2">
                <Layers className="w-6 h-6 text-[#1b4332]" />
                All Disk & Plate Inspections
              </h1>
              <div className="bg-white border border-[#e2ddd0] rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#faf8f4] border-b border-[#e2ddd0] text-[#76877c] uppercase text-[10px] font-semibold">
                    <tr>
                      <th className="p-3.5">ID</th>
                      <th className="p-3.5">Product</th>
                      <th className="p-3.5">Primary Damage</th>
                      <th className="p-3.5">Relevance Score</th>
                      <th className="p-3.5">Review Status</th>
                      <th className="p-3.5">Auditor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ede7d8]">
                    {inspections.map((insp) => {
                      const analysis = insp.damageAnalysis;
                      const relevance = analysis?.relevanceScore ?? (insp.prediction?.defectProbability ?? 0);
                      const pType = analysis?.primaryDamageType || 'RADIAL_CRACK';
                      const config = DAMAGE_TYPE_LABELS[pType] || { label: pType, color: '#dc2626' };

                      return (
                        <tr key={insp.id} className="hover:bg-[#faf8f4] transition-colors">
                          <td className="p-3.5 font-bold text-[#122419] font-mono">#{insp.id}</td>
                          <td className="p-3.5">{insp.productName}</td>
                          <td className="p-3.5 font-semibold" style={{ color: config.color }}>{config.label}</td>
                          <td className="p-3.5 font-bold font-mono">{(relevance * 100).toFixed(1)}%</td>
                          <td className="p-3.5">
                            <span
                              className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                insp.supervisorReview?.reviewStatus === 'CONFIRMED'
                                  ? 'bg-[#eaf4ed] text-[#16a34a] border border-[#c4e3cd]'
                                  : insp.supervisorReview?.reviewStatus === 'CORRECTED'
                                  ? 'bg-[#fef3c7] text-[#b45309] border border-[#fde68a]'
                                  : 'bg-[#faf8f4] text-[#76877c] border border-[#e2ddd0]'
                              }`}
                            >
                              {insp.supervisorReview?.reviewStatus || 'UNREVIEWED'}
                            </span>
                          </td>
                          <td className="p-3.5 text-[#55675c] font-mono">
                            {insp.supervisorReview ? `@${insp.supervisorReview.reviewerUsername}` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: CONFIRMED */}
          {activeTab === 'CONFIRMED' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-[#122419] flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-[#16a34a]" />
                Confirmed Quality Dispositions ({confirmedInspections.length})
              </h1>
              <div className="space-y-3 text-xs">
                {confirmedInspections.map((insp) => (
                  <div key={insp.id} className="p-4 bg-white border border-[#e2ddd0] rounded-xl flex items-start justify-between shadow-xs">
                    <div>
                      <div className="font-bold text-[#122419] text-sm">
                        {insp.productName} (#{insp.id}) — AI Verdict Confirmed
                      </div>
                      <div className="text-[#55675c] mt-1">
                        Auditor @{insp.supervisorReview?.reviewerUsername}: &ldquo;{insp.supervisorReview?.comment}&rdquo;
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-[#eaf4ed] text-[#16a34a] border border-[#c4e3cd] rounded-lg font-bold text-[11px]">
                      CONFIRMED
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB: CORRECTED */}
          {activeTab === 'CORRECTED' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold text-[#122419] flex items-center gap-2">
                <SlidersHorizontal className="w-6 h-6 text-[#b45309]" />
                Supervisor Overrides & Rework Authorizations ({correctedInspections.length})
              </h1>
              <div className="space-y-3 text-xs">
                {correctedInspections.length > 0 ? (
                  correctedInspections.map((insp) => (
                    <div key={insp.id} className="p-4 bg-white border border-[#e2ddd0] rounded-xl flex items-start justify-between shadow-xs">
                      <div>
                        <div className="font-bold text-[#122419] text-sm">
                          {insp.productName} (#{insp.id}) — Corrected to {insp.supervisorReview?.reviewedClass}
                        </div>
                        <div className="text-[#55675c] mt-1">
                          Auditor @{insp.supervisorReview?.reviewerUsername}: &ldquo;{insp.supervisorReview?.comment}&rdquo;
                        </div>
                      </div>
                      <span className="px-2.5 py-1 bg-[#fef3c7] text-[#b45309] border border-[#fde68a] rounded-lg font-bold text-[11px]">
                        OVERRIDDEN
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-[#76877c] bg-white border border-[#e2ddd0] rounded-2xl shadow-xs">
                    No supervisor overrides recorded.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: EVIDENCE PASSPORT */}
          {activeTab === 'EVIDENCE_PASSPORT' && (
            <div className="space-y-6 max-w-4xl">
              <h1 className="text-2xl font-bold text-[#122419] flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-[#1b4332]" />
                Supervisor Audited Evidence Passport
              </h1>
              {activeInspection ? (
                <div className="bg-white border-2 border-[#1b4332] p-6 rounded-2xl space-y-4 shadow-sm">
                  <div className="flex justify-between border-b border-[#ede7d8] pb-3">
                    <span className="text-sm font-bold text-[#122419] font-mono">PASSPORT #DEP-{activeInspection.id}</span>
                    <span className="text-xs text-[#1b4332] font-semibold bg-[#eaf4ed] px-2 py-0.5 rounded">Supervisor Verified</span>
                  </div>
                  <div className="text-xs text-[#405448] space-y-2 font-mono">
                    <div>Product: <strong className="text-[#122419]">{activeInspection.productName}</strong></div>
                    <div className="break-all">Image SHA-256: <strong className="text-[#1b4332]">{activeInspection.imageSha256}</strong></div>
                    <div>
                      Relevance Score: <strong className="text-[#991b1b]">{((activeInspection.damageAnalysis?.relevanceScore || 0) * 100).toFixed(1)}%</strong>
                    </div>
                    <div>Review Status: <strong className="text-[#16a34a]">{activeInspection.supervisorReview?.reviewStatus || 'UNREVIEWED'}</strong></div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
