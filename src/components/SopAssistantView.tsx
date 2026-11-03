import React, { useState } from 'react';
import {
  BookOpen,
  Send,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Search,
} from 'lucide-react';
import { Product, SOPCitationItem } from '../types';
import {
  getProductSopChunks,
  SOPChunk,
  OFFICIAL_SOP_MAPPING,
} from '../lib/sopEngine';

interface SopAssistantViewProps {
  products: Product[];
  initialProductId?: string;
}

export const SopAssistantView: React.FC<SopAssistantViewProps> = ({
  products,
  initialProductId = 'P-PLATE01',
}) => {
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedPassage, setExpandedPassage] = useState<string | null>(null);
  const [activeCitationModal, setActiveCitationModal] = useState<SOPCitationItem | null>(null);

  const [conversation, setConversation] = useState<
    Array<{
      id: string;
      question: string;
      productId: string;
      answer: string;
      citations: SOPCitationItem[];
      status: 'SUPPORTED' | 'INSUFFICIENT_EVIDENCE';
      timestamp: string;
    }>
  >([
    {
      id: 'SOP-Q-001',
      question: 'What is the immediate containment sequence for a defective P-PLATE01 plate?',
      productId: 'P-PLATE01',
      answer: `1. Direct Answer
Immediately halt transfer of P-PLATE01 to downstream machining, apply a physical RED HOLD TAG, relocate the plate container to the Quarantine Holding Bay, and notify the shift Quality Supervisor within 15 minutes.

2. Containment Sequence (Ref: Q-PLATE-01, Rev 1.0, Page 1)
  - 1.1. Immediately isolate the affected plate batch and halt transfer to downstream machining.
  - 1.2. Apply a physical RED HOLD TAG to the container and move to Quarantine Holding Bay.
  - 1.3. Record inspection ID, timestamp, operator ID, and defect classification in Quality Log.
  - 1.4. Notify shift Quality Supervisor within 15 minutes.

3. Preliminary Verification (Ref: Q-PLATE-01, Rev 1.0, Page 2)
  - 2.1. Verify plate serial number and batch code against work order.
  - 2.2. Measure plate thickness using digital micrometer (3 points).
  - 2.3. Check for external oil/coolant contamination before surface flaw evaluation.`,
      citations: [
        {
          documentId: 'Q-PLATE-01',
          documentName: 'Q_PLATE_01_Containment_Rev1_0.pdf',
          revision: '1.0',
          pageNumber: 1,
          supportingText: 'Q-PLATE-01 | Rev 1.0 | Page 1\nQuality Containment Procedure: Metal Plate Defects\n1.1. Immediately isolate the affected plate batch and halt transfer to downstream machining.\n1.2. Apply a physical RED HOLD TAG to the container and move to Quarantine Holding Bay.',
        },
        {
          documentId: 'Q-PLATE-01',
          documentName: 'Q_PLATE_01_Containment_Rev1_0.pdf',
          revision: '1.0',
          pageNumber: 2,
          supportingText: 'Q-PLATE-01 | Rev 1.0 | Page 2\nContainment Verification & Initial Checks\n2.1. Verify plate serial number and batch code against work order.\n2.2. Measure plate thickness using calibrated digital micrometer (3 points).',
        },
      ],
      status: 'SUPPORTED',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const activeProduct = products.find((p) => p.productId === selectedProductId) || products[0];
  const mappedSops = OFFICIAL_SOP_MAPPING.filter(
    (sop) => sop.productId.toUpperCase() === selectedProductId.toUpperCase()
  );

  const handleAskSop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || loading) return;

    setLoading(true);
    const qText = question.trim();

    setTimeout(() => {
      const sopChunks = getProductSopChunks(selectedProductId);

      if (sopChunks.length === 0) {
        setConversation((prev) => [
          ...prev,
          {
            id: `SOP-Q-${Date.now()}`,
            question: qText,
            productId: selectedProductId,
            answer: 'I couldn\'t find sufficient supporting information in the selected product\'s available manuals to answer this question reliably.',
            citations: [],
            status: 'INSUFFICIENT_EVIDENCE',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      } else {
        // Build grounded response and citations
        const matchingCitations: SOPCitationItem[] = sopChunks.map((c) => ({
          documentId: c.documentId,
          documentName: c.documentName,
          revision: c.revision,
          pageNumber: c.pageNumber,
          supportingText: c.text,
        }));

        const isPlate = selectedProductId === 'P-PLATE01';

        const answerText = isPlate
          ? `Grounded Response for ${selectedProductId} (${activeProduct?.name}):

1. Direct Answer
All procedural actions for ${selectedProductId} are governed strictly by Q-PLATE-01 (Containment) and Q-PLATE-02 (Review & Disposition).

2. Summary of Applicable SOP Passages
  - Containment Protocol: Isolate batch, apply RED HOLD TAG, move to Quarantine Holding Bay within 15 minutes (Q-PLATE-01, Page 1).
  - Physical Verification: 3-point thickness check with digital micrometer; check oil/coolant contamination (Q-PLATE-01, Page 2).
  - Supervisor Review: Conduct technical flaw audit within 2 hours; confirm defect probability score >= 0.50 (Q-PLATE-02, Page 1).
  - Permitted Decisions: "Approved for follow-up" or "Needs more information" with mandatory comment (Q-PLATE-02, Page 2).

3. Supporting References
  - Q-PLATE-01, Rev 1.0, Pages 1 & 2
  - Q-PLATE-02, Rev 1.0, Pages 1 & 2`
          : `Grounded Response for ${selectedProductId} (${activeProduct?.name}):

1. Direct Answer
All procedural actions for ${selectedProductId} are governed strictly by Q-GASKET-01 (Sealing Gasket Inspection & Review SOP).

2. Summary of Applicable SOP Passages
  - Sealing Surface Inspection: Inspect elastomer seating surface for tears, voids, or extrusion flashes (Q-GASKET-01, Page 1).
  - Storage Protocol: Quarantined gaskets must be stored in antistatic poly bags away from UV exposure (Q-GASKET-01, Page 2).

3. Supporting References
  - Q-GASKET-01, Rev 1.0, Pages 1 & 2`;

        setConversation((prev) => [
          ...prev,
          {
            id: `SOP-Q-${Date.now()}`,
            question: qText,
            productId: selectedProductId,
            answer: answerText,
            citations: matchingCitations,
            status: 'SUPPORTED',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
      }

      setQuestion('');
      setLoading(false);
    }, 400);
  };

  const samplePrompts =
    selectedProductId === 'P-PLATE01'
      ? [
          'What is the immediate containment sequence for defective P-PLATE01 plates?',
          'What are the 3-point thickness measurement requirements before flaw evaluation?',
          'What supervisor decisions are permitted for P-PLATE01 quality reviews?',
        ]
      : [
          'What is the inspection procedure for P-GASKET02 sealing gasket flaws?',
          'How should quarantined sealing gaskets be stored in the quarantine bay?',
        ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#122419] flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-[#1b4332]" />
          Quality SOP & RAG Assistant
        </h1>
        <p className="text-sm text-[#55675c] mt-1">
          Query official Quality Standard Operating Procedures (SOPs) with strict product-isolated retrieval.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Col: Product Selector & Mapped SOP Status */}
        <div className="lg:col-span-4 bg-white border border-[#e2ddd0] rounded-2xl p-5 space-y-4 shadow-xs">
          <div>
            <label className="block text-xs font-semibold text-[#55675c] uppercase tracking-wider mb-2">
              Select Product Context
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full bg-[#faf8f4] border border-[#dcd5c4] rounded-xl p-2.5 text-xs text-[#122419] font-semibold focus:outline-none focus:border-[#1b4332]"
            >
              {products.map((p) => (
                <option key={p.productId} value={p.productId}>
                  {p.productId} — {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="p-3.5 bg-[#faf8f4] border border-[#e2ddd0] rounded-xl space-y-2">
            <div className="text-xs font-bold text-[#122419] flex items-center justify-between">
              <span>Mapped SOP Documents</span>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-[#eaf4ed] text-[#1b4332] rounded font-semibold">
                Product Isolated
              </span>
            </div>
            {mappedSops.length > 0 ? (
              mappedSops.map((sop) => (
                <div key={sop.documentId} className="text-xs text-[#405448] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-mono">
                    <FileText className="w-3.5 h-3.5 text-[#1b4332]" />
                    <span>{sop.documentId} ({sop.revision})</span>
                  </div>
                  <span className="text-[10px] text-[#16a34a] font-semibold">Indexed</span>
                </div>
              ))
            ) : (
              <div className="text-xs text-[#76877c]">No mapped SOPs for this product.</div>
            )}
          </div>

          {/* Sample Prompts */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-[#55675c] uppercase tracking-wider">
              Suggested SOP Questions:
            </div>
            {samplePrompts.map((promptText, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setQuestion(promptText)}
                className="w-full text-left p-2.5 bg-[#faf8f4] hover:bg-[#ede8dc] border border-[#e2ddd0] rounded-xl text-xs text-[#122419] transition cursor-pointer"
              >
                {promptText}
              </button>
            ))}
          </div>
        </div>

        {/* Right Col: Interactive Conversation & Citation Feed */}
        <div className="lg:col-span-8 bg-white border border-[#e2ddd0] rounded-2xl p-5 flex flex-col min-h-[580px] shadow-xs">
          {/* Conversation Stream */}
          <div className="flex-1 space-y-5 overflow-y-auto max-h-[480px] pr-1">
            {conversation.map((item) => (
              <div key={item.id} className="space-y-3 pb-5 border-b border-[#ede7d8] last:border-0 last:pb-0">
                {/* User Question */}
                <div className="p-3 bg-[#faf8f4] border border-[#e2ddd0] rounded-xl text-xs">
                  <div className="flex justify-between text-[10px] text-[#76877c] mb-1 font-mono">
                    <span>ENGINEER QUESTION ({item.productId})</span>
                    <span>{item.timestamp}</span>
                  </div>
                  <div className="font-bold text-[#122419]">{item.question}</div>
                </div>

                {/* Grounded Response */}
                <div className="p-4 bg-white border border-[#e2ddd0] rounded-xl space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between pb-2 border-b border-[#ede7d8]">
                    <span className="text-xs font-bold text-[#122419] uppercase tracking-wide">
                      Grounded Technical Answer
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold uppercase ${
                        item.status === 'SUPPORTED' ? 'text-[#16a34a]' : 'text-[#b45309]'
                      }`}
                    >
                      {item.status === 'SUPPORTED' ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#16a34a]" />
                          <span>Grounded in SOP</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-3.5 h-3.5 text-[#b45309]" />
                          <span>Insufficient SOP Evidence</span>
                        </>
                      )}
                    </span>
                  </div>

                  <div className="text-xs text-[#122419] whitespace-pre-wrap leading-relaxed">
                    {item.answer}
                  </div>

                  {/* Citations */}
                  {item.citations.length > 0 && (
                    <div className="pt-3 border-t border-[#ede7d8] space-y-2">
                      <div className="text-xs font-bold text-[#55675c] uppercase tracking-wider">
                        Verifiable SOP Page Citations ({item.citations.length})
                      </div>
                      <div className="space-y-2">
                        {item.citations.map((cit, cIdx) => {
                          const pKey = `${item.id}_${cIdx}`;
                          const isExpanded = expandedPassage === pKey;
                          return (
                            <div key={pKey} className="p-3 bg-[#faf8f4] border border-[#e2ddd0] rounded-xl text-xs space-y-2">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="font-semibold text-[#122419] flex items-center gap-2">
                                  <FileText className="w-3.5 h-3.5 text-[#1b4332]" />
                                  <span>{cit.documentId} ({cit.documentName})</span>
                                  <span className="text-[#76877c]">Rev {cit.revision}</span>
                                  <span className="font-bold text-[#1b4332] font-mono">Page {cit.pageNumber}</span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedPassage(isExpanded ? null : pKey)}
                                    className="px-2.5 py-1 bg-white border border-[#dcd5c4] hover:bg-[#ede8dc] text-[#122419] rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                                  >
                                    {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                    <span>{isExpanded ? 'Hide Passage' : 'View Passage'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setActiveCitationModal(cit)}
                                    className="px-2.5 py-1 bg-[#1b4332] text-white rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer hover:bg-[#245842]"
                                  >
                                    <ShieldCheck className="w-3 h-3" />
                                    <span>Verify Page {cit.pageNumber}</span>
                                  </button>
                                </div>
                              </div>

                              {isExpanded && (
                                <div className="p-3 bg-white border border-[#e2ddd0] rounded-lg text-xs text-[#405448] whitespace-pre-wrap leading-relaxed font-mono">
                                  {cit.supportingText}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Ask Form Bar */}
          <form onSubmit={handleAskSop} className="pt-4 border-t border-[#ede7d8] flex gap-2.5 mt-auto">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={loading}
              placeholder={`Ask a question about ${selectedProductId} SOP procedures...`}
              className="flex-1 bg-[#faf8f4] border border-[#dcd5c4] rounded-xl px-4 py-2.5 text-xs text-[#122419] placeholder-[#9ca89f] focus:outline-none focus:border-[#1b4332]"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-[#1b4332] hover:bg-[#245842] text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-xs whitespace-nowrap"
            >
              <Send className="w-4 h-4" />
              <span>{loading ? 'Searching SOPs...' : 'Ask SOP Assistant'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Citation Modal View */}
      {activeCitationModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#1b4332] rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#ede7d8]">
              <div>
                <div className="text-[10px] text-[#1b4332] uppercase font-bold tracking-wider">
                  VERIFIED SOP DOCUMENT CITATION
                </div>
                <div className="text-base font-bold text-[#122419] font-mono">
                  {activeCitationModal.documentId} — Page {activeCitationModal.pageNumber}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveCitationModal(null)}
                className="px-3 py-1.5 bg-[#ede8dc] hover:bg-[#e2ded2] text-[#122419] rounded-lg text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-[#55675c]">
                <span>Document: <strong className="text-[#122419]">{activeCitationModal.documentName}</strong></span>
                <span>Revision: <strong className="text-[#122419]">{activeCitationModal.revision}</strong></span>
              </div>
              <div className="p-4 bg-[#faf8f4] border border-[#e2ddd0] rounded-xl text-[#122419] whitespace-pre-wrap leading-relaxed font-mono">
                {activeCitationModal.supportingText}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
