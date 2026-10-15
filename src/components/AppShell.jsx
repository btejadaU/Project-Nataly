import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Header from './Header';
import { Award, BookOpen, Building2, CalendarDays, ClipboardList, LayoutDashboard, Scale, X } from 'lucide-react';
import { roleLabel } from '../utils/formatters';

const navigation = {
  admin: [
    { label: 'Resumen', icon: LayoutDashboard },
    { label: 'Salones y cursos', icon: Building2 },
    { label: 'Estudiantes', icon: ClipboardList }
  ],
  teacher: [
    { label: 'Mis Clases', icon: BookOpen, path: '/docente/clases' },
    { label: 'Horario Semanal', icon: CalendarDays, path: '/docente/horario' },
    { label: 'Notas Apeladas', icon: Scale, path: '/docente/notas-apeladas' }
  ],
  guardian: [
    { label: 'Notas', icon: Award },
    { label: 'Horario semanal', icon: CalendarDays }
  ]
};

export default function AppShell({ children }) {
  const { currentRole, guardianSection, setGuardianSection, teacherSection, setTeacherSection } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const items = navigation[currentRole] || [];

  const handleNavigation = (label, path) => {
    if (currentRole === 'guardian') {
      setGuardianSection(label === 'Notas' ? 'grades' : 'schedule');
    } else if (currentRole === 'teacher') {
      if (label === 'Mis Clases' || label === 'Tus clases') {
        setTeacherSection('classes');
        if (typeof window !== 'undefined' && window.location.pathname !== '/docente/clases') {
          window.history.pushState(null, '', '/docente/clases');
        }
      } else if (label === 'Horario Semanal' || label === 'Horario semanal') {
        setTeacherSection('schedule');
        if (typeof window !== 'undefined' && window.location.pathname !== '/docente/horario') {
          window.history.pushState(null, '', '/docente/horario');
        }
      } else if (label === 'Notas Apeladas' || label === 'Notas apeladas') {
        setTeacherSection('appeals');
        if (typeof window !== 'undefined' && window.location.pathname !== '/docente/notas-apeladas') {
          window.history.pushState(null, '', '/docente/notas-apeladas');
        }
      }
    }
    setSidebarOpen(false);
  };

  useEffect(() => {
    const handlePopState = () => {
      if (currentRole === 'teacher' && typeof window !== 'undefined') {
        const path = window.location.pathname;
        if (path.includes('/docente/horario')) setTeacherSection('schedule');
        else if (path.includes('/docente/notas-apeladas')) setTeacherSection('appeals');
        else if (path.includes('/docente/clases')) setTeacherSection('classes');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentRole, setTeacherSection]);

  useEffect(() => {
    if (!sidebarOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false);
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-slate-900 flex flex-col font-sans">
      <Header onMenuClick={() => setSidebarOpen(value => !value)} />
      <div className="flex flex-1 w-full">
        <aside
          onClick={(e) => e.stopPropagation()}
          className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200/80 pt-20 transition-transform duration-200 shadow-xl lg:shadow-none ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="px-4 pb-4 flex justify-end">
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              aria-label="Cerrar navegación"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="px-4 mb-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Espacio de trabajo</p>
            <p className="mt-1 text-sm font-bold text-slate-900">{roleLabel(currentRole)}</p>
          </div>
          <nav className="px-3 space-y-1" aria-label="Navegación principal">
            {items.map(({ label, icon: Icon, path }) => {
              const active =
                (currentRole === 'guardian' && ((label === 'Notas' && guardianSection === 'grades') || (label === 'Horario semanal' && guardianSection === 'schedule'))) ||
                (currentRole === 'teacher' && (
                  ((label === 'Mis Clases' || label === 'Tus clases') && teacherSection === 'classes') ||
                  ((label === 'Horario Semanal' || label === 'Horario semanal') && teacherSection === 'schedule') ||
                  ((label === 'Notas Apeladas' || label === 'Notas apeladas') && teacherSection === 'appeals')
                ));
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleNavigation(label, path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] text-sm font-semibold text-left transition-colors cursor-pointer ${
                    active ? 'bg-[var(--color-primary-soft)] text-[var(--color-primary-strong)]' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              );
            })}
          </nav>
        </aside>
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs lg:hidden transition-opacity select-none touch-none"
            onClick={(e) => {
              e.stopPropagation();
              setSidebarOpen(false);
            }}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => {
              if (e.target === e.currentTarget) {
                if (e.cancelable) e.preventDefault();
                e.stopPropagation();
                setSidebarOpen(false);
              }
            }}
            role="presentation"
            aria-hidden="true"
          />
        )}
        <main className="flex-1 min-w-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}