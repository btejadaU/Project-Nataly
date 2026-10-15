import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle2, XCircle, BookOpen, User, MessageSquare, Award, Clock } from 'lucide-react';
import GradeAppealBadge from '../common/GradeAppealBadge';
import { APPEAL_STATUS } from '../../utils/appealsStorage';
import { useScrollLock } from '../../utils/useScrollLock';

export default function GuardianAppealResolutionModal({
  isOpen,
  onClose,
  appeal,
  task
}) {
  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !appeal) return null;

  const isAccepted = appeal.estado === APPEAL_STATUS.REVISION_ACEPTADA || appeal.status === APPEAL_STATUS.REVISION_ACEPTADA;

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
        aria-labelledby="appeal-resolution-title"
      >
        {/* Cabecera */}
        <div className={`p-5 text-white flex items-center justify-between ${
          isAccepted
            ? 'bg-linear-to-r from-emerald-600 to-teal-700'
            : 'bg-linear-to-r from-slate-700 to-rose-800'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shadow-xs">
              {isAccepted ? (
                <CheckCircle2 className="w-5 h-5 text-white" />
              ) : (
                <XCircle className="w-5 h-5 text-white" />
              )}
            </div>
            <div>
              <h3 id="appeal-resolution-title" className="text-base sm:text-lg font-black tracking-tight leading-snug">
                Resolución de Solicitud de Revisión
              </h3>
              <p className="text-xs text-white/90">
                Respuesta oficial del docente titular
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-all cursor-pointer"
            aria-label="Cerrar resolución"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Resumen */}
        <div className="p-5 bg-slate-50/70 border-b border-slate-100 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Estado de la solicitud
            </span>
            <GradeAppealBadge status={appeal.estado || appeal.status} />
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
            <h4 className="text-sm font-black text-slate-900 leading-snug">
              {task?.title || 'Actividad evaluada'}
            </h4>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
              <span className="flex items-center gap-1 font-semibold text-purple-700">
                <BookOpen className="w-3.5 h-3.5" />
                {task?.subjectName || 'Materia'}
              </span>
              <span className="flex items-center gap-1 text-slate-500">
                <User className="w-3.5 h-3.5" />
                Docente: {task?.teacherName && task.teacherName !== 'Docente' ? task.teacherName : 'No asignado'}
              </span>
            </div>
          </div>
        </div>

        {/* Contenido: Motivo y Respuesta */}
        <div className="modal-scrollable-content p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Motivo enviado por el acudiente */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase block">
              Tu solicitud enviada:
            </span>
            <div className="p-3 bg-purple-50/50 rounded-2xl border border-purple-100 text-xs text-slate-700">
              <p className="italic">"{appeal.motivo_acudiente || appeal.reason}"</p>
            </div>
          </div>

          {/* Respuesta del docente */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
              Respuesta y decisión del docente:
            </span>
            <div className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${
              isAccepted
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950 font-medium'
                : 'bg-rose-50/70 border-rose-200 text-rose-950 font-medium'
            }`}>
              <p className="whitespace-pre-wrap">
                {appeal.respuesta_docente ||
                  appeal.teacher_response ||
                  (isAccepted
                    ? 'La solicitud de revisión ha sido aceptada. La calificación se revisará en la próxima clase.'
                    : 'Tras la revisión de la solicitud, la calificación se mantiene ya que refleja fielmente los criterios y el desempeño demostrado en la actividad.')}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 transition-colors shadow-sm cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
