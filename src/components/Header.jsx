import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldCheck,
  Bell,
  ChevronDown,
  Menu,
  LogOut,
  Settings,
  CheckCheck,
  CalendarX,
  BookOpen,
  Award,
  HeartHandshake,
  GraduationCap,
  Smile,
  AlertCircle,
  FileCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatNotificationDate } from '../utils/formatters';
import UserProfileSettingsModal from './profile/UserProfileSettingsModal';
import { useScrollLock } from '../utils/useScrollLock';

export default function Header({ onMenuClick }) {
  const {
    currentRole,
    teachers,
    activeTeacher,
    activeTeacherId,
    setActiveTeacherId,
    students,
    activeStudent,
    activeStudentId,
    setActiveStudentId,
    inAppAlerts,
    markAlertAsRead,
    markAllAlertsAsRead,
    triggerDeepLink
  } = useApp();
  const { signOut, profile } = useAuth();

  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const alertsRef = useRef(null);
  const profileRef = useRef(null);
  const isDismissingRef = useRef(false);
  const dismissTimerRef = useRef(null);

  const isAnyDropdownOpen = showAlertsDropdown || showProfileDropdown;

  const closeDropdowns = (event) => {
    if (event) {
      if (typeof event.stopPropagation === 'function') {
        event.stopPropagation();
      }
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }
      if (event.cancelable && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
    }

    // Activar escudo global durante 400ms para interceptar y aniquilar cualquier ghost-click en móvil
    isDismissingRef.current = true;
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
    }
    dismissTimerRef.current = setTimeout(() => {
      isDismissingRef.current = false;
    }, 400);

    setShowAlertsDropdown(false);
    setShowProfileDropdown(false);
  };

  // Escudo global permanente en fase de captura para devorar clics fantasma que el SO móvil despacha tras touchend
  useEffect(() => {
    const killGhostEvents = (e) => {
      if (isDismissingRef.current) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (e.cancelable && typeof e.preventDefault === 'function') {
          e.preventDefault();
        }
      }
    };

    window.addEventListener('click', killGhostEvents, true);
    window.addEventListener('pointerup', killGhostEvents, true);
    window.addEventListener('touchend', killGhostEvents, true);

    return () => {
      window.removeEventListener('click', killGhostEvents, true);
      window.removeEventListener('pointerup', killGhostEvents, true);
      window.removeEventListener('touchend', killGhostEvents, true);
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, []);

  // Bloquear el scroll del fondo mientras esté visible un menú flotante o dropdown
  useScrollLock(isAnyDropdownOpen);

  // Manejo de eventos globales cuando los menús están abiertos (Escape y clics exteriores)
  useEffect(() => {
    if (!isAnyDropdownOpen) return;

    function handleClickOutside(event) {
      if (isDismissingRef.current) return;
      if (alertsRef.current && !alertsRef.current.contains(event.target)) {
        setShowAlertsDropdown(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        closeDropdowns();
      }
    }

    // Escuchar 'click' en lugar de 'pointerdown' para evitar desmontar la interfaz antes de que el usuario levante el dedo en móvil
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAnyDropdownOpen]);

  const handleMenuClick = (event) => {
    closeDropdowns(event);
    if (onMenuClick) {
      onMenuClick();
    }
  };

  const currentDisplayName =
    currentRole === 'admin'
      ? profile?.full_name || 'Coordinación'
      : currentRole === 'teacher'
      ? activeTeacher?.name || profile?.full_name || 'Profesor'
      : activeStudent?.guardianName || profile?.full_name || 'Acudiente';

  const relevantAlerts = useMemo(() => {
    if (currentRole === 'admin') return [];
    if (currentRole === 'guardian') {
      return inAppAlerts.filter(alert => {
        if (alert.studentId && activeStudentId && alert.studentId !== activeStudentId) {
          return false;
        }
        return true;
      });
    }
    if (currentRole === 'teacher') {
      return inAppAlerts.filter(alert => {
        // Docente no debe recibir alertas virtuales de nuevas tareas destinadas a padres
        if (alert.isVirtual) return false;
        // Si la notificación va dirigida a un docente específico (ej: solicitudes de revisión formal)
        if (alert.recipientId && activeTeacherId && alert.recipientId !== activeTeacherId) {
          return false;
        }
        return true;
      });
    }
    return inAppAlerts;
  }, [inAppAlerts, currentRole, activeStudentId, activeTeacherId]);

  const unreadAlertsList = useMemo(() => {
    return relevantAlerts.filter(alert => !alert.read);
  }, [relevantAlerts]);

  const unreadCount = unreadAlertsList.length;
  const hasUnreadNotifications = unreadCount > 0;

  return (
    <>
      {/* Backdrop / Overlay para interceptar interacciones y bloquear toques accidentales al fondo */}
      {isAnyDropdownOpen && (
        <div
          className="fixed inset-0 w-screen h-screen z-40 bg-slate-950/25 backdrop-blur-xs transition-opacity animate-in fade-in duration-150 select-none touch-none"
          onClick={closeDropdowns}
          onTouchStart={(e) => {
            e.stopPropagation();
          }}
          onTouchEnd={(e) => {
            if (e.cancelable) e.preventDefault();
            e.stopPropagation();
            closeDropdowns(e);
          }}
          onTouchCancel={(e) => {
            e.stopPropagation();
            closeDropdowns(e);
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
          aria-hidden="true"
        />
      )}

      <header className={`sticky top-0 ${isAnyDropdownOpen ? 'z-50' : 'z-40'} bg-white/90 backdrop-blur-md border-b border-purple-100/80 shadow-xs`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2">

          <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
            {currentRole !== 'admin' && (
              <button type="button" onClick={handleMenuClick} className="p-2 rounded-xl text-slate-600 hover:bg-slate-100" aria-label="Abrir navegación">
                <Menu className="w-5 h-5" />
              </button>
            )}

            {/* Logo y Branding */}
            <div className="flex items-center gap-2.5 sm:gap-3.5">
            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-extrabold text-lg sm:text-2xl text-slate-800 tracking-tight">
                  Project <span className="text-purple-600">Nataly</span>
                </span>
              </div>
            </div>
            </div>
          </div>

          {/* Perfil Activo y Notificaciones */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            
            {/* Campana de Notificaciones en la App (solo visible para acudientes / no administradores) */}
            {currentRole !== 'admin' && (
              <div className="relative" ref={alertsRef}>
              <button
                type="button"
                onClick={() => {
                  setShowAlertsDropdown(!showAlertsDropdown);
                  setShowProfileDropdown(false);
                }}
                className={`relative p-2 sm:p-2.5 rounded-2xl border transition-all cursor-pointer ${
                  hasUnreadNotifications
                    ? 'text-amber-600 bg-amber-50/90 border-amber-300 shadow-md animate-bell-glow'
                    : 'text-slate-600 hover:text-purple-600 hover:bg-purple-50 border-slate-200/60'
                }`}
                title={hasUnreadNotifications ? `${unreadCount} notificaciones pendientes` : 'Notificaciones internas del colegio'}
                aria-label="Notificaciones"
              >
                <Bell
                  className={`w-4 h-4 sm:w-5 sm:h-5 transition-transform ${
                    hasUnreadNotifications && !showAlertsDropdown ? 'animate-bell-ring text-amber-600' : ''
                  }`}
                />
                {hasUnreadNotifications && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4.5 min-w-4.5 px-1 items-center justify-center rounded-full bg-rose-600 text-[10px] sm:text-[11px] font-black text-white shadow-md ring-2 ring-white">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-60"></span>
                    <span className="relative z-10">{unreadCount > 9 ? '9+' : unreadCount}</span>
                  </span>
                )}
              </button>

              {/* Dropdown de Notificaciones */}
              {showAlertsDropdown && (
                <div className="fixed inset-x-3 top-16 mt-2 sm:absolute sm:top-full sm:inset-x-auto sm:right-0 sm:mt-2 sm:w-96 max-w-md sm:max-w-sm mx-auto sm:mx-0 bg-white rounded-3xl shadow-2xl border border-purple-100 py-3.5 px-3.5 sm:px-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Bell className="w-4 h-4 text-purple-600 shrink-0" />
                        <h4 className="text-sm font-bold text-slate-800 truncate">Avisos y Notificaciones</h4>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          hasUnreadNotifications ? 'text-amber-700 bg-amber-50 border border-amber-200' : 'text-purple-700 bg-purple-50'
                        }`}>
                          {hasUnreadNotifications ? `${unreadCount} pendientes` : `${relevantAlerts.length} total`}
                        </span>
                        {hasUnreadNotifications && (
                          <button
                            type="button"
                            onClick={() => markAllAlertsAsRead && markAllAlertsAsRead()}
                            className="text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 px-2 py-0.5 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            title="Marcar todas como leídas"
                          >
                            <CheckCheck className="w-3 h-3" />
                            <span className="hidden sm:inline">Leer todas</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="modal-scrollable-content max-h-[60vh] sm:max-h-80 overflow-y-auto divide-y divide-slate-100 my-2 space-y-1">
                      {relevantAlerts.length === 0 ? (
                        <div className="py-8 text-center text-slate-400">
                          <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p className="text-xs font-medium">No hay avisos ni notificaciones registradas.</p>
                        </div>
                      ) : (
                        relevantAlerts.map(alert => {
                          const lowerTitle = (alert.title || '').toLowerCase();
                          const isAbsence = lowerTitle.includes('inasistencia') || lowerTitle.includes('falta') || lowerTitle.includes('llegada tarde');
                          const isDispute = lowerTitle.includes('revisión') || lowerTitle.includes('disputa') || lowerTitle.includes('inconformidad') || lowerTitle.includes('acuerdo');
                          const isReadConfirmation = lowerTitle.includes('lectura') || lowerTitle.includes('firma') || lowerTitle.includes('enterado');
                          const isTask = !isDispute && !isReadConfirmation && lowerTitle.includes('tarea');
                          const isGrade = !isDispute && !isReadConfirmation && (lowerTitle.includes('calificación') || lowerTitle.includes('nota'));

                          return (
                            <div
                              key={alert.id}
                              onClick={() => {
                                setShowAlertsDropdown(false);
                                if (triggerDeepLink) {
                                  triggerDeepLink(alert);
                                } else if (!alert.read && markAlertAsRead) {
                                  markAlertAsRead(alert.id);
                                }
                              }}
                              className={`p-3 rounded-2xl transition-all cursor-pointer ${
                                !alert.read
                                  ? 'bg-amber-50/60 hover:bg-amber-100/60 border border-amber-200/90 shadow-2xs'
                                  : 'hover:bg-slate-50 border border-transparent opacity-85'
                              }`}
                            >
                              <div className="flex items-start gap-2.5">
                                <div className={`p-1.5 rounded-xl shrink-0 mt-0.5 ${
                                  isDispute
                                    ? 'bg-rose-100 text-rose-600'
                                    : isReadConfirmation
                                    ? 'bg-emerald-100 text-emerald-600'
                                    : isAbsence
                                    ? 'bg-rose-100 text-rose-600'
                                    : isTask
                                    ? 'bg-indigo-100 text-indigo-600'
                                    : isGrade
                                    ? 'bg-emerald-100 text-emerald-600'
                                    : 'bg-purple-100 text-purple-600'
                                }`}>
                                  {isDispute ? (
                                    <AlertCircle className="w-3.5 h-3.5" />
                                  ) : isReadConfirmation ? (
                                    <FileCheck className="w-3.5 h-3.5" />
                                  ) : isAbsence ? (
                                    <CalendarX className="w-3.5 h-3.5" />
                                  ) : isTask ? (
                                    <BookOpen className="w-3.5 h-3.5" />
                                  ) : isGrade ? (
                                    <Award className="w-3.5 h-3.5" />
                                  ) : (
                                    <Bell className="w-3.5 h-3.5" />
                                  )}
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-1.5">
                                    <div className="flex items-start gap-1.5 min-w-0">
                                      <p className="text-xs font-bold text-slate-800 leading-snug line-clamp-2">
                                        {alert.title}
                                      </p>
                                      {!alert.read && (
                                        <span className="shrink-0 text-[9px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full mt-0.5">
                                          Nueva
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-slate-500 shrink-0 font-medium whitespace-nowrap ml-1 mt-0.5">
                                      {formatNotificationDate(alert.timestamp)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-600 mt-1 leading-relaxed break-words">
                                    {alert.message}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-slate-500">
                      <p className="text-[11px] text-slate-500">
                        {currentRole === 'teacher'
                          ? 'Avisos, solicitudes de revisión y comunicados docentes.'
                          : 'Notificaciones internas para estudiantes y acudientes.'}
                      </p>
                      {hasUnreadNotifications && (
                        <button
                          type="button"
                          onClick={() => markAllAlertsAsRead && markAllAlertsAsRead()}
                          className="text-[11px] font-bold text-purple-600 hover:text-purple-800 cursor-pointer"
                        >
                          Marcar leídas
                        </button>
                      )}
                    </div>
                  </div>
              )}
            </div>
            )}

            {/* Gestión de Perfil desde la bola / avatar superior derecha */}
            <div className="relative pl-1 sm:pl-2 sm:border-l sm:border-slate-200" ref={profileRef}>
              <button
                onClick={() => {
                  setShowProfileDropdown(!showProfileDropdown);
                  setShowAlertsDropdown(false);
                }}
                className="group flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-2xl hover:bg-purple-50/90 border border-transparent hover:border-purple-200 transition-all cursor-pointer"
                title="Haz clic para ver detalles del perfil y cerrar sesión"
              >
                {/* Nombre y cargo del usuario (pantallas sm+) */}
                <div className="hidden sm:block text-right">
                  {currentRole === 'admin' && (
                    <>
                      <div className="text-xs font-bold text-slate-800 group-hover:text-purple-700 transition-colors">
                        {profile?.full_name || 'Coordinador'}
                      </div>
                      <div className="text-[11px] text-purple-600 font-medium">
                        Coordinación General
                      </div>
                    </>
                  )}

                  {currentRole === 'guardian' && (
                    <>
                      <div className="text-xs font-bold text-slate-800 group-hover:text-fuchsia-700 transition-colors">
                        {activeStudent?.guardianName || profile?.full_name || 'Acudiente'}
                      </div>
                      <div className="text-[11px] text-fuchsia-600 font-medium">
                        {activeStudent ? `Acudiente de ${activeStudent.name.split(' ')[0]} (${activeStudent.gradeName})` : 'Acudiente'}
                      </div>
                    </>
                  )}

                  {currentRole === 'teacher' && (
                    <div className="text-xs font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">
                      {activeTeacher?.name || profile?.full_name || 'Docente'}
                    </div>
                  )}
                </div>

                {/* Insignia indicadora de rol y mini logo */}
                {currentRole === 'teacher' ? (
                  <div className="flex flex-col items-center justify-center shrink-0">
                    <div className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-xl flex items-center justify-center shrink-0 shadow-2xs transition-transform group-hover:scale-105 bg-gradient-to-br from-indigo-600 to-purple-600 text-white">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-extrabold text-indigo-700 tracking-tight leading-tight mt-0.5">
                      Docente
                    </span>
                  </div>
                ) : (
                  <div className="shrink-0 flex items-center gap-1.5">
                    <div className={`w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-xl flex items-center justify-center shrink-0 shadow-2xs transition-transform group-hover:scale-105 ${
                      currentRole === 'admin'
                        ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white'
                        : 'bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white'
                    }`}>
                      {currentRole === 'guardian' ? (
                        <HeartHandshake className="w-4 h-4" />
                      ) : (
                        <ShieldCheck className="w-4 h-4" />
                      )}
                    </div>
                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black border shadow-xs ${
                      currentRole === 'admin'
                        ? 'bg-purple-100 text-purple-800 border-purple-200'
                        : 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200'
                    }`}>
                      {currentRole === 'admin' ? 'Coordinación' : 'Acudiente'}
                    </span>
                  </div>
                )}

                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-purple-600 transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Menú Desplegable Flotante de Gestión de Perfiles */}
              {showProfileDropdown && (
                <div className="fixed inset-x-3 top-16 mt-2 sm:absolute sm:top-full sm:inset-x-auto sm:right-0 sm:mt-2 sm:w-96 max-w-md sm:max-w-sm mx-auto sm:mx-0 bg-white rounded-3xl shadow-2xl border border-purple-100 p-4 z-50 animate-in fade-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto">
                    
                    {/* Tarjeta de Perfil Actualmente Activo con Avatar e Indicador */}
                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-purple-50/90 via-fuchsia-50/40 to-white border border-purple-100/90 shadow-2xs flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs shrink-0 ring-2 ring-white ${
                        currentRole === 'admin'
                          ? 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white'
                          : currentRole === 'teacher'
                          ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white'
                          : 'bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white'
                      }`}>
                        {currentRole === 'guardian' ? (
                          <HeartHandshake className="w-5 h-5" />
                        ) : currentRole === 'teacher' ? (
                          <GraduationCap className="w-5 h-5" />
                        ) : (
                          <ShieldCheck className="w-5 h-5" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-black text-slate-900 truncate">
                            {currentDisplayName}
                          </h4>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-2xs" title="En línea" />
                        </div>
                        <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                          {profile?.email}
                        </p>
                      </div>
                    </div>

                    {/* SECCIÓN 1: Selección de Cuentas según el Rol Activo */}
                    {currentRole === 'teacher' && (
                      <div className="mt-3.5">
                        <div className="flex items-center justify-between px-1 pb-2 border-b border-purple-100/60">
                          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                            Cambiar Perfil ({teachers.length})
                          </span>
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-full shadow-2xs">
                            Activo: {activeTeacher?.name.split(' ')[0]}
                          </span>
                        </div>

                        <div className="mt-2.5 space-y-1.5 max-h-64 overflow-y-auto pr-1">
                          {teachers.map((t) => {
                            const isCurrent = t.id === activeTeacherId;
                            return (
                              <button
                                key={t.id}
                                onClick={() => {
                                  setActiveTeacherId(t.id);
                                  setShowProfileDropdown(false);
                                }}
                                className={`group w-full flex items-center justify-between p-2.5 rounded-2xl text-left transition-all cursor-pointer ${
                                  isCurrent
                                    ? 'bg-gradient-to-r from-indigo-50/90 to-purple-50/60 border border-indigo-300/80 text-indigo-950 font-bold shadow-xs'
                                    : 'bg-white hover:bg-slate-50/80 text-slate-700 border border-slate-100 hover:border-indigo-200 shadow-2xs'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center shrink-0 shadow-2xs transition-transform group-hover:scale-105 ${
                                    isCurrent
                                      ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xs'
                                      : 'bg-indigo-100/70 text-indigo-700 group-hover:bg-indigo-200/80'
                                  }`}>
                                    <GraduationCap className="w-4.5 h-4.5" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-black text-slate-800 truncate">
                                      {t.name}
                                    </div>
                                    <div className="text-[11px] text-indigo-600 font-semibold truncate mt-0.5">
                                      {t.subject}
                                    </div>
                                  </div>
                                </div>

                                {isCurrent ? (
                                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shadow-xs shrink-0 ml-2">
                                    ✓
                                  </div>
                                ) : (
                                  <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50/80 group-hover:bg-indigo-100 px-2.5 py-1 rounded-xl border border-indigo-200/60 shrink-0 ml-2 transition-colors shadow-2xs">
                                    Elegir
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {currentRole === 'guardian' && (
                      <div className="mt-3.5">
                        <div className="flex items-center justify-between px-1 pb-2 border-b border-purple-100/60">
                          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                            Cambiar Estudiante a Cargo ({students.length})
                          </span>
                          <span className="text-[10px] font-bold text-fuchsia-700 bg-fuchsia-50 border border-fuchsia-200/60 px-2.5 py-0.5 rounded-full shadow-2xs">
                            Activo: {activeStudent?.name.split(' ')[0]}
                          </span>
                        </div>

                        <div className="mt-2.5 space-y-1.5 max-h-64 overflow-y-auto pr-1">
                          {students.map((s) => {
                            const isCurrent = s.id === activeStudentId;
                            return (
                              <button
                                key={s.id}
                                onClick={() => {
                                  setActiveStudentId(s.id);
                                  setShowProfileDropdown(false);
                                }}
                                className={`group w-full flex items-center justify-between p-2.5 rounded-2xl text-left transition-all cursor-pointer ${
                                  isCurrent
                                    ? 'bg-gradient-to-r from-fuchsia-50/90 to-purple-50/50 border border-fuchsia-300/80 text-fuchsia-950 font-bold shadow-xs'
                                    : 'bg-white hover:bg-slate-50/80 text-slate-700 border border-slate-100 hover:border-purple-200 shadow-2xs'
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <div className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center shrink-0 shadow-2xs transition-transform group-hover:scale-105 ${
                                    isCurrent
                                      ? 'bg-gradient-to-br from-fuchsia-500 to-pink-600 text-white shadow-xs'
                                      : 'bg-purple-100/70 text-purple-700 group-hover:bg-purple-200/80'
                                  }`}>
                                    <Smile className="w-4.5 h-4.5" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-black text-slate-800 truncate">
                                      {s.name}
                                    </div>
                                    <div className="text-[11px] text-fuchsia-700 font-semibold truncate mt-0.5">
                                      Grado {s.gradeName}
                                    </div>
                                  </div>
                                </div>

                                {isCurrent ? (
                                  <div className="w-6 h-6 rounded-full bg-fuchsia-600 text-white flex items-center justify-center text-xs font-bold shadow-xs shrink-0 ml-2">
                                    ✓
                                  </div>
                                ) : (
                                  <span className="text-[11px] font-bold text-fuchsia-700 bg-fuchsia-50/80 group-hover:bg-fuchsia-100 px-2.5 py-1 rounded-xl border border-fuchsia-200/60 shrink-0 ml-2 transition-colors shadow-2xs">
                                    Elegir
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {currentRole === 'admin' && (
                      <div className="mt-3.5 p-3 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50/40 border border-purple-100 flex items-center gap-3 shadow-2xs">
                        <div className="w-8.5 h-8.5 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 shadow-2xs">
                          <ShieldCheck className="w-4.5 h-4.5" />
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-purple-950">
                            Coordinación General
                          </h5>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Privilegios de gestión y administración escolar
                          </p>
                        </div>
                      </div>
                    )}

                    {/* SECCIÓN 2: Acciones de Cuenta */}
                    <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowSettingsModal(true);
                          setShowProfileDropdown(false);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-purple-700 bg-purple-50/70 hover:bg-purple-100/80 border border-purple-200/70 transition-all hover:shadow-xs cursor-pointer active:scale-[0.99]"
                      >
                        <Settings className="h-4 w-4 text-purple-600" />
                        <span>Mi Perfil y Configuración</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          signOut();
                          setShowProfileDropdown(false);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50/60 hover:bg-rose-100/70 border border-rose-200/60 transition-all hover:shadow-xs cursor-pointer active:scale-[0.99]"
                      >
                        <LogOut className="h-4 w-4 text-rose-500" />
                        <span>Cerrar sesión</span>
                      </button>
                    </div>



                  </div>
              )}
            </div>

          </div>

        </div>
      </div>

      </header>
      
      {/* Ventana de visualización de perfil y cambio de contraseña */}
      <UserProfileSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </>
  );
}
