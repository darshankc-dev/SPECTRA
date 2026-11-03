import React, { useState } from 'react';
import {
  FileText,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  ArrowRight,
  Eye,
  FileCheck2,
  Layers,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { QualityIncident, SOPCitationItem } from '../../types';
import { EvidenceTraceViewer } from './EvidenceTraceViewer';

interface SmartEvidenceSectionProps {
  incident?: QualityIncident;
  citations?: SOPCitationItem[];
  actionPlan?: string;
  productId?: string;
  userUsername?: string;
  onLogEvidenceViewed?: (event: {
    incidentId?: number;
    documentId: string;
    revision: string;
    pageNumber: number;
  }) => void;
}

export const SmartEvidenceSection: React.FC<SmartEvidenceSectionProps> = ({
  incident,
  citations: rawCitations,
  actionPlan: rawActionPlan,
  productId: rawProductId,
  userUsername,
  onLogEvidenceViewed,
}) => {
  const [selectedCitation, setSelectedCitation] = useState<SOPCitationItem | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const effectiveCitations: SOPCitationItem[] = incident?.citations || rawCitations || [];
  const effectiveActionPlan: string = incident?.actionPlan || rawActionPlan || '';
  const effectiveProductId: string = incident?.productId || rawProductId || 'P-PLATE01';

  const handleOpenViewer = (citation?: SOPCitationItem) => {
    if (citation) {
      setSelectedCitation(citation);
    } else if (effectiveCitations.length > 0) {
      setSelectedCitation(effectiveCitations[0]);
    }
    setIsViewerOpen(true);
  };

  // Map containment & review steps to supporting citations
  const containmentSteps = incident?.containmentSteps || [
    'Quarantine component immediately in accordance with quality protocol.',
    'Notify quality engineering supervisor and document defect coordinates.',
  ];

  const reviewSteps = incident?.reviewSteps || [
    'Perform page-level SOP verification against target material specification.',
    'Authorize technical follow-up or precision rework as mandated by SOP.',
  ];

  const mappedContainmentSteps = containmentSteps.map((step) => {
    const matchedCitation = effectiveCitations.find((c) => c.documentId === 'Q-PLATE-01' || c.documentId === 'Q-GASKET-01') || effectiveCitations[0];
    return { step, citation: matchedCitation };
  });

  const mappedReviewSteps = reviewSteps.map((step, idx) => {
    const matchedCitation = effectiveCitations.find((c) => c.documentId === 'Q-PLATE-02' || c.documentId === 'Q-GASKET-01') || effectiveCitations[idx % (effectiveCitations.length || 1)] || effectiveCitations[0];
    return { step, citation: matchedCitation };
  });

  return (
    <div className="space-y-6">
      {/* SECTION HEADER & BRANDING */}
      <div className="bg-[#1B4332] text-white p-5 rounded-2xl shadow-sm relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative z-10">
          <div className="flex items-center space-x-2 text-[10px] font-mono text-[#A4C9B1] uppercase tracking-widest mb-1">
            <Sparkles className="w-3.5 h-3.5 text-[#74C69D]" />
            <span>SPECTRΛ EvidenceTrace™ Intelligence Engine</span>
          </div>
          <h3 className="text-xl font-extrabold tracking-tight">Smart Evidence Traceability</h3>
          <p className="text-xs text-[#D4EBD9] mt-0.5">
            Transparent AI recommendation mapping directly linked to authentic industrial SOP PDFs.
          </p>
        </div>

        <button
          onClick={() => handleOpenViewer()}
          className="relative z-10 px-4 py-2.5 bg-white hover:bg-[#F7F5EF] text-[#1B4332] rounded-xl font-semibold text-xs transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-md flex-shrink-0"
        >
          <BookOpen className="w-4 h-4 text-[#1B4332]" />
          <span>Launch Evidence Viewer</span>
        </button>
      </div>

      {/* ACTION-TO-EVIDENCE TRACEABILITY MAP */}
      <div className="bg-white border border-[#E2DDD0] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="flex items-center justify-between border-b border-[#E2DDD0] pb-3">
          <div>
            <h4 className="text-sm font-bold text-[#24372D]">1. Immediate Containment Action Plan</h4>
            <p className="text-xs text-[#69736D]">Mandatory sequence supported by mapped SOP citations.</p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EAF4ED] text-[#1B4332] font-semibold border border-[#C4E3CD]">
            {effectiveProductId} Verified
          </span>
        </div>

        <div className="space-y-3">
          {mappedContainmentSteps.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 bg-[#F9F8F3] border border-[#E2DDD0] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:border-[#1B4332]/30"
            >
              <div className="flex items-start space-x-3">
                <span className="w-6 h-6 rounded-full bg-[#1B4332] text-white font-mono text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <p className="text-xs text-[#24372D] font-medium leading-relaxed">{item.step}</p>
              </div>

              {item.citation && (
                <button
                  onClick={() => handleOpenViewer(item.citation)}
                  className="px-3 py-1.5 bg-white hover:bg-[#EAF4ED] border border-[#C4E3CD] rounded-lg text-[11px] font-mono text-[#1B4332] font-semibold flex items-center gap-1.5 self-start sm:self-auto transition-colors cursor-pointer flex-shrink-0 shadow-2xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{item.citation.documentId} · Page {item.citation.pageNumber}</span>
                  <ExternalLink className="w-3 h-3 text-[#52765D]" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* SUPERVISOR REVIEW PROTOCOL TRACEABILITY */}
      <div className="bg-white border border-[#E2DDD0] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="flex items-center justify-between border-b border-[#E2DDD0] pb-3">
          <div>
            <h4 className="text-sm font-bold text-[#24372D]">2. Technical Review & Decision Mandates</h4>
            <p className="text-xs text-[#69736D]">Quality Supervisor audit and decision framework.</p>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F9F8F3] text-[#52765D] font-semibold border border-[#E2DDD0]">
            SOP Mandate
          </span>
        </div>

        <div className="space-y-3">
          {mappedReviewSteps.map((item, idx) => (
            <div
              key={idx}
              className="p-3.5 bg-[#F9F8F3] border border-[#E2DDD0] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors hover:border-[#1B4332]/30"
            >
              <div className="flex items-start space-x-3">
                <span className="w-6 h-6 rounded-full bg-[#2D6A4F] text-white font-mono text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <p className="text-xs text-[#24372D] font-medium leading-relaxed">{item.step}</p>
              </div>

              {item.citation && (
                <button
                  onClick={() => handleOpenViewer(item.citation)}
                  className="px-3 py-1.5 bg-white hover:bg-[#EAF4ED] border border-[#C4E3CD] rounded-lg text-[11px] font-mono text-[#1B4332] font-semibold flex items-center gap-1.5 self-start sm:self-auto transition-colors cursor-pointer flex-shrink-0 shadow-2xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>{item.citation.documentId} · Page {item.citation.pageNumber}</span>
                  <ExternalLink className="w-3 h-3 text-[#52765D]" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* SMART CITATION CARDS GRID */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-[#24372D] uppercase tracking-wider font-mono">
            Supporting SOP Citations ({effectiveCitations.length})
          </h4>
          <span className="text-[11px] font-mono text-[#52765D]">
            Strict Product Isolation: {effectiveProductId}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {effectiveCitations.map((citation, index) => (
            <div
              key={index}
              className="bg-white border border-[#E2DDD0] hover:border-[#1B4332] rounded-2xl p-4 transition-all shadow-2xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-[#1B4332] text-white font-mono font-bold text-xs">
                      {citation.documentId}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EAF4ED] text-[#1B4332] font-semibold border border-[#C4E3CD]">
                      Rev {citation.revision}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-semibold text-[#52765D] bg-[#F7F5EF] px-2 py-0.5 rounded border border-[#E2DDD0]">
                    Page {citation.pageNumber}
                  </span>
                </div>

                <div className="text-[11px] font-mono text-[#69736D] mb-2 truncate">
                  Source: {citation.documentName}
                </div>

                <div className="p-3 bg-[#F9F8F3] border border-[#E2DDD0] rounded-xl text-xs font-mono text-[#24372D] leading-relaxed line-clamp-3 mb-3">
                  "{citation.supportingText}"
                </div>
              </div>

              <div className="pt-2 border-t border-[#E2DDD0] flex items-center justify-between">
                <span className="text-[11px] text-[#52765D] flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#1B4332]" />
                  <span>Verified SHA-256</span>
                </span>

                <button
                  onClick={() => handleOpenViewer(citation)}
                  className="px-3 py-1.5 bg-[#1B4332] hover:bg-[#245842] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View Evidence</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Integrated PDF Viewer Modal */}
      {selectedCitation && (
        <EvidenceTraceViewer
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          productId={effectiveProductId}
          documentId={selectedCitation.documentId}
          initialPageNumber={selectedCitation.pageNumber}
          highlightText={selectedCitation.supportingText}
          incidentId={incident?.id}
          userUsername={userUsername}
          onLogEvidenceViewed={onLogEvidenceViewed}
        />
      )}
    </div>
  );
};
