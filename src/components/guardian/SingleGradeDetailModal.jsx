import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, BookOpen, Award, CheckCircle2, MessageSquare, AlertCircle, Calendar, User, FileCheck, Layers } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import GradeAppealBadge from '../common/GradeAppealBadge';
import { APPEAL_STATUS } from '../../utils/appealsStorage';
import { useScrollLock } from '../../utils/useScrollLock';

export default function SingleGradeDetailModal({
  isOpen,
  onClose,
  task,
  student,
  onDisputeGrade,
  onConfirmSignature,
  onViewAllGrades
}) {
  useScrollLock(isOpen);

  const { gradingSettings, appeals } = useApp();
  const passingScore = Number(gradingSettings?.passingValue ?? (gradingSettings?.format === 'zero_hundred' ? 60 : 3.0));
  const maxScoreLabel = gradingSettings?.format === 'zero_hundred' ? '100' : '5.0';

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !task) return null;

  const studentGrade = task.studentGrade || (student?.id && task.studentGrades?.[student.id]) || null;
  const score = studentGrade?.score;
  const hasValidScore = score !== null && score !== undefined;
  const isRead = Boolean(studentGrade?.isRead);
  const teacherNote = studentGrade?.teacherNote;

  const existingAppeal = studentGrade?.appeal || appeals?.find(
    a => (a.taskId === task.id || a.assignment_id === task.id) &&
         (a.studentId === student?.id || a.student_id === student?.id)
  );
  const hasExistingAppeal = Boolean(existingAppeal);

  // Formato estricto requerido: Docente: [Nombre Completo] | Docente: No asignado
  const teacherDisplayName = task.teacherName && task.teacherName !== 'Docente'
    ? task.teacherName
    : 'No asignado';

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="single-grade-title"
      >
        {/* Cabecera del modal */}
        <div className="p-5 bg-linear-to-r from-purple-700 via-indigo-700 to-purple-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shadow-xs">
              <Award className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 id="single-grade-title" className="text-base sm:text-lg font-black tracking-tight leading-snug">
                Detalle de Calificación
              </h3>
              <p className="text-xs text-purple-100 opacity-90">
                {student?.name || 'Estudiante'} {student?.gradeName ? `· Grado ${student.gradeName}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-all cursor-pointer"
            aria-label="Cerrar detalle"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido scrolleable independiente */}
        <div className="modal-scrollable-content p-5 space-y-4 flex-1">
          {/* Tarjeta principal de la calificación */}
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                  <BookOpen className="w-3 h-3" />
                  {task.subjectName}
                </span>
                <h4 className="text-base font-black text-slate-900 mt-2 break-words">
                  {task.title}
                </h4>
              </div>

              {hasValidScore && (
                <div className="text-right shrink-0">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Puntaje</span>
                  <strong
                    className={`text-2xl sm:text-3xl font-black px-2.5 py-1 rounded-xl inline-block ${
                      score < passingScore
                        ? 'text-rose-700 bg-rose-50 border border-rose-200'
                        : 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                    }`}
                  >
                    {gradingSettings?.format === 'zero_hundred' ? Math.round(score) : score.toFixed(1)}
                  </strong>
                  <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">
                    sobre {maxScoreLabel}
                  </span>
                </div>
              )}
            </div>

            {/* Metadatos (Docente y Fecha) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60">
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200/80 text-slate-700">
                <User className="w-4 h-4 text-purple-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Docente asignado</p>
                  <p className="font-bold text-slate-800 truncate">Docente: {teacherDisplayName}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200/80 text-slate-700">
                <Calendar className="w-4 h-4 text-purple-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Fecha de entrega</p>
                  <p className="font-bold text-slate-800 truncate">{task.dueDate || task.assignedDate || 'Sin fecha'}</p>
                </div>
              </div>
            </div>

            {/* Estado de apelación / revisión */}
            {hasExistingAppeal && (
              <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-600 font-medium">Estado de revisión:</span>
                <GradeAppealBadge status={existingAppeal.status || APPEAL_STATUS.EN_REVISION} />
              </div>
            )}
          </div>

          {/* Retroalimentación / Observación del docente */}
          <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-100 space-y-1.5">
            <h5 className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-purple-700" />
              Observación del docente:
            </h5>
            <p className="text-xs text-slate-700 leading-relaxed italic whitespace-pre-wrap">
              {teacherNote && teacherNote.trim()
                ? teacherNote
                : 'El docente no añadió observaciones escritas para esta calificación.'}
            </p>
          </div>

          {/* Estado de confirmación de lectura */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isRead ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="text-xs font-semibold text-slate-700">
                {isRead ? 'Lectura confirmada por el acudiente' : 'Pendiente de confirmación de lectura'}
              </span>
            </div>
            {isRead && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Confirmada
              </span>
            )}
          </div>
        </div>

        {/* Acciones contextuales */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div>
            {onViewAllGrades && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onViewAllGrades();
                }}
                className="text-xs font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1.5 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Ver historial completo</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!hasExistingAppeal && onDisputeGrade && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDisputeGrade(task);
                }}
                className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>No estoy de acuerdo</span>
              </button>
            )}

            {!isRead && onConfirmSignature && (
              <button
                type="button"
                onClick={() => {
                  onConfirmSignature(task.id);
                  onClose();
                }}
                className="py-2 px-4 rounded-xl bg-linear-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs shadow-md hover:from-purple-700 hover:to-indigo-700 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <FileCheck className="w-4 h-4" />
                <span>Confirmar lectura</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="py-2 px-3.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
