import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Header from './components/Header';
import AdminDashboard from './components/admin/AdminDashboard';
import TeacherDashboard from './components/teacher/TeacherDashboard';
import GuardianDashboard from './components/guardian/GuardianDashboard';
import { Sparkles, Heart, Shield, School } from 'lucide-react';

function MainContent() {
  const { currentRole } = useApp();

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
      {currentRole === 'admin' && <AdminDashboard />}
      {currentRole === 'teacher' && <TeacherDashboard />}
      {currentRole === 'guardian' && <GuardianDashboard />}
    </main>
  );
}

export default function App() {
  return (
    <AppProvider>
      <div className="min-h-screen bg-[#F7F6FC] text-slate-800 flex flex-col font-sans">
        <Header />
        
        <div className="flex-1">
          <MainContent />
        </div>

        {/* Footer amigable y limpio */}
        <footer className="border-t border-purple-100 bg-white/70 py-6 mt-12 text-center text-xs text-slate-600">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="font-bold text-slate-700">Project Nataly</span>
              <span>— Plataforma de Monitoreo y Comunicación Escolar en Tiempo Real</span>
            </div>
            <div className="flex items-center gap-4 text-slate-600">
              <span>Paleta Pastel & Redondeado</span>
              <span>•</span>
              <span>Adaptación Empática con IA</span>
              <span>•</span>
              <span className="font-semibold text-purple-700">Demo Interactiva 2026</span>
            </div>
          </div>
        </footer>
      </div>
    </AppProvider>
  );
}
