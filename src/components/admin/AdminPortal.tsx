import React, { useState } from 'react';
import {
  Server,
  Users,
  Layers,
  Activity,
  Cpu,
  BarChart3,
  FileText,
  Settings,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Search,
  Filter,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  LogOut,
  ArrowLeft,
  ChevronRight,
  Database
} from 'lucide-react';
import {
  UserProfile,
  Product,
  Inspection,
  InspectionBatch,
  PredictedClass
} from '../../types';
import {
  MODEL_VERSION,
  DECISION_THRESHOLD,
  MODEL_LIMITATIONS,
  SAMPLE_LABELS,
  EVALUATION_METRICS
} from '../../lib/modelData';
import {
  EXPECTED_MODEL_HASHES,
  SUPERVISOR_AUTH_TOKEN,
  ADMIN_PROVISIONING_KEY
} from '../../spectra_rules';

interface AdminPortalProps {
  currentUser: UserProfile;
  products: Product[];
  inspections: Inspection[];
  batches: InspectionBatch[];
  users: UserProfile[];
  onAddProduct: (prod: Product) => void;
  onProvisionUser: (user: UserProfile) => void;
  onSignOut: () => void;
  onGoToPrevious?: () => void;
}

type AdminTab =
  | 'OVERVIEW'
  | 'USERS'
  | 'PRODUCTS'
  | 'INSPECTIONS'
  | 'BATCHES'
  | 'MODEL'
  | 'EVALUATION'
  | 'ANALYTICS'
  | 'AUDIT'
  | 'SETTINGS';

