import React, { useState } from 'react';
import {
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Crosshair,
  AlertTriangle,
  Info,
  Flame,
  CheckCircle2,
  Tag,
  Eye,
  Sliders,
} from 'lucide-react';
import { DiskDamageAnalysis, DamageItem } from '../../types';
import { DAMAGE_TYPE_LABELS } from '../../lib/damageDetector';

interface DamageVisualizerProps {
  imageUrl: string;
  analysis: DiskDamageAnalysis;
  onSelectDamage?: (damage: DamageItem) => void;
  selectedDamageId?: string;
  className?: string;
}

export const DamageVisualizer: React.FC<DamageVisualizerProps> = ({
  imageUrl,
  analysis,
  onSelectDamage,
  selectedDamageId,
  className = '',
}) => {
  const [showBoxes, setShowBoxes] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showSectors, setShowSectors] = useState(false);
  const [activeDamageId, setActiveDamageId] = useState<string | null>(
    selectedDamageId || analysis.detectedDamages[0]?.id || null
  );
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'annotated' | 'split' | 'raw'>('annotated');

  const activeDamage = analysis.detectedDamages.find((d) => d.id === activeDamageId) || analysis.detectedDamages[0];

  const handleBoxClick = (dmg: DamageItem) => {
    setActiveDamageId(dmg.id);
    if (onSelectDamage) onSelectDamage(dmg);
  };

  const isPristine = analysis.overallSeverity === 'NONE' || analysis.detectedDamages.every(d => d.type === 'PRISTINE_SURFACE');

  return (
    <div className={`flex flex-col bg-white border border-[#e2ddd0] rounded-2xl overflow-hidden shadow-sm ${className}`}>
      {/* Top Engineering Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-[#faf8f3] border-b border-[#e2ddd0] text-xs text-[#55675c] gap-2">
        <div className="flex items-center gap-2">
          <Crosshair className="w-4 h-4 text-[#1b4332]" />
          <span className="font-semibold tracking-wide text-[#122419] uppercase text-[11px]">
            Optical Damage Detection
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#eaf4ed] text-[#1b4332] font-semibold border border-[#c4e3cd]">
            {analysis.detectedDamages.length} {analysis.detectedDamages.length === 1 ? 'region' : 'regions'}
          </span>
        </div>

        {/* Layer Controls */}
        <div className="flex items-center gap-1.5 bg-[#ede8dc] p-1 rounded-lg border border-[#ded7c7]">
          <button
            type="button"
            onClick={() => setShowBoxes(!showBoxes)}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all text-[11px] font-semibold cursor-pointer ${
              showBoxes
                ? 'bg-[#1b4332] text-white shadow-xs'
                : 'text-[#5a6c60] hover:text-[#122419]'
            }`}
            title="Toggle Bounding Boxes"
          >
            <Tag className="w-3 h-3" />
            Boxes
          </button>

          <button
            type="button"
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all text-[11px] font-semibold cursor-pointer ${
              showHeatmap
                ? 'bg-[#b45309] text-white shadow-xs'
                : 'text-[#5a6c60] hover:text-[#122419]'
            }`}
            title="Toggle Thermal / Stress Heatmap"
          >
            <Flame className="w-3 h-3" />
            Heatmap
          </button>

          <button
            type="button"
            onClick={() => setShowSectors(!showSectors)}
            className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-all text-[11px] font-semibold cursor-pointer ${
              showSectors
                ? 'bg-[#2d6a4f] text-white shadow-xs'
                : 'text-[#5a6c60] hover:text-[#122419]'
            }`}
            title="Toggle Concentric Inspection Rings"
          >
            <Layers className="w-3 h-3" />
            Sectors
          </button>
        </div>

        {/* View Mode & Zoom */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#ede8dc] rounded-lg p-0.5 border border-[#ded7c7] text-[11px]">
            <button
              type="button"
              onClick={() => setViewMode('annotated')}
              className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                viewMode === 'annotated' ? 'bg-white text-[#122419] shadow-xs' : 'text-[#5a6c60] hover:text-[#122419]'
              }`}
            >
              Annotated
            </button>
            <button
              type="button"
              onClick={() => setViewMode('split')}
              className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                viewMode === 'split' ? 'bg-white text-[#122419] shadow-xs' : 'text-[#5a6c60] hover:text-[#122419]'
              }`}
            >
              Split View
            </button>
            <button
              type="button"
              onClick={() => setViewMode('raw')}
              className={`px-2.5 py-1 rounded-md transition font-medium cursor-pointer ${
                viewMode === 'raw' ? 'bg-white text-[#122419] shadow-xs' : 'text-[#5a6c60] hover:text-[#122419]'
              }`}
            >
              Raw
            </button>
          </div>

          <div className="flex items-center gap-1 bg-[#ede8dc] px-1.5 py-1 rounded-lg border border-[#ded7c7]">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(1, z - 0.25))}
              className="p-1 text-[#5a6c60] hover:text-[#122419] transition cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-[10px] text-[#405448] font-semibold w-8 text-center">{Math.round(zoomLevel * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
              className="p-1 text-[#5a6c60] hover:text-[#122419] transition cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            {zoomLevel > 1 && (
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="p-1 text-[#5a6c60] hover:text-[#122419] transition cursor-pointer"
                title="Reset Zoom"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Image Viewport Area (High-Precision Dark Optical Chamber) */}
      <div className="relative bg-[#0c1712] flex items-center justify-center min-h-[380px] p-4 overflow-hidden select-none">
        {viewMode === 'split' ? (
          /* Split Comparison View */
          <div className="grid grid-cols-2 gap-3 w-full max-w-4xl">
            <div className="flex flex-col items-center">
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#98b8a3] mb-1.5 flex items-center gap-1">
                <Eye className="w-3 h-3" /> Raw Optical Sensor Stream
              </div>
              <div className="relative rounded-xl overflow-hidden border border-[#234230] bg-black aspect-square max-h-[340px] w-full flex items-center justify-center">
                <img
                  src={imageUrl}
                  alt="Raw plate"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#52b788] mb-1.5 flex items-center gap-1">
                <Crosshair className="w-3 h-3" /> AI Damage Detection Map
              </div>
              <div className="relative rounded-xl overflow-hidden border border-[#2d6a4f] bg-black aspect-square max-h-[340px] w-full flex items-center justify-center">
                <img
                  src={imageUrl}
                  alt="AI Annotated plate"
                  className="w-full h-full object-contain filter contrast-105"
                />
                <OverlaySvg
                  analysis={analysis}
                  showBoxes={showBoxes}
                  showHeatmap={showHeatmap}
                  showSectors={showSectors}
                  activeDamageId={activeDamageId}
                  onSelectDamage={handleBoxClick}
                />
              </div>
            </div>
          </div>
        ) : (
          /* Single Viewport with Zoom */
          <div
            className="relative flex items-center justify-center transition-transform duration-200 ease-out"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            <div className="relative max-w-[460px] max-h-[460px] aspect-square rounded-xl overflow-hidden border border-[#234230] shadow-inner bg-black">
              <img
                src={imageUrl}
                alt="Inspected plate"
                className="w-full h-full object-contain select-none pointer-events-none"
              />

              {viewMode === 'annotated' && (
                <OverlaySvg
                  analysis={analysis}
                  showBoxes={showBoxes}
                  showHeatmap={showHeatmap}
                  showSectors={showSectors}
                  activeDamageId={activeDamageId}
                  onSelectDamage={handleBoxClick}
                />
              )}
            </div>
          </div>
        )}

        {/* Floating Calibration & Relevance Badge */}
        <div className="absolute bottom-3 left-4 flex items-center gap-2.5 bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-[#e2ddd0] shadow-md text-[11px]">
          <span className="text-[#55675c] font-medium">Relevance Score:</span>
          <span
            className={`font-mono font-bold text-sm ${
              analysis.relevanceScore >= 0.75
                ? 'text-[#991b1b]'
                : analysis.relevanceScore >= 0.5
                ? 'text-[#b45309]'
                : 'text-[#16a34a]'
            }`}
          >
            {(analysis.relevanceScore * 100).toFixed(1)}%
          </span>
          <span className="text-[#dcd5c4]">|</span>
          <span className="text-[#55675c] font-medium">Structural Health:</span>
          <span className="font-mono font-bold text-[#1b4332]">{analysis.structuralHealthIndex}%</span>
        </div>

        {/* Engine Badge */}
        <div className="absolute top-3 right-4 bg-[#14261d]/90 backdrop-blur-md px-2.5 py-1 rounded-md border border-[#234230] text-[10px] font-mono text-[#c5ded0]">
          Engine: <span className="text-[#52b788] font-semibold">{analysis.detectionEngine === 'GEMINI_AI_VISION' ? 'Gemini 3.8 Flash' : 'CV Multi-Spectral'}</span>
        </div>
      </div>

      {/* Selected Damage Detail Drawer */}
      {activeDamage && (
        <div className="p-4 bg-[#faf8f3] border-t border-[#e2ddd0] flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-3">
            <div
              className="p-2.5 rounded-xl mt-0.5 flex-shrink-0"
              style={{
                backgroundColor: DAMAGE_TYPE_LABELS[activeDamage.type]?.bg || '#eaf4ed',
                color: DAMAGE_TYPE_LABELS[activeDamage.type]?.color || '#1b4332',
              }}
            >
              {activeDamage.severity === 'CRITICAL' ? (
                <AlertTriangle className="w-5 h-5 text-[#991b1b]" />
              ) : activeDamage.severity === 'NONE' ? (
                <CheckCircle2 className="w-5 h-5 text-[#16a34a]" />
              ) : (
                <Info className="w-5 h-5 text-[#b45309]" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-[#122419] text-sm">
                  {activeDamage.name || DAMAGE_TYPE_LABELS[activeDamage.type]?.label}
                </span>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor: DAMAGE_TYPE_LABELS[activeDamage.type]?.bg,
                    color: DAMAGE_TYPE_LABELS[activeDamage.type]?.color,
                  }}
                >
                  {activeDamage.severity}
                </span>
                <span className="font-mono text-[#76877c] text-[11px]">
                  Region {activeDamage.id}
                </span>
              </div>
              <p className="text-[#55675c] mt-0.5 text-xs leading-relaxed">
                {activeDamage.locationDescription} — {activeDamage.dimensionsEstimateMm || 'Localized'}
              </p>
              {activeDamage.engineeringNotes && (
                <p className="text-[#76877c] italic text-xs mt-0.5">
                  &ldquo;{activeDamage.engineeringNotes}&rdquo;
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 self-end md:self-auto flex-shrink-0">
            <div className="text-right">
              <div className="text-[10px] text-[#76877c] uppercase tracking-wider font-mono">Damage Relevance</div>
              <div
                className="font-mono text-base font-bold"
                style={{ color: DAMAGE_TYPE_LABELS[activeDamage.type]?.color }}
              >
                {(activeDamage.relevanceScore * 100).toFixed(1)}%
              </div>
            </div>
            <div className="text-right border-l border-[#ded7c7] pl-3.5">
              <div className="text-[10px] text-[#76877c] uppercase tracking-wider font-mono">Confidence</div>
              <div className="font-mono text-base font-bold text-[#1b4332]">
                {(activeDamage.confidence * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface OverlaySvgProps {
  analysis: DiskDamageAnalysis;
  showBoxes: boolean;
  showHeatmap: boolean;
  showSectors: boolean;
  activeDamageId: string | null;
  onSelectDamage: (dmg: DamageItem) => void;
}

const OverlaySvg: React.FC<OverlaySvgProps> = ({
  analysis,
  showBoxes,
  showHeatmap,
  showSectors,
  activeDamageId,
  onSelectDamage,
}) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className="absolute inset-0 w-full h-full pointer-events-auto cursor-crosshair"
      preserveAspectRatio="none"
    >
      <defs>
        {/* Radial gradients for thermal/damage heatmap */}
        <radialGradient id="stressHeatRadial" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#40916c" stopOpacity="0.05" />
          <stop offset="40%" stopColor="#d97706" stopOpacity="0.3" />
          <stop offset="75%" stopColor="#dc2626" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0.1" />
        </radialGradient>
      </defs>

      {/* Sector inspection concentric rings */}
      {showSectors && (
        <g strokeDasharray="1.5,1.5" fill="none">
          {/* Center Hub */}
          <circle cx="50" cy="50" r="14" stroke="#52b788" strokeWidth="0.5" strokeOpacity="0.8" />
          {/* Inner Web */}
          <circle cx="50" cy="50" r="26" stroke="#74c69d" strokeWidth="0.5" strokeOpacity="0.7" />
          {/* Primary Friction Band Inner */}
          <circle cx="50" cy="50" r="41" stroke="#2d6a4f" strokeWidth="0.75" strokeOpacity="0.9" />
          {/* Outer Bevel / Chamfer */}
          <circle cx="50" cy="50" r="48" stroke="#d97706" strokeWidth="0.5" strokeOpacity="0.7" />

          {/* Radial Crosshairs */}
          <line x1="50" y1="2" x2="50" y2="98" stroke="#74c69d" strokeWidth="0.25" strokeOpacity="0.4" />
          <line x1="2" y1="50" x2="98" y2="50" stroke="#74c69d" strokeWidth="0.25" strokeOpacity="0.4" />
        </g>
      )}

      {/* Heatmap Layer */}
      {showHeatmap && (
        <circle cx="50" cy="50" r="46" fill="url(#stressHeatRadial)" className="animate-pulse" />
      )}

      {/* Bounding Boxes for Detected Damages */}
      {showBoxes &&
        analysis.detectedDamages.map((dmg) => {
          if (dmg.type === 'PRISTINE_SURFACE') return null;
          const { ymin, xmin, ymax, xmax } = dmg.boundingBox;
          const width = Math.max(4, xmax - xmin);
          const height = Math.max(4, ymax - ymin);
          const isActive = dmg.id === activeDamageId;
          const config = DAMAGE_TYPE_LABELS[dmg.type] || { color: '#dc2626', label: 'Damage' };

          return (
            <g
              key={dmg.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectDamage(dmg);
              }}
              className="cursor-pointer group"
            >
              {/* Highlight fill */}
              <rect
                x={xmin}
                y={ymin}
                width={width}
                height={height}
                fill={config.color}
                fillOpacity={isActive ? 0.28 : 0.14}
                rx="0.8"
                className="transition-all duration-150"
              />

              {/* Bounding Box Border */}
              <rect
                x={xmin}
                y={ymin}
                width={width}
                height={height}
                fill="none"
                stroke={config.color}
                strokeWidth={isActive ? '0.9' : '0.6'}
                strokeDasharray={isActive ? 'none' : '2,1'}
                rx="0.8"
                className="transition-all duration-150"
              />

              {/* Corner Reticle Accents */}
              <line x1={xmin - 0.5} y1={ymin} x2={xmin + 1.5} y2={ymin} stroke="#FFFFFF" strokeWidth="0.6" />
              <line x1={xmin} y1={ymin - 0.5} x2={xmin} y2={ymin + 1.5} stroke="#FFFFFF" strokeWidth="0.6" />
              <line x1={xmax - 1.5} y1={ymax} x2={xmax + 0.5} y2={ymax} stroke="#FFFFFF" strokeWidth="0.6" />
              <line x1={xmax} y1={ymax - 1.5} x2={xmax} y2={ymax + 0.5} stroke="#FFFFFF" strokeWidth="0.6" />

              {/* Label Tag Header */}
              <rect
                x={xmin}
                y={Math.max(1, ymin - 3.5)}
                width={Math.min(32, width + 8)}
                height="3.2"
                fill={config.color}
                rx="0.4"
                opacity={0.95}
              />
              <text
                x={xmin + 1}
                y={Math.max(3.2, ymin - 1.2)}
                fill="#FFFFFF"
                fontSize="2.1"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {dmg.id} | {(dmg.relevanceScore * 100).toFixed(0)}%
              </text>
            </g>
          );
        })}
    </svg>
  );
};
