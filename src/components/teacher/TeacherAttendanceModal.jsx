import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ClipboardCheck, Calendar, CheckCircle2, AlertCircle, LoaderCircle, Users } from 'lucide-react';
import { toLocalISODate } from '../../utils/formatters';

export default function TeacherAttendanceModal({
  isOpen,
  onClose,
  currentClass,
  students = [],
  attendanceLookup,
  activeTeacherId,
  saveAttendance,
  saveAttendanceBatch
}) {
  const [attendanceDate, setAttendanceDate] = useState(() => toLocalISODate());
  const [attendanceStatuses, setAttendanceStatuses] = useState({});
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [attendanceSavedMessage, setAttendanceSavedMessage] = useState('');

  // Inicializar estado cuando se abre el modal o cambia la clase/fecha
  useEffect(() => {
    if (!isOpen || !currentClass) return;
    const initialDate = toLocalISODate();
    setAttendanceDate(initialDate);
    setAttendanceSavedMessage('');

    const initial = {};
    for (const st of students) {
      const existing = attendanceLookup?.get(
        `${st.id}:${currentClass.gradeId}:${currentClass.subjectId ?? ''}:${initialDate}`
      );
      initial[st.id] = {
        status: existing?.status || 'presente',
        note: existing?.note || ''
      };
    }
    setAttendanceStatuses(initial);
  }, [isOpen, currentClass, students, attendanceLookup]);

  // Manejar bloqueo de scroll del fondo y tecla Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !currentClass) return null;

  const handleDateChange = (newDate) => {
    setAttendanceDate(newDate);
    setAttendanceSavedMessage('');
    const updated = {};
    for (const st of students) {
      const existing = attendanceLookup?.get(
        `${st.id}:${currentClass.gradeId}:${currentClass.subjectId ?? ''}:${newDate}`
      );
      updated[st.id] = {
        status: existing?.status || 'presente',
        note: existing?.note || ''
      };
    }
    setAttendanceStatuses(updated);
  };

  const handleSaveAll = async (e) => {
    e.preventDefault();
    if (!currentClass) return;
    setAttendanceSaving(true);
    setAttendanceSavedMessage('');
    try {
      const records = students.map((st) => {
        const item = attendanceStatuses[st.id] || { status: 'presente', note: '' };
        return {
          studentId: st.id,
          classGroupId: currentClass.gradeId,
          subjectId: currentClass.subjectId,
          teacherId: activeTeacherId,
          date: attendanceDate,
          status: item.status,
          note: item.note
        };
      });

      if (saveAttendanceBatch) {
        await saveAttendanceBatch(records);
      } else if (saveAttendance) {
        await Promise.all(records.map(saveAttendance));
      }

      setAttendanceSavedMessage('¡Asistencia guardada! Se notificó automáticamente a los acudientes con inasistencia.');
      setTimeout(() => {
        onClose();
        setAttendanceSavedMessage('');
      }, 1800);
    } catch (err) {
      setAttendanceSavedMessage('Error al guardar asistencia: ' + (err.message || 'Error desconocido'));
    } finally {
      setAttendanceSaving(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200 select-none touch-none"
      onClick={onClose}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => {
        if (e.target === e.currentTarget) {
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
      role="presentation"
      aria-hidden="true"
    >
      <div
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150 select-text touch-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="attendance-modal-title"
      >
        {/* Cabecera del Modal */}
        <div className="p-5 border-b border-purple-100 flex items-center justify-between bg-gradient-to-r from-purple-50/80 via-indigo-50/40 to-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 shadow-2xs">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                <h3 id="attendance-modal-title" className="text-base font-black text-slate-900 truncate">
                  Control de Asistencia
                </h3>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 truncate">
                {currentClass.subjectName} · {currentClass.gradeName} ({students.length} estudiantes)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            aria-label="Cerrar modal de asistencia"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario y Contenido */}
        <form onSubmit={handleSaveAll} className="flex-1 flex flex-col overflow-hidden">
          {/* Barra de Selección de Fecha y Alertas */}
          <div className="p-4 bg-slate-50 border-b border-slate-200/60 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-600" />
                Fecha (Hoy):
              </span>
              <input
                id="att-date-picker"
                type="date"
                value={attendanceDate}
                readOnly
                disabled
                className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-100 font-medium text-slate-600 shadow-2xs cursor-not-allowed select-none pointer-events-none"
              />
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
              <span>Al marcar <strong>Ausente</strong>, se notificará al acudiente.</span>
            </div>
          </div>

          {/* Mensaje de Retroalimentación de Guardado */}
          {attendanceSavedMessage && (
            <div
              className={`p-3 text-xs font-bold text-center animate-in fade-in duration-150 ${
                attendanceSavedMessage.startsWith('Error')
                  ? 'bg-rose-50 text-rose-700 border-b border-rose-200'
                  : 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
              }`}
            >
              {attendanceSavedMessage}
            </div>
          )}

          {/* Lista de Estudiantes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {students.length === 0 ? (
              <div className="text-center py-10 px-4 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                <Users className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold text-slate-600">No hay alumnos asignados a este curso.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Comuníquese con administración si este grupo debería tener estudiantes matriculados.</p>
              </div>
            ) : (
              students.map((st) => {
                const currentStatus = attendanceStatuses[st.id]?.status || 'presente';
                const currentNote = attendanceStatuses[st.id]?.note || '';
                return (
                  <div
                    key={st.id}
                    className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      currentStatus === 'ausente'
                        ? 'bg-rose-50/50 border-rose-200'
                        : currentStatus === 'tardanza'
                        ? 'bg-amber-50/50 border-amber-200'
                        : currentStatus === 'justificada'
                        ? 'bg-blue-50/50 border-blue-200'
                        : 'bg-white border-slate-200 shadow-2xs'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate">{st.name}</p>
                      {currentStatus === 'ausente' && (
                        <input
                          type="text"
                          placeholder="Observación opcional para el padre..."
                          value={currentNote}
                          onChange={(e) => {
                            const val = e.target.value;
                            setAttendanceStatuses((prev) => ({
                              ...prev,
                              [st.id]: { ...prev[st.id], note: val }
                            }));
                          }}
                          className="mt-2 w-full text-[11px] px-3 py-1.5 rounded-xl border border-rose-200 bg-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-rose-400 shadow-2xs"
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          setAttendanceStatuses((prev) => ({
                            ...prev,
                            [st.id]: { ...prev[st.id], status: 'presente' }
                          }));
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[34px] ${
                          currentStatus === 'presente'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Presente
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAttendanceStatuses((prev) => ({
                            ...prev,
                            [st.id]: { ...prev[st.id], status: 'ausente' }
                          }));
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[34px] ${
                          currentStatus === 'ausente'
                            ? 'bg-rose-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Ausente
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAttendanceStatuses((prev) => ({
                            ...prev,
                            [st.id]: { ...prev[st.id], status: 'tardanza' }
                          }));
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[34px] ${
                          currentStatus === 'tardanza'
                            ? 'bg-amber-500 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Tarde
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAttendanceStatuses((prev) => ({
                            ...prev,
                            [st.id]: { ...prev[st.id], status: 'justificada' }
                          }));
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer min-h-[34px] ${
                          currentStatus === 'justificada'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Justificada
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer de Acciones */}
          <div className="p-4 border-t border-purple-100 bg-white flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={attendanceSaving || students.length === 0}
              className="px-5 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-md hover:bg-purple-700 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 active:scale-[0.99]"
            >
              {attendanceSaving && <LoaderCircle className="w-4 h-4 animate-spin" />}
              <span>{attendanceSaving ? 'Guardando...' : 'Guardar y Notificar Faltas'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