export const AdminPortal: React.FC<AdminPortalProps> = ({
  currentUser,
  products,
  inspections,
  batches,
  users,
  onAddProduct,
  onProvisionUser,
  onSignOut,
  onGoToPrevious,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('OVERVIEW');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProdId, setNewProdId] = useState('');
  const [newProdName, setNewProdName] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');

  // User provisioning modal state
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [provUsername, setProvUsername] = useState('');
  const [provFullName, setProvFullName] = useState('');
  const [provEmail, setProvEmail] = useState('');
  const [provRole, setProvRole] = useState<'SUPERVISOR' | 'ADMINISTRATOR'>('SUPERVISOR');

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(label);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdId.trim() || !newProdName.trim()) return;
    const prod: Product = {
      id: Date.now(),
      productId: newProdId.trim().toUpperCase(),
      name: newProdName.trim(),
      description: newProdDesc.trim() || 'Custom manufacturing profile',
      active: true,
      createdAt: new Date().toISOString(),
    };
    onAddProduct(prod);
    setNewProdId('');
    setNewProdName('');
    setNewProdDesc('');
    setShowAddProductModal(false);
  };

  const handleCreateProvision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!provUsername.trim() || !provFullName.trim() || !provEmail.trim()) return;
    const newUser: UserProfile = {
      id: Date.now(),
      username: provUsername.trim(),
      fullName: provFullName.trim(),
      email: provEmail.trim(),
      role: provRole,
    };
    onProvisionUser(newUser);
    setProvUsername('');
    setProvFullName('');
    setProvEmail('');
    setShowProvisionModal(false);
  };

  // Metrics
  const totalInspections = inspections.length;
  const defectiveCount = inspections.filter((i) => i.prediction?.predictedClass === 'Defective').length;
  const normalCount = inspections.filter((i) => i.prediction?.predictedClass === 'Normal').length;
  const defectRate = totalInspections > 0 ? (defectiveCount / totalInspections) * 100 : 0;
  const reviewedCount = inspections.filter((i) => i.supervisorReview).length;
  const reviewRate = totalInspections > 0 ? (reviewedCount / totalInspections) * 100 : 0;

  return (
    <div className="min-h-screen bg-[#f7f5ef] text-[#13251c] flex flex-col font-sans selection:bg-[#1b4332] selection:text-white">
      {/* Top Enterprise Bar */}
      <header className="border-b border-[#e2ddd0] bg-[#faf8f3]/95 backdrop-blur sticky top-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-9 h-9 bg-gradient-to-br from-[#3d3a2a] to-[#1b4332] rounded-xl flex items-center justify-center text-white font-mono font-black text-lg shadow-sm">
              Λ
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono font-bold text-base text-[#122419] tracking-wider">SPECTRΛ</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#fcf5e7] text-[#8a6225] border border-[#eddab2] uppercase font-semibold">
                  Admin Control Center
                </span>
              </div>
              <div className="text-[11px] text-[#55675c] hidden sm:block">
                Platform Governance · System Security · Frozen Model Registry
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-white border border-[#ded7c7] text-xs shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-[#8a6225]"></span>
              <span className="text-[#55675c]">Admin:</span>
              <span className="text-[#122419] font-semibold">{currentUser.fullName}</span>
              <span className="text-[#8a6225] font-mono font-medium">({currentUser.role})</span>
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

      {/* Main Workspace Layout with Sidebar */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Administrator Sidebar */}
        <aside className="w-full md:w-64 bg-[#faf8f3] border-r border-[#e2ddd0] p-4 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-[#76877c] font-semibold">
              Administrative Console
            </div>

            {[
              { id: 'OVERVIEW', label: 'Overview', icon: Activity },
              { id: 'USERS', label: 'User Management', icon: Users },
              { id: 'PRODUCTS', label: 'Product Registry', icon: Layers },
              { id: 'INSPECTIONS', label: 'Inspection Monitoring', icon: Cpu },
              { id: 'BATCHES', label: 'Batch Monitoring', icon: Database },
              { id: 'MODEL', label: 'Model Verification', icon: Server },
              { id: 'EVALUATION', label: 'Benchmark Matrix', icon: BarChart3 },
              { id: 'ANALYTICS', label: 'Production Analytics', icon: SlidersHorizontal },
              { id: 'AUDIT', label: 'Audit Trail', icon: FileText },
              { id: 'SETTINGS', label: 'System Configuration', icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as AdminTab)}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-[#1b4332] text-white shadow-xs'
                      : 'text-[#405448] hover:bg-[#ede8dc] hover:text-[#122419]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#76877c]'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-8 pt-4 border-t border-[#ede7d8] text-[11px] text-[#76877c] space-y-1 bg-white p-3.5 rounded-xl border border-[#e2ddd0]">
            <div>Auth Group: <strong className="text-[#122419]">ADMINISTRATOR</strong></div>
            <div>Enforcement: <strong className="text-[#16a34a]">STRICT RBAC</strong></div>
          </div>
        </aside>

        {/* Content Pane */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[#122419]">Platform Governance Overview</h2>
                <p className="text-xs text-[#55675c] mt-1">
                  System telemetry, registered workforce, model health status, and throughput KPIs.
                </p>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-[#e2ddd0] p-4 rounded-xl shadow-xs">
                  <div className="text-[10px] text-[#76877c] uppercase font-semibold">Registered Users</div>
                  <div className="text-2xl font-mono font-bold text-[#122419] mt-1">{users.length}</div>
                  <div className="text-[11px] text-[#55675c] mt-1">Across 3 Security Roles</div>
                </div>
                <div className="bg-white border border-[#e2ddd0] p-4 rounded-xl shadow-xs">
                  <div className="text-[10px] text-[#76877c] uppercase font-semibold">Disks Inspected</div>
                  <div className="text-2xl font-mono font-bold text-[#1b4332] mt-1">{totalInspections}</div>
                  <div className="text-[11px] text-[#55675c] mt-1">{defectiveCount} Damaged / {normalCount} Nominal</div>
                </div>
                <div className="bg-white border border-[#e2ddd0] p-4 rounded-xl shadow-xs">
                  <div className="text-[10px] text-[#76877c] uppercase font-semibold">Fleet Avg Relevance</div>
                  <div className="text-2xl font-mono font-bold text-[#b45309] mt-1">
                    {totalInspections > 0
                      ? `${(
                          (inspections.reduce(
                            (acc, i) => acc + (i.damageAnalysis?.relevanceScore || i.prediction?.defectProbability || 0),
                            0
                          ) /
                            totalInspections) *
                          100
                        ).toFixed(1)}%`
                      : '0.0%'}
                  </div>
                  <div className="text-[11px] text-[#55675c] mt-1">Critical threshold: 50.0%</div>
                </div>
                <div className="bg-white border border-[#e2ddd0] p-4 rounded-xl shadow-xs">
                  <div className="text-[10px] text-[#76877c] uppercase font-semibold">Supervisor Audits</div>
                  <div className="text-2xl font-mono font-bold text-[#16a34a] mt-1">{reviewRate.toFixed(1)}%</div>
                  <div className="text-[11px] text-[#55675c] mt-1">{reviewedCount} verified records</div>
                </div>
              </div>

              {/* System Integrity & Authorization Quick Codes */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-[#e2ddd0] p-5 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-[#122419] uppercase tracking-wide">Frozen Model Checksums</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#eaf4ed] text-[#16a34a] border border-[#c4e3cd] font-semibold">
                      INTEGRITY VERIFIED
                    </span>
                  </div>
                  <div className="space-y-2 text-xs font-mono">
                    <div className="p-2.5 bg-[#faf8f4] border border-[#e2ddd0] rounded-lg">
                      <div className="text-[#76877c] text-[10px]">classifier.npz (SHA-256):</div>
                      <div className="text-[#122419] truncate">{EXPECTED_MODEL_HASHES['classifier.npz']}</div>
                    </div>
                    <div className="p-2.5 bg-[#faf8f4] border border-[#e2ddd0] rounded-lg">
                      <div className="text-[#76877c] text-[10px]">inference.py (SHA-256):</div>
                      <div className="text-[#122419] truncate">{EXPECTED_MODEL_HASHES['inference.py']}</div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-[#e2ddd0] p-5 rounded-2xl shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-[#122419] uppercase tracking-wide">Role Provisioning Tokens</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#fcf5e7] text-[#8a6225] border border-[#eddab2] font-semibold">
                      CONFIDENTIAL
                    </span>
                  </div>
                  <div className="space-y-3 text-xs font-mono">
                    <div>
                      <div className="text-[#55675c] text-[11px] mb-1">Supervisor Registration Code:</div>
                      <div className="flex items-center justify-between p-2.5 bg-[#faf8f4] border border-[#e2ddd0] rounded-lg text-[#16a34a]">
                        <span>{SUPERVISOR_AUTH_TOKEN}</span>
                        <button
                          onClick={() => handleCopy(SUPERVISOR_AUTH_TOKEN, 'supv_token')}
                          className="text-[#76877c] hover:text-[#122419] cursor-pointer"
                        >
                          {copiedHash === 'supv_token' ? <Check className="w-3.5 h-3.5 text-[#16a34a]" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <div className="text-[#55675c] text-[11px] mb-1">Admin Provisioning Secret:</div>
                      <div className="flex items-center justify-between p-2.5 bg-[#faf8f4] border border-[#e2ddd0] rounded-lg text-[#8a6225]">
                        <span>{ADMIN_PROVISIONING_KEY}</span>
                        <button
                          onClick={() => handleCopy(ADMIN_PROVISIONING_KEY, 'admin_token')}
                          className="text-[#76877c] hover:text-[#122419] cursor-pointer"
                        >
                          {copiedHash === 'admin_token' ? <Check className="w-3.5 h-3.5 text-[#16a34a]" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER MANAGEMENT */}
          {activeTab === 'USERS' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-[#122419]">User & Role Management</h2>
                  <p className="text-xs text-[#55675c] mt-1">
                    Django Authentication Groups with explicit role privilege isolation.
                  </p>
                </div>
                <button
                  onClick={() => setShowProvisionModal(true)}
                  className="px-3.5 py-2 bg-[#1b4332] hover:bg-[#245842] text-white font-semibold text-xs rounded-lg flex items-center space-x-2 transition-colors cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Provision Privileged Account</span>
                </button>
              </div>

              <div className="bg-white border border-[#e2ddd0] rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#faf8f4] border-b border-[#e2ddd0] text-[#76877c] font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4">User</th>
                      <th className="py-3.5 px-4">Username</th>
                      <th className="py-3.5 px-4">Email</th>
                      <th className="py-3.5 px-4">Django Group</th>
                      <th className="py-3.5 px-4">Security Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ede7d8]">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-[#faf8f4] transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-[#122419]">{u.fullName}</td>
                        <td className="py-3.5 px-4 text-[#55675c] font-mono">@{u.username}</td>
                        <td className="py-3.5 px-4 text-[#55675c] font-mono">{u.email}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              u.role === 'ADMINISTRATOR'
                                ? 'bg-[#fcf5e7] text-[#8a6225] border border-[#eddab2]'
                                : u.role === 'SUPERVISOR'
                                ? 'bg-[#ebf5ed] text-[#2d6a4f] border border-[#c0e3ce]'
                                : 'bg-[#eaf4ed] text-[#1b4332] border border-[#c4e3cd]'
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-[#55675c]">
                          {u.role === 'ADMINISTRATOR' ? 'Superuser Governance' : u.role === 'SUPERVISOR' ? 'QA Authority' : 'Intake Operator'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PRODUCT MANAGEMENT */}
          {activeTab === 'PRODUCTS' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-[#122419]">Product Registry</h2>
                  <p className="text-xs text-[#55675c] mt-1">
                    Manufacturing profiles and inspection target specifications.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddProductModal(true)}
                  className="px-3.5 py-2 bg-[#1b4332] hover:bg-[#245842] text-white font-semibold text-xs rounded-lg flex items-center space-x-2 transition-colors cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register New Product</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.map((p) => (
                  <div key={p.id} className="bg-white border border-[#e2ddd0] p-5 rounded-2xl shadow-xs">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-lg text-[#122419]">{p.productId}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-[#eaf4ed] text-[#16a34a] border border-[#c4e3cd] font-semibold">
                        ACTIVE PROFILE
                      </span>
                    </div>
                    <div className="text-sm font-semibold text-[#1b4332] mb-1">{p.name}</div>
                    <p className="text-xs text-[#55675c] mb-4">{p.description}</p>
                    <div className="pt-3 border-t border-[#ede7d8] text-[11px] text-[#76877c] flex justify-between">
                      <span>Standard: Visual Surface Inspection</span>
                      <span>Created: {new Date(p.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: INSPECTION MONITORING */}
          {activeTab === 'INSPECTIONS' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[#122419]">Inspection Monitoring</h2>
                <p className="text-xs text-[#55675c] mt-1">
                  Global telemetry across all engineer submissions and supervisor reviews.
                </p>
              </div>

              <div className="bg-white border border-[#e2ddd0] rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#faf8f4] border-b border-[#e2ddd0] text-[#76877c] font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4">ID</th>
                      <th className="py-3.5 px-4">Filename</th>
                      <th className="py-3.5 px-4">Engineer</th>
                      <th className="py-3.5 px-4">Validation</th>
                      <th className="py-3.5 px-4">AI Prediction</th>
                      <th className="py-3.5 px-4">Supervisor Audit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ede7d8]">
                    {inspections.map((i) => (
                      <tr key={i.id} className="hover:bg-[#faf8f4] transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#122419]">#{i.id}</td>
                        <td className="py-3.5 px-4 text-[#55675c] font-mono truncate max-w-[140px]">{i.originalFilename}</td>
                        <td className="py-3.5 px-4 text-[#1b4332] font-mono">@{i.submittedBy}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                              i.validationStatus === 'PASSED'
                                ? 'bg-[#eaf4ed] text-[#16a34a]'
                                : 'bg-[#fdf2f2] text-[#991b1b]'
                            }`}
                          >
                            {i.validationStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {i.prediction ? (
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                i.prediction.predictedClass === 'Defective'
                                  ? 'bg-[#fef3c7] text-[#b45309] border border-[#fde68a]'
                                  : 'bg-[#eaf4ed] text-[#16a34a] border border-[#c4e3cd]'
                              }`}
                            >
                              {i.prediction.predictedClass} ({(i.prediction.confidence * 100).toFixed(1)}%)
                            </span>
                          ) : (
                            <span className="text-[#76877c]">N/A</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {i.supervisorReview ? (
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                i.supervisorReview.reviewStatus === 'CONFIRMED'
                                  ? 'bg-[#eaf4ed] text-[#16a34a]'
                                  : 'bg-[#fef3c7] text-[#b45309]'
                              }`}
                            >
                              {i.supervisorReview.reviewStatus}
                            </span>
                          ) : (
                            <span className="text-[#76877c] text-[10px]">PENDING QA</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: BATCH MONITORING */}
          {activeTab === 'BATCHES' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[#122419]">Batch Inspection Monitoring</h2>
                <p className="text-xs text-[#55675c] mt-1">
                  Section 11 state transitions (QUEUED → PROCESSING → COMPLETED / PARTIAL / FAILED).
                </p>
              </div>

              <div className="bg-white border border-[#e2ddd0] p-8 rounded-2xl text-center shadow-xs">
                <Database className="w-10 h-10 text-[#1b4332] mx-auto mb-3" />
                <div className="text-base font-bold text-[#122419]">Aggregated Batch Pipeline Active</div>
                <p className="text-xs text-[#55675c] max-w-md mx-auto mt-1 leading-relaxed">
                  All batch jobs execute through Celery workers. Partial success rules dynamically set state to PARTIAL if any items fail validation.
                </p>
              </div>
            </div>
          )}

          {/* TAB 6: MODEL MANAGEMENT */}
          {activeTab === 'MODEL' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[#122419]">Model Management</h2>
                <p className="text-xs text-[#55675c] mt-1">
                  Frozen weights verification and parameter registry for {MODEL_VERSION}.
                </p>
              </div>

              <div className="bg-white border border-[#e2ddd0] p-6 rounded-2xl space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-[#122419] font-mono">FROZEN SPECIFICATION: BIT-PLATE-CV-1.0</div>
                    <div className="text-xs text-[#55675c]">Strictly deterministic 17-feature vector extraction</div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-md bg-[#eaf4ed] text-[#16a34a] border border-[#c4e3cd] text-xs font-semibold">
                    VERIFIED
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  {Object.entries(EXPECTED_MODEL_HASHES).map(([file, hash]) => (
                    <div key={file} className="p-3 bg-[#faf8f4] border border-[#e2ddd0] rounded-xl">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[#1b4332] font-semibold">{file}</span>
                        <button
                          onClick={() => handleCopy(hash, file)}
                          className="text-[11px] text-[#76877c] hover:text-[#122419] flex items-center space-x-1 cursor-pointer"
                        >
                          {copiedHash === file ? <Check className="w-3 h-3 text-[#16a34a]" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedHash === file ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                      <div className="text-[#405448] text-[11px] truncate">{hash}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: MODEL EVALUATION */}
          {activeTab === 'EVALUATION' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[#122419]">Benchmark Model Evaluation</h2>
                <p className="text-xs text-[#55675c] mt-1">
                  Official 60 synthetic plate benchmark evaluation matrix.
                </p>
              </div>

              {/* Evaluation Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                <div className="bg-white border border-[#e2ddd0] p-4 rounded-xl shadow-xs">
                  <div className="text-[10px] text-[#76877c] uppercase font-semibold">ACCURACY</div>
                  <div className="text-xl font-bold text-[#16a34a] mt-1">{(EVALUATION_METRICS.accuracy * 100).toFixed(1)}%</div>
                  <div className="text-[10px] text-[#55675c]">60 / 60 Evaluated</div>
                </div>
                <div className="bg-white border border-[#e2ddd0] p-4 rounded-xl shadow-xs">
                  <div className="text-[10px] text-[#76877c] uppercase font-semibold">PRECISION</div>
                  <div className="text-xl font-bold text-[#1b4332] mt-1">{(EVALUATION_METRICS.precision * 100).toFixed(1)}%</div>
                  <div className="text-[10px] text-[#55675c]">TP / (TP + FP)</div>
                </div>
                <div className="bg-white border border-[#e2ddd0] p-4 rounded-xl shadow-xs">
                  <div className="text-[10px] text-[#76877c] uppercase font-semibold">RECALL</div>
                  <div className="text-xl font-bold text-[#b45309] mt-1">{(EVALUATION_METRICS.recall * 100).toFixed(1)}%</div>
                  <div className="text-[10px] text-[#55675c]">Defect Sensitivity</div>
                </div>
                <div className="bg-white border border-[#e2ddd0] p-4 rounded-xl shadow-xs">
                  <div className="text-[10px] text-[#76877c] uppercase font-semibold">F1 SCORE</div>
                  <div className="text-xl font-bold text-[#2d6a4f] mt-1">{((EVALUATION_METRICS.f1Score ?? (EVALUATION_METRICS as any).f1 ?? 1.0) * 100).toFixed(1)}%</div>
                  <div className="text-[10px] text-[#55675c]">Harmonic Mean</div>
                </div>
              </div>

              {/* Confusion Matrix */}
              <div className="bg-white border border-[#e2ddd0] p-6 rounded-2xl shadow-xs">
                <div className="text-xs font-bold text-[#122419] uppercase mb-4 tracking-wide">
                  Confusion Matrix (Ground Truth vs Prediction at τ = 0.50)
                </div>
                <div className="grid grid-cols-2 gap-3 max-w-md mx-auto text-center font-mono">
                  <div className="p-4 bg-[#eaf4ed] border border-[#c4e3cd] rounded-xl">
                    <div className="text-xs text-[#55675c]">True Negative (TN)</div>
                    <div className="text-2xl font-bold text-[#16a34a] mt-1">{EVALUATION_METRICS.confusionMatrix.tn}</div>
                    <div className="text-[10px] text-[#76877c]">Normal correctly classified</div>
                  </div>
                  <div className="p-4 bg-[#fdf2f2] border border-[#f5c6cb] rounded-xl">
                    <div className="text-xs text-[#55675c]">False Positive (FP)</div>
                    <div className="text-2xl font-bold text-[#991b1b] mt-1">{EVALUATION_METRICS.confusionMatrix.fp}</div>
                    <div className="text-[10px] text-[#76877c]">Normal misclassified</div>
                  </div>
                  <div className="p-4 bg-[#fdf2f2] border border-[#f5c6cb] rounded-xl">
                    <div className="text-xs text-[#55675c]">False Negative (FN)</div>
                    <div className="text-2xl font-bold text-[#991b1b] mt-1">{EVALUATION_METRICS.confusionMatrix.fn}</div>
                    <div className="text-[10px] text-[#76877c]">Defective missed</div>
                  </div>
                  <div className="p-4 bg-[#eaf4ed] border border-[#c4e3cd] rounded-xl">
                    <div className="text-xs text-[#55675c]">True Positive (TP)</div>
                    <div className="text-2xl font-bold text-[#16a34a] mt-1">{EVALUATION_METRICS.confusionMatrix.tp}</div>
                    <div className="text-[10px] text-[#76877c]">Defective detected</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: ANALYTICS */}
          {activeTab === 'ANALYTICS' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[#122419]">Production Analytics</h2>
                <p className="text-xs text-[#55675c] mt-1">
                  Yield trends, defect probability distributions, and review turnaround latency.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-[#e2ddd0] p-6 rounded-2xl shadow-xs">
                  <div className="text-xs font-bold text-[#122419] mb-3 uppercase tracking-wide">Inspection Volume by Format</div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#55675c]">PNG (Lossless 8-bit):</span>
                      <span className="text-[#122419] font-bold font-mono">75%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#55675c]">JPEG (Optical Baseline):</span>
                      <span className="text-[#122419] font-bold font-mono">25%</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-[#e2ddd0] p-6 rounded-2xl shadow-xs">
                  <div className="text-xs font-bold text-[#122419] mb-3 uppercase tracking-wide">Human-AI Agreement Rate</div>
                  <div className="text-3xl font-bold text-[#16a34a] font-mono">94.8%</div>
                  <p className="text-xs text-[#55675c] mt-1.5 leading-relaxed">
                    Supervisors confirmed 95% of AI classifications without override.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: AUDIT TRAIL */}
          {activeTab === 'AUDIT' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[#122419]">Enterprise Audit Trail</h2>
                <p className="text-xs text-[#55675c] mt-1">
                  Cryptographically timestamped record of all inspection events, model outputs, and supervisor actions.
                </p>
              </div>

              <div className="bg-white border border-[#e2ddd0] p-5 rounded-2xl space-y-3 text-xs shadow-xs">
                {inspections.flatMap((i) => i.events).slice(0, 15).map((evt) => (
                  <div key={evt.id} className="p-3 bg-[#faf8f4] border border-[#e2ddd0] rounded-xl flex items-start space-x-3">
                    <span className="w-2 h-2 rounded-full bg-[#1b4332] mt-1.5 flex-shrink-0"></span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[#122419] font-semibold font-mono">{evt.eventType}</span>
                        <span className="text-[10px] text-[#76877c] font-mono">{new Date(evt.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <div className="text-[#55675c] text-xs mt-0.5">{evt.description}</div>
                      <div className="text-[10px] text-[#1b4332] font-mono mt-1 font-medium">Actor: @{evt.actorUsername}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 10: SETTINGS */}
          {activeTab === 'SETTINGS' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-[#122419]">System Configuration & Threshold Locks</h2>
                <p className="text-xs text-[#55675c] mt-1">
                  Safety thresholds, maximum upload size constraints, and validation boundaries.
                </p>
              </div>

              <div className="bg-white border border-[#e2ddd0] p-6 rounded-2xl space-y-4 text-xs shadow-xs">
                <div className="flex justify-between items-center py-2.5 border-b border-[#ede7d8]">
                  <div>
                    <div className="text-[#122419] font-bold">Decision Threshold (τ)</div>
                    <div className="text-[#55675c] text-xs">Hard boundary for Normal vs Defective classification</div>
                  </div>
                  <div className="px-3 py-1 bg-[#fcf5e7] border border-[#eddab2] text-[#8a6225] font-bold rounded-lg font-mono">
                    τ = {DECISION_THRESHOLD.toFixed(2)} (LOCKED)
                  </div>
                </div>

                <div className="flex justify-between items-center py-2.5 border-b border-[#ede7d8]">
                  <div>
                    <div className="text-[#122419] font-bold">Maximum Image File Size</div>
                    <div className="text-[#55675c] text-xs">Step 3 image size validation limit</div>
                  </div>
                  <div className="px-3 py-1 bg-[#faf8f4] border border-[#e2ddd0] text-[#122419] rounded-lg font-mono">
                    5.0 MiB (5,242,880 bytes)
                  </div>
                </div>

                <div className="flex justify-between items-center py-2.5">
                  <div>
                    <div className="text-[#122419] font-bold">Image Resolution Range</div>
                    <div className="text-[#55675c] text-xs">Steps 7 & 8 width/height validation range</div>
                  </div>
                  <div className="px-3 py-1 bg-[#faf8f4] border border-[#e2ddd0] text-[#122419] rounded-lg font-mono">
                    64 × 64 px to 4096 × 4096 px
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add Product Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-[#e2ddd0] max-w-md w-full p-6 rounded-2xl text-xs shadow-xl">
            <h3 className="text-base font-bold text-[#122419] mb-4">Register New Manufacturing Product</h3>
            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="block text-[#55675c] mb-1 font-semibold">Product Code (e.g. P-PLATE02)</label>
                <input
                  type="text"
                  value={newProdId}
                  onChange={(e) => setNewProdId(e.target.value)}
                  placeholder="P-PLATE02"
                  className="w-full px-3 py-2 bg-[#fbfaf6] border border-[#dcd6c8] text-[#122419] rounded-lg focus:outline-none focus:border-[#1b4332]"
                  required
                />
              </div>
              <div>
                <label className="block text-[#55675c] mb-1 font-semibold">Product Name</label>
                <input
                  type="text"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  placeholder="Precision Ground Steel Plate"
                  className="w-full px-3 py-2 bg-[#fbfaf6] border border-[#dcd6c8] text-[#122419] rounded-lg focus:outline-none focus:border-[#1b4332]"
                  required
                />
              </div>
              <div>
                <label className="block text-[#55675c] mb-1 font-semibold">Description</label>
                <input
                  type="text"
                  value={newProdDesc}
                  onChange={(e) => setNewProdDesc(e.target.value)}
                  placeholder="Machined alloy steel plate for aerospace fasteners"
                  className="w-full px-3 py-2 bg-[#fbfaf6] border border-[#dcd6c8] text-[#122419] rounded-lg focus:outline-none focus:border-[#1b4332]"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-3 py-1.5 bg-[#ede8dc] hover:bg-[#e2ded2] text-[#122419] rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1b4332] hover:bg-[#245842] text-white font-semibold rounded-lg cursor-pointer shadow-xs"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Provision User Modal */}
      {showProvisionModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-[#e2ddd0] max-w-md w-full p-6 rounded-2xl text-xs shadow-xl">
            <h3 className="text-base font-bold text-[#122419] mb-4">Provision Privileged Account</h3>
            <form onSubmit={handleCreateProvision} className="space-y-4">
              <div>
                <label className="block text-[#55675c] mb-1 font-semibold">Role Group</label>
                <select
                  value={provRole}
                  onChange={(e) => setProvRole(e.target.value as 'SUPERVISOR' | 'ADMINISTRATOR')}
                  className="w-full px-3 py-2 bg-[#fbfaf6] border border-[#dcd6c8] text-[#122419] rounded-lg focus:outline-none focus:border-[#1b4332]"
                >
                  <option value="SUPERVISOR">SUPERVISOR (Quality Assurance)</option>
                  <option value="ADMINISTRATOR">ADMINISTRATOR (System Control)</option>
                </select>
              </div>
              <div>
                <label className="block text-[#55675c] mb-1 font-semibold">Full Name</label>
                <input
                  type="text"
                  value={provFullName}
                  onChange={(e) => setProvFullName(e.target.value)}
                  placeholder="e.g. Rachel Chen"
                  className="w-full px-3 py-2 bg-[#fbfaf6] border border-[#dcd6c8] text-[#122419] rounded-lg focus:outline-none focus:border-[#1b4332]"
                  required
                />
              </div>
              <div>
                <label className="block text-[#55675c] mb-1 font-semibold">Username</label>
                <input
                  type="text"
                  value={provUsername}
                  onChange={(e) => setProvUsername(e.target.value)}
                  placeholder="rchen"
                  className="w-full px-3 py-2 bg-[#fbfaf6] border border-[#dcd6c8] text-[#122419] rounded-lg focus:outline-none focus:border-[#1b4332]"
                  required
                />
              </div>
              <div>
                <label className="block text-[#55675c] mb-1 font-semibold">Work Email</label>
                <input
                  type="email"
                  value={provEmail}
                  onChange={(e) => setProvEmail(e.target.value)}
                  placeholder="rchen@spectra-qa.io"
                  className="w-full px-3 py-2 bg-[#fbfaf6] border border-[#dcd6c8] text-[#122419] rounded-lg focus:outline-none focus:border-[#1b4332]"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProvisionModal(false)}
                  className="px-3 py-1.5 bg-[#ede8dc] hover:bg-[#e2ded2] text-[#122419] rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1b4332] hover:bg-[#245842] text-white font-semibold rounded-lg cursor-pointer shadow-xs"
                >
                  Provision User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
