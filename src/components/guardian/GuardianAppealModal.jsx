import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle, Send, BookOpen, User, Award } from 'lucide-react';
import { useScrollLock } from '../../utils/useScrollLock';

export default function GuardianAppealModal({
  isOpen,
  onClose,
  task,
  student,
  onSubmit
}) {
  useScrollLock(isOpen);

  const [reason, setReason] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setErrorMsg('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !task) return null;

  const studentGrade = task.studentGrade || task.studentGrades?.[student?.id] || {};
  const currentScore = studentGrade.score !== null && studentGrade.score !== undefined
    ? Number(studentGrade.score).toFixed(1)
    : '—';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErrorMsg('Por favor describe el motivo de tu desacuerdo con la calificación.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      await onSubmit({
        taskId: task.id,
        studentId: student?.id,
        reason: reason.trim()
      });
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Ocurrió un error al enviar la solicitud.');
      setIsSubmitting(false);
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
        className="bg-white rounded-3xl max-w-lg w-full flex flex-col shadow-2xl border border-purple-100 overflow-hidden animate-in zoom-in-95 duration-150 select-text touch-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="appeal-modal-title"
      >
        {/* Cabecera */}
        <div className="p-5 bg-linear-to-r from-purple-700 via-indigo-700 to-purple-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shadow-xs">
              <AlertCircle className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 id="appeal-modal-title" className="text-base sm:text-lg font-black tracking-tight leading-snug">
                Solicitud de Revisión de Calificación
              </h3>
              <p className="text-xs text-purple-100 opacity-90">
                Manifiesta tu desacuerdo formal ante el docente
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-all cursor-pointer"
            aria-label="Cerrar ventana"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Resumen de la nota y materia */}
        <div className="p-5 bg-purple-50/60 border-b border-purple-100 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-900">
                <BookOpen className="w-3.5 h-3.5" />
                {task.subjectName || 'Materia'}
              </span>
              <h4 className="text-sm font-black text-slate-900 leading-snug truncate">
                {task.title}
              </h4>
              <p className="text-xs text-slate-600 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Docente: <strong>{task.teacherName && task.teacherName !== 'Docente' ? task.teacherName : 'No asignado'}</strong></span>
              </p>
            </div>

            <div className="text-right shrink-0 bg-white px-3.5 py-2 rounded-2xl border border-purple-200/80 shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Nota Actual</span>
              <div className="flex items-baseline gap-1 justify-end">
                <span className={`text-2xl font-black ${Number(currentScore) < 3 ? 'text-rose-700' : 'text-emerald-700'}`}>
                  {currentScore}
                </span>
                <span className="text-xs font-semibold text-slate-400">/ 5.0</span>
              </div>
            </div>
          </div>

          {studentGrade.teacherNote && (
            <div className="p-2.5 bg-white rounded-xl border border-purple-100 text-xs text-slate-700">
              <span className="font-bold text-purple-900 block mb-0.5">Observación registrada por el docente:</span>
              <p className="italic text-slate-600">"{studentGrade.teacherNote}"</p>
            </div>
          )}
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label htmlFor="appeal-reason" className="block text-xs font-bold text-slate-800 mb-1.5">
              Motivo del desacuerdo <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="appeal-reason"
              rows="4"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="Explica detalladamente por qué consideras que la calificación debe ser revisada (ej. pautas acordadas, desarrollo de la actividad, etc.)..."
              className="w-full p-3 text-xs rounded-2xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all resize-none shadow-2xs"
              required
            />
            {errorMsg && (
              <p className="mt-1.5 text-xs font-semibold text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {errorMsg}
              </p>
            )}

          </div>

          {/* Botones de acción */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Enviando...' : 'Enviar solicitud de revisión'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
