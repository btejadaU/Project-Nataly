import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, CheckCircle2, Clock, AlertCircle, Info } from 'lucide-react';

import { useScrollLock } from '../../utils/useScrollLock';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const WEEK_DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export default function AttendanceCalendarModal({
  isOpen,
  onClose,
  attendances = [],
  studentName = 'Estudiante',
  attendanceStats = null,
  initialDate = null
}) {
  useScrollLock(isOpen);

  const [viewDate, setViewDate] = useState(() => (initialDate ? new Date(initialDate) : new Date()));
  const [selectedDayRecord, setSelectedDayRecord] = useState(null);

  // Sincronizar fecha inicial al abrir desde deep-link de inasistencia
  useEffect(() => {
    if (isOpen && initialDate) {
      const d = new Date(initialDate);
      if (!isNaN(d.getTime())) {
        setViewDate(d);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const dateKey = `${y}-${m}-${day}`;
        const dayRecords = attendances.filter(a => a.date === dateKey);
        if (dayRecords.length > 0) {
          const priority = ['ausente', 'tardanza', 'justificada', 'presente'];
          const highestStatus = priority.find(status => dayRecords.some(r => r.status === status)) || 'presente';
          setSelectedDayRecord({
            dateKey,
            status: highestStatus,
            records: dayRecords
          });
        }
      }
    }
  }, [isOpen, initialDate, attendances]);

  // Desglose de métricas detalladas (ausencias, llegadas tarde, porcentaje)
  const stats = useMemo(() => {
    if (attendanceStats) return attendanceStats;
    const total = attendances.length;
    if (!total) {
      return { percentage: '100%', absences: 0, tardies: 0, total: 0, hasRecurrentTardies: false };
    }
    const absences = attendances.filter(a => a.status === 'ausente').length;
    const tardies = attendances.filter(a => a.status === 'tardanza').length;
    const attended = attendances.filter(a => a.status === 'presente' || a.status === 'tardanza' || a.status === 'justificada').length;
    const pct = Math.round((attended / total) * 100);
    return {
      percentage: `${pct}%`,
      absences,
      tardies,
      total,
      hasRecurrentTardies: tardies >= 3
    };
  }, [attendanceStats, attendances]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const handlePrevMonth = () => {
    setViewDate(new Date(year, month - 1, 1));
    setSelectedDayRecord(null);
  };

  const handleNextMonth = () => {
    setViewDate(new Date(year, month + 1, 1));
    setSelectedDayRecord(null);
  };

  // Mapa de asistencias por fecha 'YYYY-MM-DD'
  const attendanceMap = useMemo(() => {
    const map = new Map();
    for (const record of attendances) {
      if (!record.date) continue;
      const dateKey = record.date.split('T')[0];
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey).push(record);
    }
    return map;
  }, [attendances]);

  // Días del mes y desfase de inicio de semana
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();

    // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    // Ajustar a Lunes = 0, ..., Domingo = 6
    let startingDayOfWeek = firstDay.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6;

    const days = [];
    // Espacios vacíos antes del día 1
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ empty: true, key: `empty-pre-${i}` });
    }

    for (let d = 1; d <= totalDays; d++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateKey = `${year}-${monthStr}-${dayStr}`;
      const records = attendanceMap.get(dateKey) || [];

      // Determinar estado prioritario:
      // ausente (rojo) > tardanza/justificada (amarillo) > presente (verde)
      let status = null;
      if (records.some(r => r.status === 'ausente')) {
        status = 'ausente';
      } else if (records.some(r => r.status === 'tardanza' || r.status === 'justificada')) {
        status = 'tardanza';
      } else if (records.some(r => r.status === 'presente')) {
        status = 'presente';
      }

      days.push({
        day: d,
        dateKey,
        records,
        status,
        key: `day-${d}`
      });
    }

    return days;
  }, [year, month, attendanceMap]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-modal-title"
      >
        {/* Cabecera del modal */}
        <div className="p-5 bg-linear-to-r from-purple-700 via-indigo-700 to-purple-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shadow-xs">
              <CalendarIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 id="calendar-modal-title" className="text-base font-black tracking-tight leading-snug">
                Historial de Asistencia
              </h3>
              <p className="text-xs text-purple-100 opacity-90">
                {studentName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-all cursor-pointer"
            aria-label="Cerrar calendario"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Desglose de métricas detalladas (ausencias, tardanzas, porcentaje) */}
        <div className="grid grid-cols-3 gap-2 px-4 py-3 bg-purple-50/50 border-b border-purple-100 text-center">
          <div className="bg-white rounded-xl p-2 border border-purple-100 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Asistencia</span>
            <span className="text-base sm:text-lg font-black text-emerald-700">{stats.percentage}</span>
          </div>
          <div className="bg-white rounded-xl p-2 border border-purple-100 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Llegadas tarde</span>
            <span className="text-base sm:text-lg font-black text-amber-600">{stats.tardies}</span>
          </div>
          <div className="bg-white rounded-xl p-2 border border-purple-100 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Ausencias</span>
            <span className="text-base sm:text-lg font-black text-rose-600">{stats.absences}</span>
          </div>
        </div>

        {stats.hasRecurrentTardies && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Alerta: El estudiante presenta llegadas tarde recurrentes ({stats.tardies}). Requiere atención del acudiente.</span>
          </div>
        )}

        {/* Navegación de mes */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-purple-100/70 bg-purple-50/40">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-xl hover:bg-purple-100 text-purple-800 transition-colors cursor-pointer"
            title="Mes anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-extrabold text-sm text-slate-800 capitalize">
            {MONTH_NAMES[month]} {year}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-xl hover:bg-purple-100 text-purple-800 transition-colors cursor-pointer"
            title="Mes siguiente"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Grilla del calendario */}
        <div className="modal-scrollable-content p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-black text-slate-400 mb-1">
            {WEEK_DAYS.map(day => (
              <span key={day} className="py-1">{day}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((item) => {
              if (item.empty) {
                return <div key={item.key} className="h-10 sm:h-12 rounded-xl" />;
              }

              const hasRecord = Boolean(item.status);
              const isSelected = selectedDayRecord?.dateKey === item.dateKey;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => hasRecord ? setSelectedDayRecord(item) : setSelectedDayRecord(null)}
                  disabled={!hasRecord}
                  className={`h-10 sm:h-12 rounded-xl flex flex-col items-center justify-center relative transition-all text-xs font-bold ${
                    isSelected
                      ? 'bg-purple-100 border-2 border-purple-600 shadow-xs'
                      : hasRecord
                      ? 'hover:bg-slate-100 border border-slate-200/80 cursor-pointer bg-white'
                      : 'text-slate-400 border border-transparent'
                  }`}
                >
                  <span>{item.day}</span>
                  {/* Punto indicador de estado de asistencia */}
                  {item.status === 'presente' && (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 mt-0.5 shadow-xs" title="Asistió a tiempo" />
                  )}
                  {item.status === 'tardanza' && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 mt-0.5 shadow-xs" title="Llegada tarde / Justificada" />
                  )}
                  {item.status === 'ausente' && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 mt-0.5 shadow-xs" title="Inasistencia" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Detalle del día seleccionado */}
          {selectedDayRecord && (
            <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200 animate-in fade-in duration-150 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-purple-900">
                  Fecha: {selectedDayRecord.dateKey}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  selectedDayRecord.status === 'presente'
                    ? 'bg-emerald-100 text-emerald-800'
                    : selectedDayRecord.status === 'tardanza'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {selectedDayRecord.status === 'presente'
                    ? '🟢 Asistió a tiempo'
                    : selectedDayRecord.status === 'tardanza'
                    ? '🟡 Asistencia con retraso'
                    : '🔴 Inasistencia'}
                </span>
              </div>
              {selectedDayRecord.records.map((r, i) => (
                <div key={i} className="text-xs text-slate-700 pt-1 border-t border-purple-100">
                  <p className="font-semibold text-slate-800">
                    Estado: <span className="capitalize font-bold">{r.status}</span>
                  </p>
                  {r.note && (
                    <p className="text-[11px] text-slate-600 mt-0.5 italic">
                      Observación: "{r.note}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Leyenda institucional */}
          <div className="pt-3 border-t border-slate-100 space-y-1.5">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Convenciones del Calendario:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50/60 p-2 rounded-xl border border-emerald-200/60 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span>🟢 A tiempo</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-800 bg-amber-50/60 p-2 rounded-xl border border-amber-200/60 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <span>🟡 Retraso / Justificada</span>
              </div>
              <div className="flex items-center gap-1.5 text-rose-800 bg-rose-50/60 p-2 rounded-xl border border-rose-200/60 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                <span>🔴 Inasistencia</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
