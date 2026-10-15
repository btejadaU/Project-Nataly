import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, BookOpen, Award, CheckCircle2, MessageSquare, AlertCircle, ChevronDown, ChevronUp, Search, Calendar, User } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import GradeAppealBadge from '../common/GradeAppealBadge';
import { APPEAL_STATUS } from '../../utils/appealsStorage';
import { useScrollLock } from '../../utils/useScrollLock';

export default function AllGradesModal({
  isOpen,
  onClose,
  studentName = 'Estudiante',
  gradeName = '',
  averageScore = '—',
  subjectSummaries = [],
  studentTasks = [],
  onDisputeGrade
}) {
  useScrollLock(isOpen);

  const { gradingSettings, appeals, activeStudentId } = useApp();
  const passingScore = Number(gradingSettings?.passingValue ?? (gradingSettings?.format === 'zero_hundred' ? 60 : 3.0));
  const maxScoreLabel = gradingSettings?.format === 'zero_hundred' ? '100' : '5.0';

  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSubjectId, setExpandedSubjectId] = useState(null);

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

  // Agrupar actividades calificadas por materia
  const subjectsWithGrades = useMemo(() => {
    return subjectSummaries.map(subject => {
      const tasks = studentTasks.filter(
        task => task.subjectId === subject.id && task.studentGrade?.score !== null && task.studentGrade?.score !== undefined
      );
      return {
        ...subject,
        gradedTasks: tasks
      };
    });
  }, [subjectSummaries, studentTasks]);

  // Filtrado por buscador
  const filteredSubjects = useMemo(() => {
    if (!searchTerm.trim()) return subjectsWithGrades;
    const query = searchTerm.toLowerCase();
    return subjectsWithGrades.filter(subject =>
      (subject.name || '').toLowerCase().includes(query) ||
      (subject.shortName || '').toLowerCase().includes(query) ||
      subject.gradedTasks.some(t => (t.title || '').toLowerCase().includes(query))
    );
  }, [subjectsWithGrades, searchTerm]);

  // Contadores generales
  const totalGradedActivities = useMemo(() => {
    return subjectsWithGrades.reduce((acc, curr) => acc + curr.gradedTasks.length, 0);
  }, [subjectsWithGrades]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="all-grades-modal-title"
      >
        {/* Cabecera del modal */}
        <div className="p-5 bg-linear-to-r from-purple-700 via-indigo-700 to-purple-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shadow-xs">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 id="all-grades-modal-title" className="text-base sm:text-lg font-black tracking-tight leading-snug">
                Historial Completo de Calificaciones
              </h3>
              <p className="text-xs text-purple-100 opacity-90">
                {studentName} {gradeName ? `· Grado ${gradeName}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-all cursor-pointer"
            aria-label="Cerrar historial"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Resumen superior rápido */}
        <div className="grid grid-cols-3 gap-2 px-4 py-3 bg-purple-50/50 border-b border-purple-100 text-center">
          <div className="bg-white rounded-xl p-2 border border-purple-100 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Promedio General</span>
            <span className={`text-base sm:text-xl font-black ${averageScore !== '—' && Number(averageScore) < passingScore ? 'text-rose-700' : 'text-emerald-700'}`}>
              {averageScore} <span className="text-xs font-semibold text-slate-500">/ {maxScoreLabel}</span>
            </span>
          </div>
          <div className="bg-white rounded-xl p-2 border border-purple-100 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Materias</span>
            <span className="text-base sm:text-xl font-black text-purple-700">{subjectSummaries.length}</span>
          </div>
          <div className="bg-white rounded-xl p-2 border border-purple-100 shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Actividades Evaluadas</span>
            <span className="text-base sm:text-xl font-black text-indigo-700">{totalGradedActivities}</span>
          </div>
        </div>

        {/* Buscador de materia o actividad */}
        <div className="px-5 py-3 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar materia o actividad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white transition-all text-slate-800"
            />
          </div>
        </div>

        {/* Lista de materias y sus actividades calificadas */}
        <div className="modal-scrollable-content p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {filteredSubjects.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              No se encontraron materias que coincidan con la búsqueda.
            </div>
          ) : (
            filteredSubjects.map(subject => {
              const hasGrades = subject.gradedTasks.length > 0;
              const isExpanded = expandedSubjectId === subject.id || searchTerm.trim().length > 0;

              return (
                <div
                  key={subject.id}
                  className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden transition-all"
                >
                  {/* Encabezado de la materia */}
                  <div
                    className="flex items-center justify-between p-3.5 sm:p-4 bg-slate-50/70 border-b border-slate-100 cursor-pointer hover:bg-slate-100/70 transition-colors"
                    onClick={() => setExpandedSubjectId(expandedSubjectId === subject.id ? null : subject.id)}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0" />
                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {subject.name || subject.shortName}
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          {hasGrades ? `${subject.gradedTasks.length} actividades evaluadas` : 'Sin calificaciones'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Promedio</span>
                        <strong
                          className={`text-base sm:text-lg font-black ${subject.average !== null && subject.average < passingScore
                              ? 'text-rose-700'
                              : subject.average !== null
                                ? 'text-emerald-700'
                                : 'text-slate-400'
                            }`}
                        >
                          {subject.average !== null ? (gradingSettings?.format === 'zero_hundred' ? Math.round(subject.average) : subject.average.toFixed(1)) : '—'}
                        </strong>
                      </div>
                      <button
                        type="button"
                        className="p-1 rounded-lg text-slate-400 hover:text-purple-600"
                        aria-label="Alternar desglose"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Detalle de actividades de la materia */}
                  {isExpanded && (
                    <div className="p-3 sm:p-4 space-y-2.5 bg-white">
                      {hasGrades ? (
                        subject.gradedTasks.map(task => {
                          const { score, isRead, teacherNote } = task.studentGrade;

                          return (
                            <div
                              key={task.id}
                              className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors space-y-2"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <h5 className="text-xs sm:text-sm font-bold text-slate-800 leading-snug">
                                      {task.title}
                                    </h5>
                                    <GradeAppealBadge status={task.studentGrade?.appealStatus || APPEAL_STATUS.CALIFICADA} />
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 mt-1">
                                    <span className="inline-flex items-center gap-1">
                                      <User className="w-3 h-3 text-slate-400" />
                                      Docente: {task.teacherName && task.teacherName !== 'Docente' ? task.teacherName : 'No asignado'}
                                    </span>
                                    {(task.dueDate || task.assignedDate) && (
                                      <span className="inline-flex items-center gap-1">
                                        <Calendar className="w-3 h-3 text-slate-400" />
                                        Fecha: {task.dueDate || task.assignedDate}
                                      </span>
                                    )}
                                    {isRead && (
                                      <span className="inline-flex items-center gap-0.5 font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Confirmada
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <strong
                                  className={`text-lg sm:text-xl font-black px-2 py-0.5 rounded-lg shrink-0 ${score < passingScore
                                      ? 'text-rose-700 bg-rose-50 border border-rose-200'
                                      : 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                                    }`}
                                >
                                  {gradingSettings?.format === 'zero_hundred' ? Math.round(score) : score.toFixed(1)}
                                </strong>
                              </div>

                              {/* Comentario / retroalimentación del docente */}
                              {teacherNote && (
                                <div className="mt-2 p-2 rounded-lg bg-purple-50/80 border border-purple-100 text-[11px] text-slate-700">
                                  <p className="font-bold text-purple-900 flex items-center gap-1 mb-0.5">
                                    <MessageSquare className="w-3 h-3 text-purple-700" />
                                    Observación del docente:
                                  </p>
                                  <p className="italic whitespace-pre-wrap">{teacherNote}</p>
                                </div>
                              )}

                              {/* Opción de disputa / reclamo formal si se provee callback */}
                              {onDisputeGrade && (() => {
                                const existingAppeal = task.studentGrade?.appeal || appeals?.find(
                                  a => (a.taskId === task.id || a.assignment_id === task.id) &&
                                       (a.studentId === activeStudentId || a.student_id === activeStudentId)
                                );
                                const hasExistingAppeal = Boolean(existingAppeal);

                                return (
                                  <div className="flex justify-end pt-1">
                                    {hasExistingAppeal ? (
                                      <span
                                        className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 cursor-not-allowed select-none"
                                        title={
                                          existingAppeal.status === APPEAL_STATUS.CALIFICADA
                                            ? "Esta calificación ya fue revisada y actualizada por el docente. No admite nuevas solicitudes."
                                            : "Esta calificación ya cuenta con una solicitud de revisión registrada."
                                        }
                                      >
                                        {existingAppeal.status === APPEAL_STATUS.CALIFICADA ? (
                                          <>
                                            <CheckCircle2 className="w-3 h-3 text-purple-600" />
                                            <span className="text-purple-700">Revisión ya atendida</span>
                                          </>
                                        ) : (
                                          <>
                                            <AlertCircle className="w-3 h-3 text-amber-500" />
                                            <span className="text-amber-700">Revisión en trámite</span>
                                          </>
                                        )}
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => onDisputeGrade(task)}
                                        className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 hover:text-rose-900 hover:underline cursor-pointer"
                                      >
                                        <AlertCircle className="w-3 h-3 text-rose-600" />
                                        No estoy de acuerdo con la nota
                                      </button>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-slate-400 italic py-2 text-center">
                          Aún no se han registrado calificaciones para esta materia.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer del modal */}
        <div className="flex justify-end p-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
