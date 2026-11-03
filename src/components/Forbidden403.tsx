import React from 'react';
import { ShieldAlert, ArrowLeft, LogOut, Terminal, Lock } from 'lucide-react';
import { UserProfile } from '../types';

interface Forbidden403Props {
  currentUser: UserProfile;
  attemptedPath: string;
  requiredRole: string;
  onReturnToAllowedWorkspace: () => void;
  onSignOut: () => void;
  onGoToPrevious?: () => void;
}

export const Forbidden403: React.FC<Forbidden403Props> = ({
  currentUser,
  attemptedPath,
  requiredRole,
  onReturnToAllowedWorkspace,
  onSignOut,
  onGoToPrevious,
}) => {
  const requestId = 'SEC-ERR-' + Math.random().toString(36).substring(2, 9).toUpperCase();

  return (
    <div className="min-h-screen bg-[#f7f5ef] text-[#13251c] flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-xl w-full bg-white border border-[#e2ddd0] rounded-2xl p-8 shadow-sm relative overflow-hidden">
        <div className="flex items-center space-x-3.5 mb-6">
          <div className="w-12 h-12 bg-[#fdf2f2] border border-[#f5c6cb] rounded-xl flex items-center justify-center text-[#dc2626]">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[#991b1b] font-bold tracking-wider text-xl font-mono">HTTP 403 FORBIDDEN</div>
            <div className="text-xs text-[#55675c]">Django RBAC Access Control Enforcement</div>
          </div>
        </div>

        <p className="text-sm text-[#405448] mb-6 leading-relaxed">
          Access restricted. The authenticated operator does not hold sufficient privileges in the required Django security group to modify or access this endpoint.
        </p>

        {/* Diagnostic Metadata Block */}
        <div className="bg-[#faf8f4] border border-[#e2ddd0] p-4 rounded-xl mb-6 space-y-2 text-xs font-mono">
          <div className="flex justify-between">
            <span className="text-[#76877c]">REQUEST ID:</span>
            <span className="text-[#122419]">{requestId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#76877c]">AUTHENTICATED USER:</span>
            <span className="text-[#1b4332] font-semibold">{currentUser.fullName} (@{currentUser.username})</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#76877c]">CURRENT ROLE:</span>
            <span className="px-2 py-0.5 rounded bg-[#eaf4ed] text-[#1b4332] font-semibold border border-[#c4e3cd]">{currentUser.role}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#76877c]">REQUIRED PERMISSION:</span>
            <span className="text-[#b45309] font-semibold">{requiredRole}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#76877c]">ATTEMPTED TARGET:</span>
            <span className="text-[#55675c] truncate max-w-[260px]">{attemptedPath}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onGoToPrevious || onReturnToAllowedWorkspace}
            className="flex-1 py-2.5 px-4 bg-[#1b4332] hover:bg-[#245842] text-white font-semibold text-xs rounded-lg flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go to Previous Page</span>
          </button>
          <button
            onClick={onReturnToAllowedWorkspace}
            className="py-2.5 px-4 bg-[#ede8dc] hover:bg-[#e2ded2] text-[#122419] font-semibold text-xs rounded-lg flex items-center justify-center space-x-2 transition-colors border border-[#dcd5c4] cursor-pointer"
          >
            <span>Return to {currentUser.role} Workspace</span>
          </button>
          <button
            onClick={onSignOut}
            className="py-2.5 px-4 bg-[#ede8dc] hover:bg-[#e2ded2] text-[#122419] font-semibold text-xs rounded-lg flex items-center justify-center space-x-2 transition-colors border border-[#dcd5c4] cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-[#55675c]" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
