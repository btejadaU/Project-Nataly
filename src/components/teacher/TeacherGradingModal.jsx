import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  CheckCircle2,
  Clock,
  MessageSquare,
  Send,
  FileCheck,
  AlertCircle,
  LoaderCircle,
  Users,
  Lock
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useApp } from '../../context/AppContext';
import GradeAppealBadge from '../common/GradeAppealBadge';
import { APPEAL_STATUS } from '../../utils/appealsStorage';
import { getCachedProfiles, KNOWN_GUARDIANS_FALLBACK } from '../../utils/profilesCache';

const LETTER_SCORE_MAP = {
  A: 5.0,
  B: 4.0,
  C: 3.0,
  D: 2.0,
  F: 1.0
};

import { formatOneFiveGrade } from '../../utils/gradeMask';
export { formatOneFiveGrade };

export default function TeacherGradingModal({
  isOpen,
  onClose,
  task,
  courseStudents = [],
  onSaveBatch,
  onUpdateStudentGrade,
  onNotifyGuardian
}) {
  const { gradingSettings, appeals, resolveGradeAppeal } = useApp();
  const format = gradingSettings?.format || 'one_five';
  const isLetterScale = format === 'a_f';
  const isZeroHundred = format === 'zero_hundred';

  const minNumeric = Number(gradingSettings?.min ?? 0);
  const maxNumeric = isZeroHundred ? 100 : 5.0;
  const stepNumeric = isZeroHundred ? 1 : 0.1;
  const passingValue = Number(gradingSettings?.passingValue ?? (isZeroHundred ? 60 : 3.0));

  const [draftGrades, setDraftGrades] = useState({});
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [isResending, setIsResending] = useState({});
  const [reSubmittedStudents, setReSubmittedStudents] = useState({});
  const [notificationSuccess, setNotificationSuccess] = useState({});
  const cachedProfiles = useMemo(() => getCachedProfiles(), [isOpen]);

  // Inicializar estado borrador cuando se abre la tarea
  useEffect(() => {
    if (isOpen && task) {
      const initial = {};
      courseStudents.forEach((student) => {
        const grade = task.studentGrades?.[student.id];
        let initialScore = '';

        if (grade?.letterGrade) {
          initialScore = grade.letterGrade;
        } else if (grade?.score !== null && grade?.score !== undefined) {
          if (isLetterScale) {
            const num = parseFloat(grade.score);
            if (!isNaN(num)) {
              if (num >= 4.5) initialScore = 'A';
              else if (num >= 3.5) initialScore = 'B';
              else if (num >= 3.0) initialScore = 'C';
              else if (num >= 2.0) initialScore = 'D';
              else initialScore = 'F';
            } else {
              initialScore = String(grade.score).toUpperCase();
            }
          } else if (isZeroHundred) {
            initialScore = String(Math.round(grade.score));
          } else {
            initialScore = Number(grade.score).toFixed(1);
          }
        }

        initial[student.id] = {
          score: initialScore,
          teacherNote: grade?.teacherNote || '',
          isNotified: grade?.isNotified || false,
          notifiedAt: grade?.notifiedAt || null,
          isRead: grade?.isRead || false
        };
      });

      setDraftGrades(initial);
      setIsResending({});
      setReSubmittedStudents({});
      setNotificationSuccess({});
    }
  }, [isOpen, task?.id, courseStudents, isLetterScale, isZeroHundred]);

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

  // Evaluar validez y aprobación de una calificación de manera reactiva
  const evaluateGrade = (scoreVal) => {
    if (scoreVal === '' || scoreVal === null || scoreVal === undefined) {
      return { isGraded: false, isValid: false, isApproved: false, displayVal: '' };
    }

    if (isLetterScale) {
      const letter = String(scoreVal).trim().toUpperCase();
      const validLetters = ['A', 'B', 'C', 'D', 'F'];
      if (validLetters.includes(letter)) {
        const isApproved = ['A', 'B', 'C'].includes(letter);
        return { isGraded: true, isValid: true, isApproved, displayVal: letter };
      }
      const num = parseFloat(scoreVal);
      if (!isNaN(num)) {
        let mapped = 'F';
        if (num >= 4.5) mapped = 'A';
        else if (num >= 3.5) mapped = 'B';
        else if (num >= 3.0) mapped = 'C';
        else if (num >= 2.0) mapped = 'D';
        const isApproved = ['A', 'B', 'C'].includes(mapped);
        return { isGraded: true, isValid: true, isApproved, displayVal: mapped };
      }
      return { isGraded: true, isValid: false, isApproved: false, displayVal: String(scoreVal) };
    }

    const num = parseFloat(scoreVal);
    if (isNaN(num)) {
      return { isGraded: true, isValid: false, isApproved: false, displayVal: String(scoreVal) };
    }

    const inRange = num >= minNumeric && num <= maxNumeric;
    const isApproved = inRange && num >= passingValue;

    return {
      isGraded: true,
      isValid: inRange,
      isApproved,
      displayVal: isZeroHundred ? String(Math.round(num)) : num.toFixed(1)
    };
  };

  // Determinar si la tarea ya ha sido emitida/guardada en lote
  const isTaskBatchSaved = useMemo(() => {
    if (!task) return false;
    if (task.status === 'Calificada y Notificada' || task.status === 'notified') {
      return true;
    }
    if (courseStudents.length > 0 && courseStudents.every((s) => task.studentGrades?.[s.id]?.isNotified)) {
      return true;
    }
    return false;
  }, [task, courseStudents]);

  // Validar si todos los alumnos tienen calificación válida
  const allStudentsGradedAndValid = useMemo(() => {
    if (courseStudents.length === 0) return false;
    return courseStudents.every((student) => {
      const draft = draftGrades[student.id];
      const evalRes = evaluateGrade(draft?.score);
      return evalRes.isGraded && evalRes.isValid;
    });
  }, [courseStudents, draftGrades, format, passingValue]);

  // Contador de alumnos con notas válidas
  const validGradedCount = useMemo(() => {
    return courseStudents.filter((student) => {
      const draft = draftGrades[student.id];
      const evalRes = evaluateGrade(draft?.score);
      return evalRes.isGraded && evalRes.isValid;
    }).length;
  }, [courseStudents, draftGrades, format, passingValue]);

  if (!isOpen || !task) return null;

  const handleScoreChange = (studentId, rawValue) => {
    setDraftGrades((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        score: rawValue
      }
    }));
  };

  const handleNumericScoreChange = (studentId, rawValue) => {
    if (rawValue === '') {
      handleScoreChange(studentId, '');
      return;
    }

    if (isZeroHundred) {
      const cleaned = rawValue.replace(/[^\d]/g, '');
      if (cleaned === '') {
        handleScoreChange(studentId, '');
        return;
      }
      const num = parseInt(cleaned, 10);
      if (num > 100) {
        handleScoreChange(studentId, '100');
      } else if (num < 0) {
        handleScoreChange(studentId, '0');
      } else {
        handleScoreChange(studentId, String(num));
      }
      return;
    }

    // Escala 0.0 a 5.0 con máscara inteligente, normalización de comas e inserción automática de punto
    const res = formatOneFiveGrade(rawValue);
    if (!res.valid) {
      // Valor fuera de rango rechazado estrictamente
      return;
    }
    handleScoreChange(studentId, res.value);
  };

  const handleNumericScoreBlur = (studentId, rawValue) => {
    if (rawValue === '' || rawValue === null || rawValue === undefined) return;
    if (isZeroHundred) {
      const num = parseFloat(rawValue);
      if (isNaN(num)) {
        handleScoreChange(studentId, '');
        return;
      }
      const clamped = Math.min(100, Math.max(0, Math.round(num)));
      handleScoreChange(studentId, String(clamped));
      return;
    }

    // Escala 0.0 a 5.0
    const normalized = String(rawValue).replace(',', '.');
    const num = parseFloat(normalized);
    if (isNaN(num) || num < 0 || num > 5.0) {
      handleScoreChange(studentId, '');
      return;
    }
    handleScoreChange(studentId, num.toFixed(1));
  };

  const handleTeacherNoteChange = (studentId, note) => {
    setDraftGrades((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || {}),
        teacherNote: note
      }
    }));
  };

  // Guardado atómico y global en lote
  const handleSaveAndCloseBatch = async () => {
    if (!task || !allStudentsGradedAndValid) return;
    setIsSavingBatch(true);
    try {
      const recordsToSave = {};
      courseStudents.forEach((student) => {
        const draft = draftGrades[student.id] || {};
        if (isLetterScale) {
          const letter = String(draft.score || '').trim().toUpperCase();
          recordsToSave[student.id] = {
            ...draft,
            score: LETTER_SCORE_MAP[letter] ?? (parseFloat(draft.score) || null),
            letterGrade: letter
          };
        } else {
          recordsToSave[student.id] = {
            ...draft,
            score: draft.score !== '' && draft.score !== null ? parseFloat(draft.score) : null,
            letterGrade: null
          };
        }
      });

      await onSaveBatch(task.id, recordsToSave);
      onClose();
      Swal.fire({
        title: '¡Calificaciones guardadas!',
        text: 'Todas las calificaciones y observaciones se han registrado en lote y notificado correctamente.',
        icon: 'success',
        timer: 2400,
        showConfirmButton: false,
        customClass: {
          popup: 'dark-swal',
          title: 'dark-swal-title',
          htmlContainer: 'dark-swal-content'
        },
        buttonsStyling: false
      });
    } catch (err) {
      Swal.fire({
        title: 'Error al guardar',
        text: err?.message || 'No se pudieron guardar las calificaciones en lote.',
        icon: 'error',
        customClass: {
          popup: 'dark-swal',
          title: 'dark-swal-title',
          htmlContainer: 'dark-swal-content'
        },
        buttonsStyling: false
      });
    } finally {
      setIsSavingBatch(false);
    }
  };

  // Reenvío de calificación individual exclusivamente para apelación aceptada
  const handleResendAppealGrade = async (studentId) => {
    const draft = draftGrades[studentId];
    if (!draft) return;

    const evalRes = evaluateGrade(draft.score);
    if (!evalRes.isValid) return;

    setIsResending((prev) => ({ ...prev, [studentId]: true }));
    try {
      const scoreToSave = isLetterScale
        ? (LETTER_SCORE_MAP[draft.score] ?? (parseFloat(draft.score) || null))
        : (draft.score !== '' && draft.score !== null ? parseFloat(draft.score) : null);

      if (onUpdateStudentGrade) {
        await onUpdateStudentGrade(task.id, studentId, {
          score: scoreToSave,
          letterGrade: isLetterScale ? draft.score : null,
          teacherNote: draft.teacherNote || '',
          appealStatus: APPEAL_STATUS.CALIFICADA
        });
      }

      if (onNotifyGuardian) {
        await onNotifyGuardian(task.id, studentId);
      }

      // Marcar apelación como resuelta a CALIFICADA
      const studentAppeal = appeals?.find(
        (a) =>
          (a.taskId === task.id || a.assignment_id === task.id) &&
          (a.studentId === studentId || a.student_id === studentId)
      );
      if (resolveGradeAppeal && (studentAppeal || task.studentGrades?.[studentId]?.appeal)) {
        await resolveGradeAppeal({
          appealId: studentAppeal?.id || task.studentGrades?.[studentId]?.appeal?.id,
          taskId: task.id,
          studentId,
          decision: 'CALIFICADA',
          respuestaDocente: 'Calificación actualizada y reenviada tras revisión en clase.'
        });
      }

      // Re-bloquear inmediatamente en el estado local
      setReSubmittedStudents((prev) => ({ ...prev, [studentId]: true }));
      setNotificationSuccess((prev) => ({ ...prev, [studentId]: true }));

      Swal.fire({
        title: '¡Calificación reenviada!',
        text: 'La calificación fue actualizada y se despachó la notificación al acudiente. La edición ha sido bloqueada nuevamente.',
        icon: 'success',
        timer: 2400,
        showConfirmButton: false,
        customClass: {
          popup: 'dark-swal',
          title: 'dark-swal-title',
          htmlContainer: 'dark-swal-content'
        },
        buttonsStyling: false
      });
    } catch (err) {
      Swal.fire({
        title: 'Error al reenviar',
        text: err?.message || 'No se pudo actualizar y notificar la calificación.',
        icon: 'error',
        customClass: {
          popup: 'dark-swal',
          title: 'dark-swal-title',
          htmlContainer: 'dark-swal-content'
        },
        buttonsStyling: false
      });
    } finally {
      setIsResending((prev) => ({ ...prev, [studentId]: false }));
    }
  };

  // Textos adaptativos de la leyenda superior
  let scaleLabel = '0.0 a 5.0';
  let passingLegend = `≥ ${passingValue.toFixed(1)} Aprobado`;
  let failingLegend = `< ${passingValue.toFixed(1)} Reprobado`;

  if (isZeroHundred) {
    scaleLabel = '0 a 100';
    passingLegend = `≥ ${passingValue} pts Aprobado`;
    failingLegend = `< ${passingValue} pts Reprobado`;
  } else if (isLetterScale) {
    scaleLabel = 'A a F (Cualitativa)';
    passingLegend = 'A, B, C Aprobado';
    failingLegend = 'D, F Reprobado';
  } else if (minNumeric === 1) {
    scaleLabel = '1.0 a 5.0';
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200 select-none touch-none"
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
        className="bg-white rounded-3xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col shadow-2xl border border-purple-100 overflow-hidden animate-in zoom-in-95 duration-150 select-text touch-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="grading-modal-title"
      >
        {/* Cabecera del Menú de Calificación */}
        <div className="p-4 sm:p-6 border-b border-purple-100 flex items-start justify-between gap-3 bg-gradient-to-r from-purple-50/80 via-indigo-50/40 to-white">
          <div className="min-w-0">
            {isTaskBatchSaved && (
              <div className="mb-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-200/80 text-slate-700 border border-slate-300">
                  <Lock className="w-3 h-3 text-slate-500" />
                  Calificaciones emitidas
                </span>
              </div>
            )}
            <h3 id="grading-modal-title" className="text-base sm:text-xl font-black text-slate-900 break-words">
              Calificación de Alumnos: <span className="text-purple-700">{task.title}</span>
            </h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            aria-label="Cerrar ventana de calificaciones"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Leyenda de Semáforo adaptativa */}
        <div className="px-4 sm:px-6 py-2.5 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
          <span className="font-bold text-slate-700">
            Criterio Visual ({scaleLabel}):
          </span>
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="text-emerald-700 font-bold flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> {passingLegend}
            </span>
            <span className="text-rose-700 font-bold flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> {failingLegend}
            </span>
          </div>
        </div>

        {/* Lista Scrollable de Alumnos */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-3.5 flex-1">
          {courseStudents.length === 0 ? (
            <div className="text-center py-10 px-4 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
              <Users className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold text-slate-600">No hay alumnos registrados en este curso.</p>
            </div>
          ) : (
            courseStudents.map((student) => {
              const draft = draftGrades[student.id] || {};
              const evalRes = evaluateGrade(draft.score);

              const existingGrade = task.studentGrades?.[student.id];
              const studentAppeal = appeals?.find(
                (a) =>
                  (a.taskId === task.id || a.assignment_id === task.id) &&
                  (a.studentId === student.id || a.student_id === student.id)
              );
              const appealStatus =
                studentAppeal?.status ||
                studentAppeal?.estado ||
                existingGrade?.appealStatus ||
                APPEAL_STATUS.CALIFICADA;

              const isAppealAccepted = appealStatus === APPEAL_STATUS.REVISION_ACEPTADA;
              const wasResent = Boolean(reSubmittedStudents[student.id]);

              // Inmutabilidad: bloqueado si la tarea fue enviada en lote, a menos que tenga apelación aceptada y no reenviada
              const isLocked = isTaskBatchSaved && (!isAppealAccepted || wasResent);
              const canResend = isTaskBatchSaved && isAppealAccepted && !wasResent;

              const guardianId = student.guardianId || student.guardian_id;
              const guardianFromCache = guardianId ? (cachedProfiles[guardianId] || KNOWN_GUARDIANS_FALLBACK[guardianId]) : null;

              // Obtener nombre del acudiente limpio y sin repeticiones
              const guardianDisplayName =
                (student.acudiente?.nombre && student.acudiente.nombre !== 'Sin acudiente' && student.acudiente.nombre !== 'Sin asignar' ? student.acudiente.nombre : null) ||
                (student.tutor?.nombre && student.tutor.nombre !== 'Sin acudiente' && student.tutor.nombre !== 'Sin asignar' ? student.tutor.nombre : null) ||
                (student.guardian?.nombre && student.guardian.nombre !== 'Sin acudiente' && student.guardian.nombre !== 'Sin asignar' ? student.guardian.nombre : null) ||
                (student.guardian?.name && student.guardian.name !== 'Sin acudiente' && student.guardian.name !== 'Sin asignar' ? student.guardian.name : null) ||
                (student.guardianName &&
                student.guardianName !== 'Sin acudiente' &&
                student.guardianName !== 'Sin asignar'
                  ? student.guardianName
                  : null) ||
                guardianFromCache?.full_name ||
                guardianFromCache?.name ||
                null;

              return (
                <div
                  key={student.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    canResend
                      ? 'border-emerald-300 bg-emerald-50/20 shadow-xs ring-1 ring-emerald-300'
                      : student.isTargetStudent
                        ? 'border-purple-300 bg-purple-50/20 shadow-2xs'
                        : isLocked
                          ? 'border-slate-200 bg-slate-50/40 shadow-2xs'
                          : 'border-slate-200/80 bg-white shadow-2xs'
                  }`}
                >
                  {/* Alumno + Input de Nota */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h5 className="font-bold text-slate-800 text-sm truncate">{student.name}</h5>
                        {student.isTargetStudent && (
                          <span className="px-1.5 py-0.2 rounded-md text-[10px] font-black bg-purple-100 text-purple-800 shrink-0">
                            María José
                          </span>
                        )}
                        {appealStatus && appealStatus !== APPEAL_STATUS.CALIFICADA && (
                          <GradeAppealBadge status={appealStatus} size="sm" />
                        )}
                        {canResend && (
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 shrink-0 border border-emerald-200">
                            Habilitado por revisión
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Calificación según Escala Dinámica */}
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <div className="text-right">
                        <label
                          htmlFor={`grade-${student.id}`}
                          className="block text-[10px] font-black uppercase text-slate-500"
                        >
                          Nota
                        </label>
                      </div>

                      {isLetterScale ? (
                        <select
                          id={`grade-${student.id}`}
                          disabled={isLocked}
                          value={evalRes.displayVal || ''}
                          onChange={(e) => handleScoreChange(student.id, e.target.value)}
                          className={`w-28 py-1.5 px-2 text-center text-sm font-black rounded-xl border-2 transition-all focus:outline-hidden ${
                            isLocked
                              ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed opacity-80'
                              : !evalRes.isGraded
                                ? 'border-slate-200 bg-slate-50 text-slate-600'
                                : evalRes.isApproved
                                  ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                                  : 'border-rose-400 bg-rose-50 text-rose-800'
                          }`}
                        >
                          <option value="">-- Nota --</option>
                          <option value="A">A (Excelente)</option>
                          <option value="B">B (Bueno)</option>
                          <option value="C">C (Aceptable)</option>
                          <option value="D">D (Insuficiente)</option>
                          <option value="F">F (Deficiente)</option>
                        </select>
                      ) : (
                        <input
                          id={`grade-${student.id}`}
                          type="text"
                          inputMode="decimal"
                          placeholder="--"
                          disabled={isLocked}
                          value={draft.score !== undefined ? draft.score : ''}
                          onChange={(e) => handleNumericScoreChange(student.id, e.target.value)}
                          onBlur={(e) => handleNumericScoreBlur(student.id, e.target.value)}
                          className={`w-20 py-1.5 text-center text-base font-black rounded-xl border-2 transition-all focus:outline-hidden ${
                            isLocked
                              ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed opacity-80'
                              : !evalRes.isGraded
                                ? 'border-slate-200 bg-slate-50 text-slate-600'
                                : !evalRes.isValid
                                  ? 'border-amber-400 bg-amber-50 text-amber-900 ring-2 ring-amber-300'
                                  : evalRes.isApproved
                                    ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                                    : 'border-rose-400 bg-rose-50 text-rose-800'
                          }`}
                        />
                      )}

                      {evalRes.isGraded && evalRes.isValid && (
                        <span
                          className={`px-2 py-1 rounded-lg text-xs font-bold shrink-0 ${
                            evalRes.isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {evalRes.isApproved ? 'Aprobado' : 'Alerta'}
                        </span>
                      )}

                      {evalRes.isGraded && !evalRes.isValid && (
                        <span className="px-2 py-1 rounded-lg text-xs font-bold shrink-0 bg-amber-100 text-amber-800">
                          Fuera de rango
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Observación Rápida */}
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
                    <label
                      htmlFor={`note-${student.id}`}
                      className="text-xs font-bold text-slate-700 flex items-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                      Observación del docente:
                    </label>

                    <input
                      id={`note-${student.id}`}
                      type="text"
                      placeholder="Ej: Excelente sustentación; o faltó responder el ejercicio final..."
                      disabled={isLocked}
                      value={draft.teacherNote || ''}
                      onChange={(e) => handleTeacherNoteChange(student.id, e.target.value)}
                      className={`w-full px-3 py-1.5 text-xs rounded-xl border transition-all shadow-2xs ${
                        isLocked
                          ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed opacity-80'
                          : 'bg-slate-50 border-slate-200 text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-400'
                      }`}
                    />

                    {/* Estado de Notificación y Acción Condicional */}
                    <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                      <div className="text-xs flex items-center flex-wrap gap-1.5">
                        {draft.isNotified || (isTaskBatchSaved && !canResend) ? (
                          <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Notificado
                          </span>
                        ) : canResend ? (
                          <span className="text-slate-500 font-medium text-[11px]">
                            Revisión en proceso (edición desbloqueada)
                          </span>
                        ) : null}

                        {draft.isRead && (
                          <span className="text-indigo-700 font-bold inline-flex items-center gap-1 ml-1">
                            • <FileCheck className="w-3.5 h-3.5" /> Firmado de enterado
                          </span>
                        )}
                      </div>

                      {/* Botón Reenviar exclusivamente cuando la apelación fue aceptada */}
                      {canResend && (
                        <button
                          type="button"
                          onClick={() => handleResendAppealGrade(student.id)}
                          disabled={!evalRes.isValid || isResending[student.id]}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            notificationSuccess[student.id]
                              ? 'bg-emerald-600 text-white'
                              : !evalRes.isValid || isResending[student.id]
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-purple-600 text-white hover:bg-purple-700 active:scale-95 shadow-xs'
                          }`}
                        >
                          {isResending[student.id] ? (
                            <LoaderCircle className="w-3 h-3 animate-spin" />
                          ) : (
                            <Send className="w-3 h-3" />
                          )}
                          <span>
                            {notificationSuccess[student.id]
                              ? '¡Reenviado!'
                              : isResending[student.id]
                                ? 'Reenviando...'
                                : 'Reenviar'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer del Modal: Envío en Lote */}
        <div className="p-4 border-t border-purple-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/80">
          <div className="text-xs text-slate-500 font-medium text-center sm:text-left">
            {isTaskBatchSaved ? (
              <span className="text-slate-600 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 inline shrink-0" />
                Calificaciones emitidas y bloqueadas para preservar la inmutabilidad de las notas.
              </span>
            ) : allStudentsGradedAndValid ? (
              <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 inline shrink-0" />
                Todos los alumnos calificados ({courseStudents.length}/{courseStudents.length}). Listo para guardar y notificar en lote.
              </span>
            ) : (
              <span className="text-amber-700 font-medium flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-500 inline shrink-0" />
                Asigna una calificación válida a todos los alumnos ({validGradedCount}/{courseStudents.length}) para habilitar el guardado.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {isTaskBatchSaved ? 'Cerrar' : 'Cancelar'}
            </button>
            <button
              type="button"
              onClick={handleSaveAndCloseBatch}
              disabled={!allStudentsGradedAndValid || isSavingBatch || isTaskBatchSaved}
              className={`px-5 py-2.5 rounded-2xl font-bold text-xs shadow-md transition-all flex items-center gap-2 active:scale-[0.99] ${
                !allStudentsGradedAndValid || isSavingBatch || isTaskBatchSaved
                  ? 'bg-purple-300 text-white/80 cursor-not-allowed opacity-60 shadow-none'
                  : 'bg-purple-700 text-white hover:bg-purple-800 cursor-pointer'
              }`}
            >
              {isSavingBatch ? (
                <LoaderCircle className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>
                {isSavingBatch
                  ? 'Guardando en lote...'
                  : isTaskBatchSaved
                    ? 'Guardado en lote'
                    : 'Guardar y Cerrar'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
