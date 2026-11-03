import React from 'react';
import {
  ShieldCheck,
  Cpu,
  Layers,
  Activity,
  ArrowRight,
  ArrowLeft,
  Lock,
  Eye,
  CheckCircle2,
  FileCheck2,
  Database,
  Terminal,
  Server,
  Zap,
  SlidersHorizontal,
  ChevronRight,
  Sparkles,
  Award,
  Compass
} from 'lucide-react';
import { MODEL_VERSION, DECISION_THRESHOLD } from '../lib/modelData';

interface LandingPageProps {
  onNavigateAuth: (role: 'ADMINISTRATOR' | 'ENGINEER' | 'SUPERVISOR', mode: 'login' | 'register') => void;
  onQuickLaunchDashboard: (role: 'ADMINISTRATOR' | 'ENGINEER' | 'SUPERVISOR') => void;
  onGoToPrevious?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigateAuth,
  onQuickLaunchDashboard,
  onGoToPrevious,
}) => {
  return (
    <div className="min-h-screen bg-[#f7f5ef] text-[#13251c] flex flex-col font-sans selection:bg-[#1b4332] selection:text-white">
      {/* Top Enterprise Banner */}
      <header className="border-b border-[#e2ddd0] bg-[#faf8f3]/95 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 bg-gradient-to-br from-[#1b4332] to-[#2d6a4f] rounded-lg flex items-center justify-center shadow-sm text-white">
              <span className="font-mono font-black text-lg tracking-tighter">Λ</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold tracking-widest text-lg text-[#122419]">SPECTRΛ</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-[#eaf4ed] text-[#1b4332] font-semibold border border-[#c4e2cd]">
                  v3.0 AI
                </span>
              </div>
              <div className="text-[11px] text-[#55675c] tracking-wide hidden sm:block">
                Industrial Visual Quality Assurance & Evidence Platform
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-6 text-xs text-[#55675c]">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-[#16a34a] animate-pulse"></span>
              <span>MODEL: <strong className="text-[#122419] font-mono">{MODEL_VERSION}</strong></span>
            </div>
            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#1b4332]" />
              <span>THRESHOLD: <strong className="text-[#122419] font-mono">τ = {DECISION_THRESHOLD.toFixed(2)}</strong></span>
            </div>
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#2d6a4f]" />
              <span>SECURITY: <strong className="text-[#122419] font-mono">RBAC ENFORCED</strong></span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onGoToPrevious && (
              <button
                type="button"
                onClick={onGoToPrevious}
                className="flex items-center space-x-1.5 px-3 py-2 bg-[#ede8dc] hover:bg-[#e2ded2] border border-[#dcd5c4] text-[#122419] rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#55675c]" />
                <span>Go to Previous</span>
              </button>
            )}
            <button
              onClick={() => onNavigateAuth('ENGINEER', 'login')}
              className="text-xs font-semibold text-white bg-[#1b4332] hover:bg-[#245842] px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              Sign In Portal →
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 w-full flex flex-col justify-center">
        {/* Technical Top Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#ede8dc] border border-[#ded7c7] text-xs font-medium text-[#405448]">
            <span className="w-2 h-2 rounded-full bg-[#1b4332]"></span>
            <span>ENTERPRISE ARCHITECTURE · THREE SEPARATED GATEWAYS</span>
          </div>
        </div>

        {/* Hero Title & Subtitle */}
        <div className="text-center max-w-4xl mx-auto mb-10">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-[#122419] mb-4">
            AI Industrial Disk & Plate <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1b4332] via-[#2d6a4f] to-[#52796f]">
              Damage Detection & Relevance Scoring
            </span>
          </h1>
          <p className="text-base sm:text-lg text-[#55675c] max-w-2xl mx-auto font-normal leading-relaxed">
            High-precision optical QA inspection of brake disks, clutch plates, and industrial rotors. Pinpoints radial fractures, thermal scoring, and groove wear with calibrated operational relevance scores.
          </p>
        </div>

        {/* Technical Specification Matrix */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 max-w-4xl mx-auto w-full mb-12">
          <div className="bg-white border border-[#e2ddd0] p-3.5 rounded-xl shadow-xs">
            <div className="text-[10px] font-mono text-[#76877c] uppercase tracking-wider">Active Standard</div>
            <div className="text-sm font-mono font-bold text-[#122419] mt-1">P-PLATE01</div>
            <div className="text-[11px] text-[#55675c]">Precision Metal Rotor Disc</div>
          </div>
          <div className="bg-white border border-[#e2ddd0] p-3.5 rounded-xl shadow-xs">
            <div className="text-[10px] font-mono text-[#76877c] uppercase tracking-wider">Inference Engine</div>
            <div className="text-sm font-mono font-bold text-[#1b4332] mt-1">{MODEL_VERSION}</div>
            <div className="text-[11px] text-[#55675c]">Multimodal Vision + Ridge Features</div>
          </div>
          <div className="bg-white border border-[#e2ddd0] p-3.5 rounded-xl shadow-xs">
            <div className="text-[10px] font-mono text-[#76877c] uppercase tracking-wider">Decision Boundary</div>
            <div className="text-sm font-mono font-bold text-[#b45309] mt-1">τ = 0.50 Threshold</div>
            <div className="text-[11px] text-[#55675c]">Calibrated Severity Rating</div>
          </div>
          <div className="bg-white border border-[#e2ddd0] p-3.5 rounded-xl shadow-xs">
            <div className="text-[10px] font-mono text-[#76877c] uppercase tracking-wider">Evidence Standard</div>
            <div className="text-sm font-mono font-bold text-[#2d6a4f] mt-1">SHA-256 Digest</div>
            <div className="text-[11px] text-[#55675c]">Append-Only Audit Passport</div>
          </div>
        </div>

        {/* The 3 Dedicated Role Selection Cards */}
        <div className="mb-12">
          <div className="text-center mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[#76877c]">Select Authentication Portal</h2>
            <p className="text-xl font-bold text-[#122419] mt-1">Dedicated Role-Specific Workspaces</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {/* Card 1: ADMINISTRATOR */}
            <div className="group relative bg-white border border-[#e2ddd0] hover:border-[#8a6225] transition-all duration-200 rounded-2xl p-6 flex flex-col justify-between shadow-sm hover:shadow-md">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-[#fcf5e7] border border-[#eddab2] rounded-xl flex items-center justify-center text-[#8a6225]">
                    <Server className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-[#fcf5e7] text-[#8a6225] font-semibold border border-[#eddab2]">
                    RESTRICTED ROLE
                  </span>
                </div>

                <h3 className="text-lg font-bold text-[#122419] mb-1.5 font-sans">ADMINISTRATOR</h3>
                <p className="text-xs text-[#55675c] mb-5 leading-relaxed">
                  Platform administration, product catalog governance, frozen-hash verification, and global telemetry monitoring.
                </p>

                <div className="space-y-2 border-t border-[#ede7d8] pt-4 mb-6 text-xs text-[#405448]">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#8a6225] flex-shrink-0" />
                    <span>User & Supervisor Provisioning</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#8a6225] flex-shrink-0" />
                    <span>Frozen Model SHA-256 Hashes</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#8a6225] flex-shrink-0" />
                    <span>60-Sample Benchmark Matrix</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => onNavigateAuth('ADMINISTRATOR', 'login')}
                  className="w-full py-2.5 px-4 bg-[#3d3a2a] hover:bg-[#2a281c] text-white font-semibold text-xs rounded-lg flex items-center justify-center space-x-2 transition-colors shadow-sm cursor-pointer"
                >
                  <span>Administrator Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <div className="flex items-center justify-between pt-1 text-[11px] text-[#76877c]">
                  <span>Restricted Provisioning</span>
                  <button
                    onClick={() => onNavigateAuth('ADMINISTRATOR', 'register')}
                    className="text-[#8a6225] hover:underline font-medium cursor-pointer"
                  >
                    Provision Key →
                  </button>
                </div>
              </div>
            </div>

            {/* Card 2: ENGINEER */}
            <div className="group relative bg-white border-2 border-[#1b4332] hover:border-[#245842] transition-all duration-200 rounded-2xl p-6 flex flex-col justify-between shadow-md">
              <div className="absolute -top-3 right-5 px-2.5 py-0.5 bg-[#1b4332] text-white text-[10px] font-semibold rounded-full uppercase tracking-wider">
                Primary Intake
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-[#eaf4ed] border border-[#c4e3cd] rounded-xl flex items-center justify-center text-[#1b4332]">
                    <Cpu className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-[#eaf4ed] text-[#1b4332] font-semibold border border-[#c4e3cd]">
                    PUBLIC ONBOARDING
                  </span>
                </div>

                <h3 className="text-lg font-bold text-[#122419] mb-1.5 font-sans">ENGINEER</h3>
                <p className="text-xs text-[#55675c] mb-5 leading-relaxed">
                  AI-powered damage detection, 12-step validation, single & batch optical plate intake, and cryptographic Evidence Passports.
                </p>

                <div className="space-y-2 border-t border-[#ede7d8] pt-4 mb-6 text-xs text-[#405448]">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#1b4332] flex-shrink-0" />
                    <span>Single & Batch Disk Intake</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#1b4332] flex-shrink-0" />
                    <span>Calibrated Relevance Scoring</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#1b4332] flex-shrink-0" />
                    <span>SHA-256 Evidence Passport</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => onNavigateAuth('ENGINEER', 'login')}
                  className="w-full py-2.5 px-4 bg-[#1b4332] hover:bg-[#245842] text-white font-semibold text-xs rounded-lg flex items-center justify-center space-x-2 transition-colors shadow-sm cursor-pointer"
                >
                  <span>Engineer Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <div className="flex items-center justify-between pt-1 text-[11px] text-[#76877c]">
                  <span>Public Registration</span>
                  <button
                    onClick={() => onNavigateAuth('ENGINEER', 'register')}
                    className="text-[#1b4332] hover:underline font-medium cursor-pointer"
                  >
                    Register Account →
                  </button>
                </div>
              </div>
            </div>

            {/* Card 3: SUPERVISOR */}
            <div className="group relative bg-white border border-[#e2ddd0] hover:border-[#2d6a4f] transition-all duration-200 rounded-2xl p-6 flex flex-col justify-between shadow-sm hover:shadow-md">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-[#ebf5ed] border border-[#c0e3ce] rounded-xl flex items-center justify-center text-[#2d6a4f]">
                    <Eye className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-[#ebf5ed] text-[#2d6a4f] font-semibold border border-[#c0e3ce]">
                    INVITATION / CODE ONLY
                  </span>
                </div>

                <h3 className="text-lg font-bold text-[#122419] mb-1.5 font-sans">SUPERVISOR</h3>
                <p className="text-xs text-[#55675c] mb-5 leading-relaxed">
                  Quality assurance verification, human-in-the-loop overrules, uncertainty-ranked queue, and non-destructive audit revisions.
                </p>

                <div className="space-y-2 border-t border-[#ede7d8] pt-4 mb-6 text-xs text-[#405448]">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#2d6a4f] flex-shrink-0" />
                    <span>Uncertainty Queue (|p - 0.5| sorting)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#2d6a4f] flex-shrink-0" />
                    <span>Interactive Bounding Box Zoom</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#2d6a4f] flex-shrink-0" />
                    <span>Immutable Audit Log Append</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => onNavigateAuth('SUPERVISOR', 'login')}
                  className="w-full py-2.5 px-4 bg-[#2d6a4f] hover:bg-[#1b4332] text-white font-semibold text-xs rounded-lg flex items-center justify-center space-x-2 transition-colors shadow-sm cursor-pointer"
                >
                  <span>Supervisor Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <div className="flex items-center justify-between pt-1 text-[11px] text-[#76877c]">
                  <span>Authorized Authorization</span>
                  <button
                    onClick={() => onNavigateAuth('SUPERVISOR', 'register')}
                    className="text-[#2d6a4f] hover:underline font-medium cursor-pointer"
                  >
                    Enter Token →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Evaluation / Instant Persona Shortcuts for Testing */}
        <div className="bg-white border border-[#e2ddd0] p-5 rounded-2xl max-w-4xl mx-auto w-full shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-[#b45309]" />
                <span className="text-xs font-bold text-[#122419] uppercase tracking-wider">Evaluation Fast-Pass</span>
              </div>
              <p className="text-xs text-[#55675c] mt-0.5">
                Instantly enter any role workspace with preloaded standard credentials.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <button
                onClick={() => onQuickLaunchDashboard('ENGINEER')}
                className="px-3.5 py-1.5 bg-[#eaf4ed] hover:bg-[#d5ebd9] border border-[#bfe2ce] text-[#1b4332] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Launch as Engineer
              </button>
              <button
                onClick={() => onQuickLaunchDashboard('SUPERVISOR')}
                className="px-3.5 py-1.5 bg-[#ebf5ed] hover:bg-[#d8edd0] border border-[#bfe2ce] text-[#2d6a4f] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Launch as Supervisor
              </button>
              <button
                onClick={() => onQuickLaunchDashboard('ADMINISTRATOR')}
                className="px-3.5 py-1.5 bg-[#fcf5e7] hover:bg-[#f6ebd4] border border-[#eddab2] text-[#8a6225] text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Launch as Admin
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Industrial Compliance Footer */}
      <footer className="border-t border-[#e2ddd0] bg-[#faf8f3] py-6 text-xs text-[#76877c]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <span className="text-[#405448] font-medium">SPECTRΛ Enterprise Platform</span>
            <span>·</span>
            <span>IEC 62443 Industrial Cybersecurity Compliant</span>
            <span>·</span>
            <span>ISO 9001 Evidence Integrity Standard</span>
          </div>
          <div>
            <span>Django Authentication Groups: <strong className="text-[#122419]">ADMINISTRATOR</strong>, <strong className="text-[#122419]">ENGINEER</strong>, <strong className="text-[#122419]">SUPERVISOR</strong></span>
          </div>
        </div>
      </footer>
    </div>
  );
};
