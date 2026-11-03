import React, { useState, useEffect } from 'react';
import { UserRole, UserProfile, Product, Inspection, InspectionBatch, SupervisorReview } from './types';
import { getStoredState, saveStoredState, DEFAULT_USERS, AppState } from './lib/mockStore';
import { canAccessPortal, canCreateQualityIncident, validateSupervisorDecision } from './spectra_rules';
import { generateQualityIncidentPayload } from './lib/sopEngine';
import { LandingPage } from './components/LandingPage';
import { AuthSplitScreen } from './components/AuthSplitScreen';
import { UnifiedGateway } from './components/UnifiedGateway';
import { AdminPortal } from './components/admin/AdminPortal';
import { EngineerPortal } from './components/engineer/EngineerPortal';
import { SupervisorPortal } from './components/supervisor/SupervisorPortal';
import { Forbidden403 } from './components/Forbidden403';

export type AppRoute =
  | '/'
  | '/gateway/'
  | '/landing/'

  | '/auth/admin/login/'
  | '/auth/admin/register/'
  | '/auth/engineer/login/'
  | '/auth/engineer/register/'
  | '/auth/supervisor/login/'
  | '/auth/supervisor/register/'
  | '/admin-portal/dashboard/'
  | '/engineer-portal/dashboard/'
  | '/supervisor-portal/dashboard/'
  | '/403-forbidden/';

