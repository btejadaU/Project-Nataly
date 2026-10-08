import React, { Suspense, lazy } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppShell from './components/AppShell';
import LoginPage from './components/auth/LoginPage';
import FirstTimePasswordModal from './components/auth/FirstTimePasswordModal';
import { useAppUpdate } from './services/versionChecker';

// Cada rol solo descarga el código de su propio panel.
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard'));
const TeacherDashboard = lazy(() => import('./components/teacher/TeacherDashboard'));
const GuardianDashboard = lazy(() => import('./components/guardian/GuardianDashboard'));

function MainContent() {
  const { currentRole, isReady, loadError, loadData } = useApp();

  if (loadError && !isReady) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
        <p className="font-bold">No se pudo cargar la información.</p>
        <p className="mt-1">{loadError}</p>
        <button type="button" onClick={loadData} className="mt-3 rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white">Reintentar</button>
      </div>
    );
  }

  if (!isReady) {
    return <p className="py-10 text-center text-sm font-semibold text-slate-600">Cargando información...</p>;
  }

  return (
    <div className="space-y-6 sm:space-y-8 w-full overflow-hidden">
      <Suspense fallback={<p className="py-10 text-center text-sm font-semibold text-slate-600">Cargando panel...</p>}>
        {currentRole === 'admin' && <AdminDashboard />}
        {currentRole === 'teacher' && <TeacherDashboard />}
        {currentRole === 'guardian' && <GuardianDashboard />}
      </Suspense>
    </div>
  );
}

function AuthenticatedApp() {
  const { session, profile, isLoading, authError } = useAuth();

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-[var(--color-canvas)] text-sm font-semibold text-slate-600">Cargando sesión...</div>;
  }

  if (!session || !profile || authError) {
    return <LoginPage />;
  }

  return (
    <AppProvider>
      <AppShell><MainContent /></AppShell>
      {profile?.must_change_password && <FirstTimePasswordModal />}
    </AppProvider>
  );
}

export default function App() {
  const { updateRequired } = useAppUpdate();

  if (updateRequired) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-6 text-center text-white select-none">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-600/20 border border-purple-500/30 text-purple-400 mb-4 animate-pulse">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
        </div>
        <h1 className="text-xl font-bold">Actualización requerida</h1>
        <p className="mt-2 text-sm text-slate-400 max-w-sm">
          Se requiere una actualización obligatoria para continuar usando Project Nataly. Sigue las instrucciones en pantalla.
        </p>
      </div>
    );
  }

  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}
