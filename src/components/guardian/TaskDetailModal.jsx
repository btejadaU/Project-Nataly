import React, { useEffect } from 'react';
import { X, Calendar, BookOpen, User, Clock, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import { useScrollLock } from '../../utils/useScrollLock';

export default function TaskDetailModal({ task, student, onClose }) {
  useScrollLock(Boolean(task));

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!task) return null;

  const studentGrade = task.studentGrade || (student?.id && task.studentGrades?.[student.id]) || null;
  const hasScore = studentGrade?.score !== null && studentGrade?.score !== undefined;
  const teacherDisplayName = task.teacherName && task.teacherName !== 'Docente'
    ? task.teacherName
    : 'No asignado';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in duration-150"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-[var(--radius-lg)] bg-white shadow-2xl border border-slate-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-detail-title"
        onClick={event => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-4">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
              <BookOpen className="w-3 h-3" />
              {task.subjectName}
            </span>
            <h3 id="task-detail-title" className="text-base sm:text-lg font-black text-slate-900 mt-1.5 break-words">
              {task.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
            aria-label="Cerrar detalle"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="modal-scrollable-content p-5 space-y-4 max-h-[calc(85vh-120px)] overflow-y-auto">
          {/* Metadata badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-600">
              <User className="w-4 h-4 text-purple-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-slate-400">Docente asignado</p>
                <p className="font-semibold text-slate-800 truncate">Docente: {teacherDisplayName}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-slate-600">
              <Clock className="w-4 h-4 text-purple-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-slate-400">Fecha de entrega</p>
                <p className="font-semibold text-slate-800 truncate">{task.dueDate || 'Sin fecha'}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-purple-600" />
              Instrucciones y detalles
            </h4>
            <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/80 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
              {task.description ? task.description : (
                <span className="italic text-slate-400">No se proporcionó una descripción adicional para esta actividad.</span>
              )}
            </div>
          </div>

          {/* Grade / State if available */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Estado de entrega</span>
              {hasScore ? (
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Calificada: {studentGrade.score.toFixed(1)}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Pendiente de entrega / calificación
                </span>
              )}
            </div>
            {studentGrade?.teacherNote && (
              <p className="text-xs text-slate-600 pt-2 border-t border-slate-100">
                <strong className="text-slate-800">Comentario del docente:</strong> {studentGrade.teacherNote}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
