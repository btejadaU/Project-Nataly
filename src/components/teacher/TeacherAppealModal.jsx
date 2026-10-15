import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  CheckCircle2,
  XCircle,
  AlertCircle,
  BookOpen,
  User,
  MessageSquare,
  Award,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import GradeAppealBadge from '../common/GradeAppealBadge';
import { APPEAL_STATUS } from '../../utils/appealsStorage';

const DEFAULT_REJECT_MESSAGE =
  'Tras la revisión de la solicitud, la calificación se mantiene ya que refleja fielmente los criterios y el desempeño demostrado en la actividad.';

export default function TeacherAppealModal({
  isOpen,
  onClose,
  appeal,
  student,
  task,
  onResolve
}) {
  const [showRejectPanel, setShowRejectPanel] = useState(false);
  const [rejectObservation, setRejectObservation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setShowRejectPanel(false);
      setRejectObservation('');
      setIsSubmitting(false);
      setFeedbackError('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !appeal) return null;

  const currentStatus = appeal.estado || appeal.status || APPEAL_STATUS.EN_REVISION;
  const isPending = currentStatus === APPEAL_STATUS.EN_REVISION;

  const studentName = student?.name || appeal.studentName || 'Estudiante';
  const guardianName = student?.guardianName || appeal.guardianName || 'Acudiente';
  const taskTitle = task?.title || appeal.taskTitle || 'Actividad';
  const subjectName = task?.subjectName || appeal.subjectName || 'Materia';
  const gradeName = student?.gradeName || task?.gradeName || appeal.gradeName || 'Curso';

  const scoreValue = task?.studentGrades?.[student?.id]?.score ?? appeal.score ?? '—';

  const handleAccept = async () => {
    setIsSubmitting(true);
    setFeedbackError('');
    try {
      await onResolve({
        appealId: appeal.id,
        taskId: appeal.taskId || task?.id,
        studentId: appeal.studentId || student?.id,
        decision: 'ACCEPT',
        respuestaDocente: 'La solicitud de revisión ha sido aceptada. La calificación se revisará en la próxima clase.'
      });
      onClose();
    } catch (err) {
      setFeedbackError(err.message || 'No se pudo aceptar la revisión.');
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    setIsSubmitting(true);
    setFeedbackError('');
    const finalComment = rejectObservation.trim() ? rejectObservation.trim() : DEFAULT_REJECT_MESSAGE;
    try {
      await onResolve({
        appealId: appeal.id,
        taskId: appeal.taskId || task?.id,
        studentId: appeal.studentId || student?.id,
        decision: 'REJECT',
        respuestaDocente: finalComment
      });
      onClose();
    } catch (err) {
      setFeedbackError(err.message || 'No se pudo rechazar la solicitud.');
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
        className="bg-white rounded-3xl max-w-xl w-full flex flex-col shadow-2xl border border-purple-100 overflow-hidden animate-in zoom-in-95 duration-150 select-text touch-auto max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="teacher-appeal-modal-title"
      >
        {/* Cabecera */}
        <div className="p-5 bg-linear-to-r from-purple-700 via-indigo-700 to-purple-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shadow-xs">
              <AlertCircle className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 id="teacher-appeal-modal-title" className="text-base sm:text-lg font-black tracking-tight leading-snug">
                Gestión de Solicitud de Revisión
              </h3>
              <p className="text-xs text-purple-100 opacity-90">
                Atención y resolución de apelación de calificación
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-all cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Datos del estudiante, materia y nota actual */}
        <div className="p-5 bg-purple-50/50 border-b border-purple-100 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Estado de la Apelación
            </span>
            <GradeAppealBadge status={currentStatus} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 bg-white p-3.5 rounded-2xl border border-purple-100 shadow-2xs space-y-1">
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-purple-600" />
                <h4 className="text-sm font-black text-slate-900 truncate">{studentName}</h4>
              </div>
              <p className="text-xs text-slate-500">
                Curso: <strong>{gradeName}</strong> · Acudiente: <strong>{guardianName}</strong>
              </p>
              <div className="pt-1.5 flex items-center gap-2 text-xs text-purple-800 font-semibold">
                <BookOpen className="w-3.5 h-3.5" />
                <span className="truncate">{subjectName} · {taskTitle}</span>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-purple-100 shadow-2xs flex flex-col justify-center items-center text-center">
              <span className="text-[10px] font-bold uppercase text-slate-400">Nota Actual</span>
              <span className={`text-2xl font-black ${Number(scoreValue) < 3 ? 'text-rose-700' : 'text-emerald-700'}`}>
                {scoreValue !== '—' ? Number(scoreValue).toFixed(1) : '—'}
              </span>
              <span className="text-[10px] text-slate-400">sobre 5.0</span>
            </div>
          </div>
        </div>

        {/* Motivo escrito por el acudiente */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
              Motivo manifestado por el acudiente:
            </span>
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 font-medium leading-relaxed">
              <p className="whitespace-pre-wrap">
                "{appeal.motivo_acudiente || appeal.reason || 'Sin motivo detallado'}"
              </p>
            </div>
            <p className="text-[10px] text-slate-400">
              Fecha de la solicitud: {appeal.created_at ? new Date(appeal.created_at).toLocaleString() : 'Reciente'}
            </p>
          </div>

          {/* Si ya fue resuelta, mostrar la resolución previa */}
          {!isPending && (
            <div className="p-4 rounded-2xl border bg-slate-50/80 border-slate-200 space-y-1.5">
              <span className="text-xs font-bold text-slate-800 block">
                Resolución registrada:
              </span>
              <p className="text-xs text-slate-700 italic">
                "{appeal.respuesta_docente || appeal.teacher_response || 'Sin comentarios registrados.'}"
              </p>
            </div>
          )}

          {/* Panel para observaciones al rechazar */}
          {isPending && showRejectPanel && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <label htmlFor="reject-comment" className="text-xs font-bold text-slate-800">
                  Observaciones de retroalimentación (Opcional):
                </label>
                <button
                  type="button"
                  onClick={() => setShowRejectPanel(false)}
                  className="text-[11px] text-slate-500 hover:text-slate-800"
                >
                  Ocultar
                </button>
              </div>

              <textarea
                id="reject-comment"
                rows="3"
                value={rejectObservation}
                onChange={(e) => setRejectObservation(e.target.value)}
                placeholder={DEFAULT_REJECT_MESSAGE}
                className="w-full p-2.5 text-xs rounded-xl bg-white border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none shadow-2xs placeholder:text-slate-400 placeholder:italic"
              />

              <p className="text-[10px] text-slate-500">
                Si dejas el campo vacío, se enviará el mensaje formal predeterminado:
                <em className="block mt-0.5 text-slate-600">"{DEFAULT_REJECT_MESSAGE}"</em>
              </p>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={isSubmitting}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 transition-colors shadow-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Procesando...' : 'Confirmar no aceptación'}</span>
                </button>
              </div>
            </div>
          )}

          {feedbackError && (
            <p className="text-xs font-bold text-rose-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {feedbackError}
            </p>
          )}
        </div>

        {/* Footer con acciones */}
        <div className="p-4 bg-slate-50/90 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cerrar
          </button>

          {isPending && (
            <div className="flex items-center gap-2">
              {!showRejectPanel && (
                <button
                  type="button"
                  onClick={() => setShowRejectPanel(true)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  <span>No aceptar / Rechazar</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleAccept}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Procesando...' : 'Aceptar revisión'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
