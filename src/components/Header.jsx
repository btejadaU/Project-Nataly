import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Sparkles,
  ShieldCheck,
  GraduationCap,
  HeartHandshake,
  Bell,
  CheckCircle2,
  ChevronDown,
  User,
  ExternalLink
} from 'lucide-react';

export default function Header() {
  const {
    currentRole,
    setCurrentRole,
    activeStudent,
    activeTeacher,
    inAppAlerts,
    unreadAlertsForActiveStudent
  } = useApp();

  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);

  const roles = [
    {
      id: 'admin',
      label: 'Administrador',
      subtitle: 'Gestión Base',
      icon: ShieldCheck,
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200'
    },
    {
      id: 'teacher',
      label: 'Profesor',
      subtitle: 'Registro y Notificación',
      icon: GraduationCap,
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200'
    },
    {
      id: 'guardian',
      label: 'Acudiente',
      subtitle: 'Consulta en Tiempo Real',
      icon: HeartHandshake,
      badgeColor: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200'
    }
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-purple-100/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo y Branding */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-linear-to-tr from-purple-600 via-indigo-500 to-fuchsia-500 flex items-center justify-center text-white shadow-md shadow-purple-200/50">
              <span className="font-bold text-2xl tracking-tighter">N</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl sm:text-2xl text-slate-800 tracking-tight">
                  Project <span className="text-purple-600">Nataly</span>
                </span>
                <span className="hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                  <Sparkles className="w-3 h-3 mr-1 text-purple-500" /> Demo Escolar
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium hidden md:block">
                Monitoreo informativo y comunicación en tiempo real
              </p>
            </div>
          </div>

          {/* Conmutador Rápido de Roles */}
          <div className="bg-purple-50/70 p-1.5 rounded-2xl border border-purple-100 flex items-center gap-1 shadow-inner">
            {roles.map((r) => {
              const Icon = r.icon;
              const isActive = currentRole === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setCurrentRole(r.id)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-white text-purple-950 shadow-sm shadow-purple-200 border border-purple-200/70 scale-[1.02]'
                      : 'text-slate-600 hover:text-purple-700 hover:bg-white/50'
                  }`}
                  title={`Conmutar a rol ${r.label}`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-purple-600' : 'text-slate-400'}`} />
                  <div className="text-left">
                    <span className="block leading-none">{r.label}</span>
                    <span className="hidden lg:block text-[10px] font-normal text-slate-600 leading-tight">
                      {r.subtitle}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Perfil Activo y Notificaciones */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Campana de Notificaciones en la App */}
            <div className="relative">
              <button
                onClick={() => setShowAlertsDropdown(!showAlertsDropdown)}
                className="relative p-2.5 rounded-2xl text-slate-600 hover:text-purple-600 hover:bg-purple-50 border border-slate-200/60 transition-all cursor-pointer"
                title="Notificaciones internas del colegio"
              >
                <Bell className="w-5 h-5" />
                {unreadAlertsForActiveStudent > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[11px] font-bold text-white shadow-sm ring-2 ring-white animate-pulse">
                    {unreadAlertsForActiveStudent}
                  </span>
                )}
              </button>

              {/* Dropdown de Notificaciones */}
              {showAlertsDropdown && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-3xl shadow-xl border border-purple-100 py-3 px-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-purple-600" />
                      <h4 className="text-sm font-bold text-slate-800">Avisos y Notificaciones</h4>
                    </div>
                    <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                      {inAppAlerts.length} registrados
                    </span>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-50 my-2 space-y-1">
                    {inAppAlerts.map(alert => (
                      <div
                        key={alert.id}
                        className={`p-2.5 rounded-2xl transition-colors ${
                          !alert.read ? 'bg-purple-50/60 border border-purple-100/80' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-bold text-slate-800 leading-snug">{alert.title}</p>
                          <span className="text-[10px] text-slate-600 shrink-0">{alert.timestamp}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{alert.message}</p>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-100 text-center">
                    <p className="text-[11px] text-slate-600">
                      Notificaciones internas para estudiantes y acudientes.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Identidad de Usuario en Demo */}
            <div className="hidden sm:flex items-center gap-2.5 pl-2 border-l border-slate-200">
              {currentRole === 'admin' && (
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-800">Lic. Elena Morales</div>
                  <div className="text-[11px] text-purple-600 font-medium">Coordinación General</div>
                </div>
              )}

              {currentRole === 'teacher' && (
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-800">{activeTeacher.name}</div>
                  <div className="text-[11px] text-indigo-600 font-medium">{activeTeacher.subject}</div>
                </div>
              )}

              {currentRole === 'guardian' && (
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-800">{activeStudent.guardianName}</div>
                  <div className="text-[11px] text-fuchsia-600 font-medium">
                    Acudiente de {activeStudent.name.split(' ')[0]} ({activeStudent.gradeName})
                  </div>
                </div>
              )}

              <div className="w-9 h-9 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 font-bold text-xs shadow-xs">
                {currentRole === 'admin' ? 'ADM' : currentRole === 'teacher' ? 'DOC' : 'ACU'}
              </div>
            </div>

          </div>

        </div>
      </div>
    </header>
  );
}