export default function App() {
  const [appState, setAppState] = useState<AppState>(getStoredState);
  const [currentRoute, setCurrentRoute] = useState<AppRoute>('/');
  const [routeHistory, setRouteHistory] = useState<AppRoute[]>([]);
  const [authRole, setAuthRole] = useState<UserRole>('ENGINEER');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [forbiddenState, setForbiddenState] = useState<{
    attemptedPath: string;
    requiredRole: string;
  } | null>(null);

  // Router navigation helper that tracks history
  const navigateTo = (nextRoute: AppRoute) => {
    if (nextRoute !== currentRoute) {
      setRouteHistory((prev) => [...prev, currentRoute]);
      setCurrentRoute(nextRoute);
    }
  };

  // Go to previous page handler
  const handleGoToPrevious = () => {
    if (routeHistory.length > 0) {
      const prevRoute = routeHistory[routeHistory.length - 1];
      setRouteHistory((prev) => prev.slice(0, -1));
      setCurrentRoute(prevRoute);
    } else {
      setCurrentRoute('/');
    }
  };

  // Sync initial state from persistent backend database on mount
  useEffect(() => {
    fetch('/api/db/state')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.db) {
          setAppState((prev) => ({
            ...prev,
            users: data.db.users || prev.users,
            products: data.db.products || prev.products,
            inspections: data.db.inspections || prev.inspections,
            batches: data.db.batches || prev.batches,
          }));
        }
      })
      .catch((err) => console.warn('Could not sync with backend database:', err));
  }, []);

  // Synchronize state changes to localStorage
  useEffect(() => {
    saveStoredState(appState);
  }, [appState]);

  // Reset scroll on navigation
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentRoute]);

  // Navigate to auth portal from landing cards
  const handleNavigateAuth = (role: UserRole, mode: 'login' | 'register') => {
    setAuthRole(role);
    setAuthMode(mode);
    if (role === 'ADMINISTRATOR') {
      setCurrentRoute(mode === 'login' ? '/auth/admin/login/' : '/auth/admin/register/');
    } else if (role === 'ENGINEER') {
      setCurrentRoute(mode === 'login' ? '/auth/engineer/login/' : '/auth/engineer/register/');
    } else {
      setCurrentRoute(mode === 'login' ? '/auth/supervisor/login/' : '/auth/supervisor/register/');
    }
  };

  // Instant fast-pass for testing from landing page
  const handleQuickLaunch = (role: UserRole) => {
    const user = DEFAULT_USERS[role];
    setAppState((prev) => ({
      ...prev,
      currentUser: user,
      sessionUser: user,
    }));
    if (role === 'ADMINISTRATOR') setCurrentRoute('/admin-portal/dashboard/');
    if (role === 'ENGINEER') setCurrentRoute('/engineer-portal/dashboard/');
    if (role === 'SUPERVISOR') setCurrentRoute('/supervisor-portal/dashboard/');
  };

  // Login handler
  const handleLoginSuccess = (user: UserProfile) => {
    setAppState((prev) => ({
      ...prev,
      currentUser: user,
      sessionUser: user,
    }));
    if (user.role === 'ADMINISTRATOR') setCurrentRoute('/admin-portal/dashboard/');
    else if (user.role === 'ENGINEER') setCurrentRoute('/engineer-portal/dashboard/');
    else setCurrentRoute('/supervisor-portal/dashboard/');
  };

  // Registration handler
  const handleRegisterSuccess = (newUser: UserProfile) => {
    setAppState((prev) => {
      const exists = prev.users.some((u) => u.username.toLowerCase() === newUser.username.toLowerCase());
      const updatedUsers = exists ? prev.users : [...prev.users, newUser];
      return {
        ...prev,
        users: updatedUsers,
      };
    });

    fetch('/api/db/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser),
    }).catch((err) => console.warn('Backend user save failed:', err));

    setAuthRole(newUser.role);
    setAuthMode('login');

    if (currentRoute.startsWith('/auth/')) {
      if (newUser.role === 'ADMINISTRATOR') setCurrentRoute('/auth/admin/login/');
      else if (newUser.role === 'ENGINEER') setCurrentRoute('/auth/engineer/login/');
      else setCurrentRoute('/auth/supervisor/login/');
    } else {
      setCurrentRoute('/');
    }
  };

  // Sign out handler
  const handleSignOut = () => {
    setAppState((prev) => ({
      ...prev,
      sessionUser: null,
    }));
    setCurrentRoute('/');
    setForbiddenState(null);
  };

  // Add Product (Admin)
  const handleAddProduct = (newProduct: Product) => {
    setAppState((prev) => ({
      ...prev,
      products: [...prev.products, newProduct],
    }));
  };

  // Provision User (Admin)
  const handleProvisionUser = (newUser: UserProfile) => {
    setAppState((prev) => ({
      ...prev,
      users: [...prev.users, newUser],
    }));
  };

  // Add Inspection (Engineer)
  const handleAddInspection = (newInspection: Inspection) => {
    fetch('/api/db/inspections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newInspection),
    }).catch((err) => console.warn('Backend save failed:', err));

    setAppState((prev) => ({
      ...prev,
      inspections: [newInspection, ...prev.inspections],
    }));
  };

  // Add Batch (Engineer)
  const handleAddBatch = (newBatch: InspectionBatch) => {
    setAppState((prev) => ({
      ...prev,
      batches: [newBatch, ...prev.batches],
    }));
  };

  // Explicit Quality Incident Creation Trigger (Engineer clicks "CREATE QUALITY INCIDENT")
  const handleCreateQualityIncident = (inspectionId: number): Inspection | null => {
    let updatedInspection: Inspection | null = null;

    // Call persistent backend API
    fetch('/api/db/incidents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inspectionId,
        requestingUser: appState.currentUser.username,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          alert(data.error || 'Failed to create Quality Incident');
          return;
        }
        if (data.inspection) {
          setAppState((prev) => ({
            ...prev,
            inspections: prev.inspections.map((i) => (i.id === inspectionId ? data.inspection : i)),
          }));
        }
      })
      .catch((err) => console.warn('Backend incident save failed:', err));

    setAppState((prev) => {
      const target = prev.inspections.find((i) => i.id === inspectionId);
      if (!target) return prev;

      // Idempotency: If incident already exists, return existing
      if (target.qualityIncident) {
        updatedInspection = target;
        return prev;
      }

      if (!canCreateQualityIncident(target)) {
        return prev;
      }

      const rawClass = target.prediction?.predictedClass || 'Defective';
      const score = target.damageAnalysis?.relevanceScore ?? target.prediction?.defectProbability ?? 0.85;

      const incident = generateQualityIncidentPayload({
        inspectionId: target.id,
        productId: target.productId,
        productName: target.productName,
        submittedBy: target.submittedBy,
        originalClass: rawClass,
        relevanceScore: score,
      });

      const newEvents = [
        ...target.events,
        {
          id: Date.now(),
          actorUsername: prev.currentUser.username,
          eventType: 'QUALITY_INCIDENT_CREATED',
          description: `Quality Incident created for ${target.productId}. Action plan generated from mapped SOPs (${incident.citations.length} page citations).`,
          createdAt: new Date().toISOString(),
        },
      ];

      const newInsp: Inspection = {
        ...target,
        qualityIncident: incident,
        events: newEvents,
        updatedAt: new Date().toISOString(),
      };

      updatedInspection = newInsp;

      return {
        ...prev,
        inspections: prev.inspections.map((i) => (i.id === inspectionId ? newInsp : i)),
      };
    });

    return updatedInspection;
  };

  // Update Quality Incident Supervisor Decision (Supervisor: Approved for follow-up OR Needs more information)
  const handleUpdateIncidentSupervisorDecision = (
    inspectionId: number,
    decision: 'APPROVED_FOR_FOLLOW_UP' | 'NEEDS_MORE_INFO',
    comment: string
  ) => {
    const val = validateSupervisorDecision(decision, comment);
    if (!val.valid) {
      alert(val.errorMessage);
      return;
    }

    // Call persistent backend API
    fetch('/api/db/incidents/review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inspectionId,
        decision,
        comment,
        supervisorUsername: appState.currentUser.username,
        reviewerRole: appState.currentUser.role,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          alert(data.error || 'Failed to submit Supervisor review');
          return;
        }
        if (data.inspection) {
          setAppState((prev) => ({
            ...prev,
            inspections: prev.inspections.map((i) => (i.id === inspectionId ? data.inspection : i)),
          }));
        }
      })
      .catch((err) => console.warn('Backend review save failed:', err));

    setAppState((prev) => ({
      ...prev,
      inspections: prev.inspections.map((i) => {
        if (i.id === inspectionId && i.qualityIncident) {
          const now = new Date().toISOString();
          const updatedIncident = {
            ...i.qualityIncident,
            status: decision as any,
            supervisorDecision: decision,
            supervisorComment: comment.trim(),
            supervisorUsername: prev.currentUser.username,
            updatedAt: now,
          };

          const newEvents = [
            ...i.events,
            {
              id: Date.now(),
              actorUsername: prev.currentUser.username,
              eventType: `INCIDENT_DECISION_${decision}`,
              description: `Supervisor @${prev.currentUser.username} decision: '${decision === 'APPROVED_FOR_FOLLOW_UP' ? 'Approved for follow-up' : 'Needs more information'}'. Comment: "${comment.trim()}" (Note: Follow-up authorization ONLY; does not constitute product clearance/release).`,
              createdAt: now,
            },
          ];

          return {
            ...i,
            qualityIncident: updatedIncident,
            events: newEvents,
            updatedAt: now,
          };
        }
        return i;
      }),
    }));
  };

  // Update Supervisor Review (Supervisor)
  const handleUpdateInspectionReview = (inspectionId: number, review: SupervisorReview) => {
    setAppState((prev) => ({
      ...prev,
      inspections: prev.inspections.map((i) => {
        if (i.id === inspectionId) {
          const newEvents = [
            ...i.events,
            {
              id: Date.now(),
              actorUsername: review.reviewerUsername,
              eventType: `SUPERVISOR_REVIEW_${review.reviewStatus}`,
              description: `Supervisor @${review.reviewerUsername} evaluated: AI='${i.prediction?.predictedClass}' -> Reviewed='${review.reviewedClass}'. Comment: "${review.comment}"`,
              createdAt: new Date().toISOString(),
            },
          ];
          return {
            ...i,
            supervisorReview: review,
            events: newEvents,
            updatedAt: new Date().toISOString(),
          };
        }
        return i;
      }),
    }));
  };

  // Deliberate 403 test handlers
  const handleTriggerBlockedSupervisorAction = () => {
    setForbiddenState({
      attemptedPath: '/supervisor-portal/dashboard/review-action',
      requiredRole: 'SUPERVISOR (or ADMINISTRATOR)',
    });
    setCurrentRoute('/403-forbidden/');
  };

  const handleTriggerBlockedAdminAction = () => {
    setForbiddenState({
      attemptedPath: '/admin-portal/dashboard/model-weights/override',
      requiredRole: 'ADMINISTRATOR',
    });
    setCurrentRoute('/403-forbidden/');
  };

  // ROUTING RENDER LOGIC

  // 1. 403 Forbidden Screen
  if (currentRoute === '/403-forbidden/' && forbiddenState) {
    return (
      <Forbidden403
        currentUser={appState.currentUser}
        attemptedPath={forbiddenState.attemptedPath}
        requiredRole={forbiddenState.requiredRole}
        onReturnToAllowedWorkspace={() => {
          if (appState.currentUser.role === 'ADMINISTRATOR') navigateTo('/admin-portal/dashboard/');
          else if (appState.currentUser.role === 'ENGINEER') navigateTo('/engineer-portal/dashboard/');
          else navigateTo('/supervisor-portal/dashboard/');
          setForbiddenState(null);
        }}
        onSignOut={handleSignOut}
        onGoToPrevious={handleGoToPrevious}
      />
    );
  }

  // 2. Split-Screen Authentication Routes
  if (
    currentRoute === '/auth/admin/login/' ||
    currentRoute === '/auth/admin/register/' ||
    currentRoute === '/auth/engineer/login/' ||
    currentRoute === '/auth/engineer/register/' ||
    currentRoute === '/auth/supervisor/login/' ||
    currentRoute === '/auth/supervisor/register/'
  ) {
    return (
      <AuthSplitScreen
        role={authRole}
        mode={authMode}
        onLoginSuccess={handleLoginSuccess}
        onRegisterSuccess={handleRegisterSuccess}
        onNavigateMode={(mode) => {
          setAuthMode(mode);
          handleNavigateAuth(authRole, mode);
        }}
        onBackToLanding={() => navigateTo('/')}
        existingUsers={appState.users}
        onGoToPrevious={handleGoToPrevious}
      />
    );
  }

  // 3. Authenticated Portals (Strictly Role-Separated)
  if (currentRoute === '/admin-portal/dashboard/') {
    // Access guard
    if (appState.currentUser.role !== 'ADMINISTRATOR') {
      return (
        <Forbidden403
          currentUser={appState.currentUser}
          attemptedPath="/admin-portal/dashboard/"
          requiredRole="ADMINISTRATOR"
          onReturnToAllowedWorkspace={() => {
            if (appState.currentUser.role === 'ENGINEER') navigateTo('/engineer-portal/dashboard/');
            else navigateTo('/supervisor-portal/dashboard/');
          }}
          onSignOut={handleSignOut}
          onGoToPrevious={handleGoToPrevious}
        />
      );
    }
    return (
      <AdminPortal
        currentUser={appState.currentUser}
        products={appState.products}
        inspections={appState.inspections}
        batches={appState.batches}
        users={appState.users}
        onAddProduct={handleAddProduct}
        onProvisionUser={handleProvisionUser}
        onSignOut={handleSignOut}
        onGoToPrevious={handleGoToPrevious}
      />
    );
  }

  if (currentRoute === '/engineer-portal/dashboard/') {
    // Access guard
    if (!canAccessPortal(appState.currentUser.role, 'ENGINEER')) {
      return (
        <Forbidden403
          currentUser={appState.currentUser}
          attemptedPath="/engineer-portal/dashboard/"
          requiredRole="ENGINEER"
          onReturnToAllowedWorkspace={() => {
            if (appState.currentUser.role === 'ADMINISTRATOR') navigateTo('/admin-portal/dashboard/');
            else navigateTo('/supervisor-portal/dashboard/');
          }}
          onSignOut={handleSignOut}
          onGoToPrevious={handleGoToPrevious}
        />
      );
    }
    return (
      <EngineerPortal
        currentUser={appState.currentUser}
        products={appState.products}
        inspections={appState.inspections}
        batches={appState.batches}
        onAddInspection={handleAddInspection}
        onAddBatch={handleAddBatch}
        onCreateQualityIncident={handleCreateQualityIncident}
        onSignOut={handleSignOut}
        onRequestSupervisorActionBlocked={handleTriggerBlockedSupervisorAction}
        onGoToPrevious={handleGoToPrevious}
      />
    );
  }

  if (currentRoute === '/supervisor-portal/dashboard/') {
    // Access guard
    if (!canAccessPortal(appState.currentUser.role, 'SUPERVISOR')) {
      return (
        <Forbidden403
          currentUser={appState.currentUser}
          attemptedPath="/supervisor-portal/dashboard/"
          requiredRole="SUPERVISOR"
          onReturnToAllowedWorkspace={() => {
            if (appState.currentUser.role === 'ENGINEER') navigateTo('/engineer-portal/dashboard/');
            else navigateTo('/admin-portal/dashboard/');
          }}
          onSignOut={handleSignOut}
          onGoToPrevious={handleGoToPrevious}
        />
      );
    }
    return (
      <SupervisorPortal
        currentUser={appState.currentUser}
        products={appState.products}
        inspections={appState.inspections}
        onUpdateInspectionReview={handleUpdateInspectionReview}
        onUpdateIncidentSupervisorDecision={handleUpdateIncidentSupervisorDecision}
        onSignOut={handleSignOut}
        onRequestAdminActionBlocked={handleTriggerBlockedAdminAction}
        onGoToPrevious={handleGoToPrevious}
      />
    );
  }

  // 4. Public Landing Page (/landing/)
  if (currentRoute === '/landing/') {
    return (
      <LandingPage
        onNavigateAuth={(role, mode) => {
          setAuthRole(role);
          setAuthMode(mode);
          navigateTo('/');
        }}
        onQuickLaunchDashboard={handleQuickLaunch}
        onGoToPrevious={handleGoToPrevious}
      />
    );
  }

  // 5. Primary Role Gateway (/) matching user screenshot specification
  return (
    <UnifiedGateway
      initialRole={authRole}
      initialMode={authMode}
      onLoginSuccess={handleLoginSuccess}
      onRegisterSuccess={handleRegisterSuccess}
      existingUsers={appState.users}
      onSwitchToSplitScreen={() => {
        handleNavigateAuth(authRole, authMode);
      }}
      onNavigateToLanding={() => {
        navigateTo('/landing/');
      }}
      onGoToPrevious={handleGoToPrevious}
    />
  );
}

