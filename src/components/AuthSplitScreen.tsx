import React, { useState } from 'react';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Cpu,
  Server,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { UserRole, UserProfile } from '../types';
import {
  validateRoleRegistration,
  SUPERVISOR_AUTH_TOKEN,
  ADMIN_PROVISIONING_KEY
} from '../spectra_rules';
import { DEFAULT_USERS } from '../lib/mockStore';
import { MODEL_VERSION, DECISION_THRESHOLD } from '../lib/modelData';

interface AuthSplitScreenProps {
  role: UserRole;
  mode: 'login' | 'register';
  onLoginSuccess: (user: UserProfile) => void;
  onRegisterSuccess: (user: UserProfile) => void;
  onNavigateMode: (mode: 'login' | 'register') => void;
  onBackToLanding: () => void;
  existingUsers: UserProfile[];
  onGoToPrevious?: () => void;
}

export const AuthSplitScreen: React.FC<AuthSplitScreenProps> = ({
  role,
  mode,
  onLoginSuccess,
  onRegisterSuccess,
  onNavigateMode,
  onBackToLanding,
  existingUsers,
  onGoToPrevious,
}) => {
  const [activeRole, setActiveRole] = useState<UserRole>(role);
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const roleDisplayNames: Record<UserRole, string> = {
    ENGINEER: 'Engineer',
    SUPERVISOR: 'Supervisor',
    ADMINISTRATOR: 'Admin',
  };

  const roleTaglines: Record<UserRole, string> = {
    ENGINEER: 'AI Rotor & Disk Optical Damage Inspection',
    SUPERVISOR: 'Defect Calibration & Quality Review Verification',
    ADMINISTRATOR: 'Fleet Governance, Model Hashes & Access Control',
  };

  // Quick fill helper
  const handleQuickFill = (targetRole?: UserRole) => {
    const roleToUse = targetRole || activeRole;
    if (targetRole && targetRole !== activeRole) {
      setActiveRole(targetRole);
    }
    const defaultUser = DEFAULT_USERS[roleToUse];
    if (mode === 'login') {
      setUsernameOrEmail(defaultUser.username);
      setPassword('password123');
    } else {
      setFullName(defaultUser.fullName + ' (Verified)');
      setUsernameOrEmail(defaultUser.username + '_verified');
      setEmail(`${defaultUser.username}@spectra-qa.io`);
      setPassword('password123');
      setConfirmPassword('password123');
      if (roleToUse === 'SUPERVISOR') setAuthCode(SUPERVISOR_AUTH_TOKEN);
      if (roleToUse === 'ADMINISTRATOR') setAuthCode(ADMIN_PROVISIONING_KEY);
    }
    setError(null);
    setSuccessMessage(null);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!usernameOrEmail.trim() || !password.trim()) {
      setError('Please provide your username or email and password.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      const query = usernameOrEmail.trim().toLowerCase();
      const user =
        existingUsers.find(
          (u) =>
            (u.username.toLowerCase() === query ||
              u.email.toLowerCase() === query ||
              (query === 'demo_eng' && u.role === 'ENGINEER') ||
              (query === 'demo_supv' && u.role === 'SUPERVISOR') ||
              (query === 'demo_admin' && u.role === 'ADMINISTRATOR')) &&
            u.role === activeRole
        ) ||
        (DEFAULT_USERS[activeRole].username.toLowerCase() === query ||
        (query === 'demo_eng' && activeRole === 'ENGINEER') ||
        (query === 'demo_supv' && activeRole === 'SUPERVISOR') ||
        (query === 'demo_admin' && activeRole === 'ADMINISTRATOR')
          ? DEFAULT_USERS[activeRole]
          : null);

      if (user) {
        onLoginSuccess(user);
      } else if (activeRole === 'ENGINEER' && usernameOrEmail.trim()) {
        const cleanName = usernameOrEmail.trim();
        const autoUser: UserProfile = {
          id: Date.now(),
          username: cleanName.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
          fullName: cleanName,
          email: cleanName.includes('@') ? cleanName : `${cleanName.toLowerCase()}@spectra-qa.io`,
          role: 'ENGINEER',
        };
        onLoginSuccess(autoUser);
      } else {
        setError(
          `Invalid credentials for ${activeRole} tier. Please use demo shortcuts or register your account.`
        );
      }
    }, 250);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!fullName.trim() || !usernameOrEmail.trim() || !email.trim() || !password.trim()) {
      setError('All standard registration fields are required.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify both password fields.');
      return;
    }

    const validation = validateRoleRegistration({
      targetRole: activeRole,
      authCode: activeRole === 'SUPERVISOR' ? authCode : undefined,
      provisioningKey: activeRole === 'ADMINISTRATOR' ? authCode : undefined,
    });

    if (!validation.allowed) {
      setError(validation.errorMessage || 'Registration disallowed for this security tier.');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      const newUser: UserProfile = {
        id: Date.now(),
        username: usernameOrEmail.trim(),
        email: email.trim(),
        fullName: fullName.trim(),
        role: validation.assignedRole,
      };
      onRegisterSuccess(newUser);
      onNavigateMode('login');
      setUsernameOrEmail(newUser.username);
      setPassword('');
      setConfirmPassword('');
      setError(null);
      setSuccessMessage(`Registration complete for ${newUser.username}! Please sign in with your credentials.`);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-[#BAC8BB] text-[#24372D] flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans antialiased selection:bg-[#1B4332] selection:text-white relative">
      {/* Centered Application Frame matching Reference */}
      <div className="w-full max-w-5xl bg-[#FCFBF8] rounded-2xl shadow-2xl overflow-hidden border border-[#A4B5A3] flex flex-col relative z-10">
        {/* Browser Top Bar */}
        <div className="h-10 bg-[#EAE7DF] border-b border-[#E2DDD0] px-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-[#E06C63] inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-[#E5B551] inline-block"></span>
            <span className="w-3 h-3 rounded-full bg-[#5EC067] inline-block"></span>
          </div>
          <div className="text-[11px] font-mono font-medium text-[#69736D] tracking-wide flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#1B4332]"></span>
            <span>SPECTRΛ {roleDisplayNames[activeRole]} Workspace Portal</span>
          </div>
          <div className="flex items-center space-x-2">
            {onGoToPrevious ? (
              <button
                type="button"
                onClick={onGoToPrevious}
                className="flex items-center space-x-1 px-2.5 py-1 bg-[#F0ECE1] hover:bg-[#E2DDD0] border border-[#DED7C7] text-[#1B4332] rounded-md text-[11px] font-semibold transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Go to Previous</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onBackToLanding}
                className="text-[11px] font-mono text-[#52765D] hover:text-[#1B4332] flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Return to Gateway</span>
              </button>
            )}
          </div>
        </div>

        {/* Two Balanced Internal Panels */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-[620px]">
          {/* LEFT PANEL — AUTHENTICATION */}
          <div className="w-full lg:w-1/2 bg-[#FCFBF8] p-6 sm:p-10 lg:p-12 flex flex-col justify-between">
            <div>
              {/* Brand Header */}
              <div className="flex items-center space-x-3 mb-8">
                <div className="w-10 h-10 bg-[#1B4332] text-white rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" strokeOpacity="0.4" strokeDasharray="2 2" />
                    <circle cx="12" cy="12" r="5" />
                    <path d="M12 3v3M12 18v3M3 12h3M18 12h3" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <h1 className="font-mono font-extrabold text-xl text-[#24372D] tracking-widest leading-none">
                    SPECTRΛ
                  </h1>
                  <p className="text-[10px] font-mono tracking-wider text-[#69736D] uppercase mt-1">
                    Industrial Visual Quality Assurance
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-[#24372D] tracking-tight">
                  {mode === 'login' ? `Welcome back` : `Create account`}
                </h2>
                <p className="text-xs text-[#69736D] mt-1">
                  {mode === 'login'
                    ? `Sign in to access your ${roleDisplayNames[activeRole]} workspace.`
                    : `Register authorized ${roleDisplayNames[activeRole]} credentials.`}
                </p>
              </div>

              {/* Segmented Mode Switcher */}
              <div className="bg-[#F0ECE1] p-1 rounded-xl flex mb-5 border border-[#E2DDD0]">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSuccessMessage(null);
                    onNavigateMode('login');
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    mode === 'login'
                      ? 'bg-white text-[#24372D] shadow-sm'
                      : 'text-[#69736D] hover:text-[#24372D]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setSuccessMessage(null);
                    onNavigateMode('register');
                  }}
                  className={`flex-1 py-2 px-4 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    mode === 'register'
                      ? 'bg-white text-[#24372D] shadow-sm'
                      : 'text-[#69736D] hover:text-[#24372D]'
                  }`}
                >
                  Register Account
                </button>
              </div>

              {/* Role Clearance Selector */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-[#52765D] uppercase tracking-wider">
                    {mode === 'login' ? 'Security Clearance Tier' : 'Group Enrollment'}
                  </label>
                  <span className="text-[10px] font-mono text-[#89958D]">
                    TIER: {activeRole}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {(['ENGINEER', 'SUPERVISOR', 'ADMINISTRATOR'] as UserRole[]).map((r) => {
                    const isSelected = activeRole === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          setActiveRole(r);
                          setError(null);
                          setSuccessMessage(null);
                        }}
                        className={`py-2 px-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer text-center border ${
                          isSelected
                            ? 'bg-[#1B4332] text-white border-[#1B4332] shadow-sm font-semibold'
                            : 'bg-[#F9F8F3] border-[#E2DDD0] text-[#52765D] hover:bg-[#EFECE3] hover:text-[#24372D]'
                        }`}
                      >
                        {roleDisplayNames[r]}
                      </button>
                    );
                  })}
                </div>

                <p className="text-[11px] text-[#69736D] mt-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1B4332]"></span>
                  <span>{roleTaglines[activeRole]}</span>
                </p>
              </div>

              {/* Banners */}
              {successMessage && (
                <div className="mb-4 p-3 bg-[#EAF4ED] border border-[#C4E3CD] rounded-xl flex items-start space-x-2 text-[#1B4332] text-xs font-medium">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#1B4332]" />
                  <span>{successMessage}</span>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-[#FDF2F2] border border-[#F5C6CB] rounded-xl flex items-start space-x-2 text-[#991B1B] text-xs font-medium">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-[#DC2626]" />
                  <span>{error}</span>
                </div>
              )}

              {/* Login / Register Forms */}
              {mode === 'login' ? (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#52765D] mb-1.5 uppercase tracking-wide">
                      Username or Email
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#89958D]">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={usernameOrEmail}
                        onChange={(e) => setUsernameOrEmail(e.target.value)}
                        placeholder={`e.g. demo_${activeRole === 'ADMINISTRATOR' ? 'admin' : activeRole === 'SUPERVISOR' ? 'supv' : 'eng'}`}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-[#E2DDD0] focus:border-[#1B4332] focus:ring-2 focus:ring-[#1B4332]/10 focus:outline-none rounded-xl text-sm text-[#24372D] placeholder-[#A4B0A7]"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-[#52765D] uppercase tracking-wide">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => handleQuickFill()}
                        className="text-[11px] text-[#1B4332] hover:underline font-medium cursor-pointer"
                      >
                        Fill Demo
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#89958D]">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full pl-9 pr-10 py-2.5 bg-white border border-[#E2DDD0] focus:border-[#1B4332] focus:ring-2 focus:ring-[#1B4332]/10 focus:outline-none rounded-xl text-sm text-[#24372D] placeholder-[#A4B0A7]"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#89958D] hover:text-[#24372D] cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#69736D] pt-0.5">
                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded text-[#1B4332] focus:ring-[#1B4332] border-[#E2DDD0]"
                      />
                      <span>Remember for 30 days</span>
                    </label>
                    <span className="hover:text-[#1B4332] cursor-pointer">Forgot password?</span>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 px-4 font-semibold text-sm rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60 bg-[#1B4332] hover:bg-[#245842] text-white shadow-md"
                    >
                      {loading ? (
                        <span>Authenticating...</span>
                      ) : (
                        <>
                          <span>Sign In as {roleDisplayNames[activeRole]}</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-[#52765D] mb-1 uppercase tracking-wide">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Elena Rostova"
                      className="w-full px-3.5 py-2.5 bg-white border border-[#E2DDD0] focus:border-[#1B4332] focus:outline-none rounded-xl text-sm text-[#24372D] placeholder-[#A4B0A7]"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-[#52765D] mb-1 uppercase tracking-wide">
                        Username
                      </label>
                      <input
                        type="text"
                        value={usernameOrEmail}
                        onChange={(e) => setUsernameOrEmail(e.target.value)}
                        placeholder="erostova"
                        className="w-full px-3.5 py-2.5 bg-white border border-[#E2DDD0] focus:border-[#1B4332] focus:outline-none rounded-xl text-sm text-[#24372D] placeholder-[#A4B0A7]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#52765D] mb-1 uppercase tracking-wide">
                        Work Email
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="erostova@spectra-qa.io"
                        className="w-full px-3.5 py-2.5 bg-white border border-[#E2DDD0] focus:border-[#1B4332] focus:outline-none rounded-xl text-sm text-[#24372D] placeholder-[#A4B0A7]"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-[#52765D] mb-1 uppercase tracking-wide">
                        Password
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full px-3.5 py-2.5 bg-white border border-[#E2DDD0] focus:border-[#1B4332] focus:outline-none rounded-xl text-sm text-[#24372D] placeholder-[#A4B0A7]"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#52765D] mb-1 uppercase tracking-wide">
                        Confirm Password
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full px-3.5 py-2.5 bg-white border border-[#E2DDD0] focus:border-[#1B4332] focus:outline-none rounded-xl text-sm text-[#24372D] placeholder-[#A4B0A7]"
                        required
                      />
                    </div>
                  </div>

                  {activeRole === 'SUPERVISOR' && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-[#2D6A4F] uppercase tracking-wide">
                          Supervisor Authorization Code
                        </label>
                        <span className="text-[10px] text-[#89958D] font-mono">SUPV-AUTH-2026</span>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#2D6A4F]">
                          <KeyRound className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          value={authCode}
                          onChange={(e) => setAuthCode(e.target.value)}
                          placeholder="SUPV-AUTH-2026"
                          className="w-full pl-9 pr-3.5 py-2.5 bg-[#F5FBF7] border border-[#9FD3B2] focus:border-[#2D6A4F] focus:outline-none rounded-xl text-sm text-[#1B4332]"
                          required
                        />
                      </div>
                    </div>
                  )}

                  {activeRole === 'ADMINISTRATOR' && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-[#8A6225] uppercase tracking-wide">
                          Admin Provisioning Key
                        </label>
                        <span className="text-[10px] text-[#89958D] font-mono">ADMIN-PROVISION-KEY-945F</span>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#8A6225]">
                          <KeyRound className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          value={authCode}
                          onChange={(e) => setAuthCode(e.target.value)}
                          placeholder="ADMIN-PROVISION-KEY-945F"
                          className="w-full pl-9 pr-3.5 py-2.5 bg-[#FCF9F2] border border-[#E8D5B5] focus:border-[#8A6225] focus:outline-none rounded-xl text-sm text-[#5C4117]"
                          required
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 px-4 font-semibold text-sm rounded-xl transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60 bg-[#1B4332] hover:bg-[#245842] text-white shadow-md"
                    >
                      {loading ? (
                        <span>Registering...</span>
                      ) : (
                        <>
                          <span>Register as {roleDisplayNames[activeRole]}</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* FAST-PASS QUICK LOGIN — MANDATORY ON BOTH TABS */}
              <div className="mt-5 pt-4 border-t border-[#E2DDD0]">
                <div className="text-[11px] font-semibold text-[#52765D] uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Fast-Pass Quick Login</span>
                  <span className="text-[10px] text-[#89958D]">1-Click Demo Fill</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickFill('ENGINEER')}
                    className="px-2.5 py-2 bg-[#F6F4ED] hover:bg-[#EAE5D7] border border-[#DED7C7] rounded-lg text-xs font-medium text-[#1B4332] transition-colors cursor-pointer text-center"
                  >
                    demo_eng
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('SUPERVISOR')}
                    className="px-2.5 py-2 bg-[#F6F4ED] hover:bg-[#EAE5D7] border border-[#DED7C7] rounded-lg text-xs font-medium text-[#2D6A4F] transition-colors cursor-pointer text-center"
                  >
                    demo_supv
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickFill('ADMINISTRATOR')}
                    className="px-2.5 py-2 bg-[#F6F4ED] hover:bg-[#EAE5D7] border border-[#DED7C7] rounded-lg text-xs font-medium text-[#4F4835] transition-colors cursor-pointer text-center"
                  >
                    demo_admin
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#E2DDD0] text-center text-[11px] font-mono text-[#89958D] flex items-center justify-between">
              <span>© SPECTRΛ UI 2026</span>
              <span>Decision Threshold τ = {DECISION_THRESHOLD.toFixed(2)}</span>
            </div>
          </div>

          {/* RIGHT PANEL — SIGNATURE SPECTRΛ 3D ARTWORK */}
          <div className="hidden lg:flex lg:w-1/2 bg-[#DCE6D9] p-8 lg:p-10 flex-col justify-between relative overflow-hidden border-l border-[#E2DDD0]">
            <div className="absolute inset-0 z-0">
              <img
                src="/assets/aistudio/image_bf2ca09d.png"
                alt="SPECTRΛ 3D Optical Track Sculpture"
                className="w-full h-full object-cover object-right select-none pointer-events-none opacity-90 scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#DCE6D9]/90 via-[#DCE6D9]/20 to-transparent pointer-events-none"></div>
            </div>

            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#1B4332] animate-pulse"></span>
                <span className="text-[10px] font-mono font-semibold uppercase tracking-widest text-[#1B4332]">
                  Optical Intelligence Engine
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#52765D] bg-[#FCFBF8]/80 px-2 py-0.5 rounded border border-[#C5D5C2]">
                ISO 9001 AI QA
              </span>
            </div>

            <div className="relative z-10 my-auto text-center pointer-events-none">
              <div className="w-20 h-20 mx-auto rounded-full border border-[#1B4332]/20 flex items-center justify-center backdrop-blur-xs bg-white/10 shadow-lg">
                <div className="w-12 h-12 rounded-full border-2 border-[#1B4332] border-dashed animate-spin-slow flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-[#1B4332]/80"></div>
                </div>
              </div>
            </div>

            <div className="relative z-10 bg-[#FCFBF8]/80 backdrop-blur-md p-5 rounded-2xl border border-[#C5D5C2] shadow-sm">
              <h3 className="font-mono text-xs font-bold tracking-widest text-[#1B4332] uppercase mb-1">
                SEE BEYOND THE SURFACE.
              </h3>
              <p className="text-xs text-[#52765D] leading-relaxed">
                Precision inspection. Intelligent evidence. Better quality decisions.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
