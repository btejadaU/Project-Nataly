import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import Header from './Header';
import { Award, BookOpen, Building2, CalendarDays, ClipboardList, LayoutDashboard, X } from 'lucide-react';
import { roleLabel } from '../utils/formatters';

const navigation = {
  admin: [
    { label: 'Resumen', icon: LayoutDashboard },
    { label: 'Salones y cursos', icon: Building2 },
    { label: 'Estudiantes', icon: ClipboardList }
  ],
  teacher: [
    { label: 'Tus clases', icon: BookOpen },
    { label: 'Calendario', icon: CalendarDays }
  ],
  guardian: [
    { label: 'Notas', icon: Award },
    { label: 'Horario semanal', icon: CalendarDays }
  ]
};

export default function AppShell({ children }) {
  const { currentRole, guardianSection, setGuardianSection } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const items = navigation[currentRole] || [];

  const handleNavigation = (label) => {
    if (currentRole === 'guardian') {
      setGuardianSection(label === 'Notas' ? 'grades' : 'schedule');
    }
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-slate-900 flex flex-col font-sans">
      <Header onMenuClick={() => setSidebarOpen(value => !value)} />
      <div className="flex flex-1 w-full">
        <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200/80 pt-20 transition-transform duration-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="px-4 pb-4 flex justify-end">
            <button type="button" onClick={() => setSidebarOpen(false)} className="p-2 text-slate-500" aria-label="Cerrar navegación"><X className="w-5 h-5" /></button>
          </div>
          <div className="px-4 mb-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Espacio de trabajo</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{roleLabel(currentRole)}</p>
          </div>
          <nav className="px-3 space-y-1" aria-label="Navegación principal">
            {items.map(({ label, icon: Icon }) => {
              const active = currentRole === 'guardian' && ((label === 'Notas' && guardianSection === 'grades') || (label === 'Horario semanal' && guardianSection === 'schedule'));
              return <button key={label} type="button" onClick={() => handleNavigation(label)} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold text-left transition-colors ${active ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary-strong)]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}><Icon className="w-4 h-4" />{label}</button>;
            })}
          </nav>
        </aside>
        {sidebarOpen && <button type="button" className="fixed inset-0 z-40 bg-slate-950/30 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Cerrar navegación" />}
        <main className="flex-1 min-w-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}