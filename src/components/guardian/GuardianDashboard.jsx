import React, { useMemo, useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import Swal from 'sweetalert2';
import {
  BookOpen,
  CheckCircle2,
  FileCheck,
  Calendar,
  AlertTriangle,
  AlertCircle,
  Clock,
  ArrowLeft,
  ChevronRight,
  HelpCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { pluralize } from '../../utils/formatters';
import AttendanceCalendarModal from './AttendanceCalendarModal';
import TaskDetailModal from './TaskDetailModal';
import AllGradesModal from './AllGradesModal';
import SingleGradeDetailModal from './SingleGradeDetailModal';
import GradeAppealBadge from '../common/GradeAppealBadge';
import GuardianAppealModal from './GuardianAppealModal';
import GuardianAppealResolutionModal from './GuardianAppealResolutionModal';
import { APPEAL_STATUS } from '../../utils/appealsStorage';

const hasScore = score => score !== null && score !== undefined;
const card = 'bg-white rounded-[var(--radius-md)] border border-slate-200 shadow-[var(--shadow-sm)] p-5';
const kpiCard = 'bg-white rounded-[var(--radius-md)] border border-slate-200 shadow-[var(--shadow-sm)] p-3 sm:p-5 flex flex-col justify-between';

export default function GuardianDashboard() {
  const {
    subjects,
    tasks,
    schedule,
    attendances,
    activeStudent,
    guardianSection,
    setGuardianSection,
    confirmReadNotification,
    disputeGrade,
    submitGradeAppeal,
    appeals,
    activeDeepLink,
    clearDeepLink,
    gradingSettings
  } = useApp();

  const passingScore = Number(gradingSettings?.passingValue ?? (gradingSettings?.format === 'zero_hundred' ? 60 : 3.0));

  const [showAttendanceCalendar, setShowAttendanceCalendar] = useState(false);
  const [initialAttendanceDate, setInitialAttendanceDate] = useState(null);
  const [showAllGradesModal, setShowAllGradesModal] = useState(false);
  const [selectedGradeForDetail, setSelectedGradeForDetail] = useState(null);
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState(null);
  const [appealTask, setAppealTask] = useState(null);
  const [viewingResolutionAppeal, setViewingResolutionAppeal] = useState(null);

  const studentId = activeStudent?.id;

  // Solo las tareas del curso del estudiante, con su calificación individual.
  const studentTasks = useMemo(() => {
    return tasks
      .filter(task => task.gradeId === activeStudent?.gradeId)
      .map(task => ({
        ...task,
        studentGrade: task.studentGrades?.[studentId] || null
      }));
  }, [tasks, activeStudent?.gradeId, studentId]);

  const subjectSummaries = useMemo(() => {
    return subjects.map(subject => {
      const scores = studentTasks
        .filter(task => task.subjectId === subject.id)
        .map(task => task.studentGrade?.score)
        .filter(hasScore);
      return {
        ...subject,
        average: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null
      };
    });
  }, [subjects, studentTasks]);

  // El promedio general pondera cada materia por igual y excluye materias sin nota.
  const averageScore = useMemo(() => {
    const graded = subjectSummaries.filter(subject => subject.average !== null);
    return graded.length ? (graded.reduce((sum, subject) => sum + subject.average, 0) / graded.length).toFixed(1) : '—';
  }, [subjectSummaries]);

  const studentAttendances = useMemo(() => {
    return attendances.filter(a => a.student_id === studentId);
  }, [attendances, studentId]);

  // Lógica de asistencia y llegadas tarde:
  // - La llegada tarde ('tarde') computa como asistencia válida en el porcentaje global.
  // - Si las llegadas tarde superan el umbral (>= 3), se activa advertencia amarilla.
  const attendanceStats = useMemo(() => {
    const total = studentAttendances.length;
    if (!total) {
      return {
        percentage: '100%',
        percentageNum: 100,
        absences: 0,
        tardies: 0,
        justificada: 0,
        hasRecords: false,
        hasRecurrentTardies: false
      };
    }
    const absences = studentAttendances.filter(a => a.status === 'ausente').length;
    const tardies = studentAttendances.filter(a => a.status === 'tardanza').length;
    const justificada = studentAttendances.filter(a => a.status === 'justificada').length;

    // Llegadas tarde computan como asistencia válida:
    const attended = studentAttendances.filter(a => a.status === 'presente' || a.status === 'tardanza' || a.status === 'justificada').length;
    const pct = Math.round((attended / total) * 100);
    const hasRecurrentTardies = tardies >= 3;

    return {
      percentage: `${pct}%`,
      percentageNum: pct,
      absences,
      tardies,
      justificada,
      hasRecords: true,
      hasRecurrentTardies
    };
  }, [studentAttendances]);

  if (!activeStudent) {
    return (
      <div className={`${card} text-sm text-slate-600`}>
        No hay estudiantes vinculados a esta cuenta. Comuníquese con la coordinación del colegio.
      </div>
    );
  }

  const pendingTasks = studentTasks.filter(task => !hasScore(task.studentGrade?.score)).slice(0, 4);
  const pendingSignatures = studentTasks.filter(task => task.studentGrade?.isNotified && !task.studentGrade?.isRead);

  // Deep-linking inteligente desde notificaciones
  useEffect(() => {
    if (!activeDeepLink) return;

    if (activeDeepLink.tipo === 'INASISTENCIA') {
      const alertDate = activeDeepLink.alert?.timestamp || activeDeepLink.alert?.created_at;
      if (alertDate) {
        setInitialAttendanceDate(new Date(alertDate));
      }
      setShowAttendanceCalendar(true);
      clearDeepLink();
    } else if (
      activeDeepLink.tipo === 'RESOLUCION_APELACION' ||
      (activeDeepLink.tipo === 'APELACION_NOTA' && activeDeepLink.appeal?.respuesta_docente)
    ) {
      setViewingResolutionAppeal(
        activeDeepLink.appeal || {
          motivo_acudiente: activeDeepLink.alert?.message,
          estado: activeDeepLink.alert?.metadata?.decision || APPEAL_STATUS.REVISION_ACEPTADA,
          respuesta_docente: activeDeepLink.alert?.message
        }
      );
      clearDeepLink();
    } else if (activeDeepLink.tipo === 'TAREA') {
      const targetTask = studentTasks.find(t => t.id === activeDeepLink.taskId) || tasks.find(t => t.id === activeDeepLink.taskId);
      if (targetTask) {
        setSelectedTaskForDetail(targetTask);
      }
      clearDeepLink();
    } else if (activeDeepLink.tipo === 'NOTA' || activeDeepLink.tipo === 'CALIFICACION') {
      const foundTask = studentTasks.find(t => t.id === activeDeepLink.taskId) || tasks.find(t => t.id === activeDeepLink.taskId);
      if (foundTask) {
        const targetTask = foundTask.studentGrade ? foundTask : {
          ...foundTask,
          studentGrade: foundTask.studentGrades?.[studentId] || null
        };
        setSelectedGradeForDetail(targetTask);
      } else {
        setShowAllGradesModal(true);
      }
      clearDeepLink();
    }
  }, [activeDeepLink, studentTasks, tasks, clearDeepLink]);

  const handleConfirmSignature = async taskId => {
    await confirmReadNotification(taskId, studentId);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 }, colors: ['#A78BFA', '#DDD6FE', '#10B981', '#F472B6'] });
  };

  const handleDisputeGrade = task => {
    setAppealTask(task);
  };

  const handleSubmitAppeal = async ({ taskId, studentId, reason }) => {
    try {
      if (submitGradeAppeal) {
        await submitGradeAppeal({ taskId, studentId, reason });
      } else {
        await disputeGrade({ taskId, studentId, reason });
      }
      Swal.fire({
        icon: 'success',
        title: '¡Solicitud enviada!',
        text: 'Se ha registrado la solicitud formal de revisión y se notificó al docente titular.',
        confirmButtonColor: '#7c3aed'
      });
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Error al enviar',
        text: err?.message || 'No se pudo registrar la solicitud de revisión.',
        confirmButtonColor: '#7c3aed'
      });
    }
  };

  // VISTA DEDICADA DE HORARIO (NO MODAL)
  if (guardianSection === 'schedule') {
    return (
      <div className="space-y-6 animate-in fade-in duration-150">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-purple-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-600 shrink-0"></span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">Horario Semanal de Clases</h2>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                Grado {activeStudent.gradeName}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Planificación y distribución horaria para <strong className="text-slate-800">{activeStudent.name}</strong>.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setGuardianSection('grades')}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al Panel de Notas
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
          {schedule.length === 0 && (
            <div className={`md:col-span-5 ${card} text-center py-10 text-slate-500 text-sm`}>
              Aún no hay un horario registrado para este grado escolar.
            </div>
          )}

          {schedule.map(dayPlan => (
            <div key={dayPlan.day} className="rounded-3xl bg-slate-50/70 border border-slate-200/70 p-4 shadow-xs">
              <div className="pb-2 mb-3 border-b border-purple-200/60 font-black text-sm uppercase tracking-wide text-slate-600">
                {dayPlan.day}
              </div>
              <div className="space-y-2.5">
                {dayPlan.periods.map((period, idx) =>
                  period.isBreak ? (
                    <div
                      key={idx}
                      className="p-2 bg-amber-50 rounded-xl text-center border border-amber-100 text-[10px] font-bold text-amber-800"
                    >
                      ☕ {period.label}
                    </div>
                  ) : (
                    <div key={idx} className="p-3 rounded-2xl border bg-white/95 border-slate-200/70 shadow-2xs space-y-1">
                      <span className="text-[10px] font-mono text-slate-500 block font-bold">{period.time}</span>
                      <h5 className="font-bold text-xs text-slate-800 leading-snug flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-purple-600 shrink-0" />
                        {period.subject}
                      </h5>
                      {period.teacherName && (
                        <p className="text-[10px] text-slate-500 font-medium">Docente: {period.teacherName}</p>
                      )}
                      {period.topic && <p className="text-[11px] text-slate-600 line-clamp-2">{period.topic}</p>}
                    </div>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // VISTA PRINCIPAL (SEGUIMIENTO ESCOLAR)
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Header del estudiante */}
      <div className="pb-2 border-b border-purple-100/70">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-fuchsia-600 shrink-0"></span>
          <h2 className="text-lg sm:text-2xl font-black text-slate-800 tracking-tight break-words">
            Seguimiento Escolar: {activeStudent.name}
          </h2>
          <span className="text-xs font-semibold text-slate-600 shrink-0">Grado {activeStudent.gradeName}</span>
        </div>

      </div>

      {/* Firmas / Lecturas pendientes */}
      {pendingSignatures.length > 0 && (
        <section className={`${card} border-purple-200`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-black text-slate-900">Calificaciones por confirmar</h3>
            <span className="text-xs text-slate-600">{pluralize(pendingSignatures.length, 'pendiente')}</span>
          </div>
          <div className="space-y-3">
            {pendingSignatures.map(task => {
              const grade = task.studentGrade;
              const existingAppeal = grade?.appeal || appeals?.find(
                a => (a.taskId === task.id || a.assignment_id === task.id) &&
                     (a.studentId === studentId || a.student_id === studentId)
              );
              const hasExistingAppeal = Boolean(existingAppeal);

              return (
                <div
                  key={task.id}
                  className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-4 rounded-[var(--radius-sm)] border border-slate-200 bg-slate-50/50"
                >
                  <div className="space-y-2 min-w-0">
                    <p className="text-xs font-bold text-purple-700">
                      {task.subjectName} · Docente: {task.teacherName && task.teacherName !== 'Docente' ? task.teacherName : 'No asignado'}
                    </p>
                    <h4 className="text-sm font-black text-slate-900">{task.title}</h4>
                    {grade.teacherNote && (
                      <p className="text-xs text-slate-600">
                        <strong>Observación del docente:</strong> {grade.teacherNote}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap sm:flex-col items-end sm:items-center gap-2.5 shrink-0">
                    {hasScore(grade.score) && (
                      <strong className={`text-3xl font-black ${grade.score < passingScore ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {gradingSettings?.format === 'zero_hundred' ? Math.round(grade.score) : grade.score.toFixed(1)}
                      </strong>
                    )}

                    <div className="flex flex-wrap items-center gap-2">
                      {hasExistingAppeal ? (
                        <div className="flex items-center gap-1.5">
                          {existingAppeal.status === APPEAL_STATUS.CALIFICADA ? (
                            <span
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200 shadow-2xs"
                              title="Calificación actualizada tras revisión del docente"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                              <span>Revisada y calificada</span>
                            </span>
                          ) : (
                            <GradeAppealBadge status={existingAppeal.status} />
                          )}
                          <button
                            type="button"
                            disabled
                            className="py-2 px-3 rounded-2xl bg-slate-100 text-slate-400 font-bold text-xs border border-slate-200 cursor-not-allowed flex items-center gap-1.5 opacity-60"
                            title={
                              existingAppeal.status === APPEAL_STATUS.CALIFICADA
                                ? "Esta actividad ya fue revisada y calificada por el docente. Solo se permite una revisión por actividad."
                                : "Esta calificación ya cuenta con una solicitud de revisión registrada."
                            }
                          >
                            <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {existingAppeal.status === APPEAL_STATUS.CALIFICADA
                                ? "Revisión ya realizada"
                                : "Revisión en trámite"}
                            </span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setAppealTask(task)}
                          className="py-2 px-3 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 shadow-2xs flex items-center gap-1.5 cursor-pointer transition-all"
                        >
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>No estoy de acuerdo</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleConfirmSignature(task.id)}
                        className="py-2 px-4 rounded-2xl bg-linear-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs shadow-md hover:from-purple-700 hover:to-indigo-700 flex items-center gap-2 cursor-pointer transition-all"
                      >
                        <FileCheck className="w-4 h-4" />
                        <span>Confirmar lectura</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* BLOQUES DE MÉTRICAS HORIZONTALES SIMPLIFICADOS */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
        {/* TARJETA ASISTENCIA (MINIMALISTA: TÍTULO, PORCENTAJE Y CALENDARIO >) */}
        <section
          className={`${kpiCard} cursor-pointer transition-all hover:border-purple-300 hover:shadow-md group`}
          onClick={() => setShowAttendanceCalendar(true)}
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setShowAttendanceCalendar(true);
            }
          }}
          aria-label="Ver calendario interactivo de asistencia"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-base font-black text-slate-900 flex items-center gap-1.5 sm:gap-2">
              <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 shrink-0" />
              <span>Asistencia</span>
            </h3>
          </div>

          <div className="my-2 sm:my-3">
            <strong
              className={`text-2xl sm:text-4xl font-black ${attendanceStats.hasRecurrentTardies
                ? 'text-amber-600'
                : attendanceStats.percentageNum < 85
                  ? 'text-rose-700'
                  : 'text-emerald-700'
                }`}
            >
              {attendanceStats.percentage}
            </strong>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-100/80">
            <span className="text-[11px] sm:text-xs font-semibold text-purple-700 group-hover:underline inline-flex items-center gap-0.5">
              calendario <ChevronRight className="w-3 h-3 text-purple-600" />
            </span>
          </div>
        </section>

        {/* TARJETA PROMEDIO (MINIMALISTA Y CLIQUEABLE: ABRE HISTORIAL GLOBAL DE TODAS LAS NOTAS) */}
        <section
          className={`${kpiCard} cursor-pointer transition-all hover:border-purple-300 hover:shadow-md group`}
          onClick={() => setShowAllGradesModal(true)}
          role="button"
          tabIndex={0}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setShowAllGradesModal(true);
            }
          }}
          aria-label="Ver consolidado de notas de todas las materias"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-base font-black text-slate-900 flex items-center gap-1.5 sm:gap-2">
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 shrink-0" />
              <span>Promedio</span>
            </h3>
          </div>

          <div className="my-2 sm:my-3 flex items-baseline gap-1 sm:gap-1.5">
            <strong
              className={`text-2xl sm:text-4xl font-black ${averageScore !== '—' && Number(averageScore) < passingScore ? 'text-rose-700' : 'text-emerald-700'
                }`}
            >
              {averageScore}
            </strong>
            <span className="text-[11px] sm:text-xs text-slate-500 font-semibold">
              sobre {gradingSettings?.format === 'zero_hundred' ? '100' : '5.0'}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-100/80">
            <span className="text-[11px] sm:text-xs font-semibold text-purple-700 group-hover:underline inline-flex items-center gap-0.5">
              todas las notas <ChevronRight className="w-3 h-3 text-purple-600" />
            </span>
          </div>
        </section>
      </div>

      {/* TAREAS PENDIENTES CON MODAL DE DETALLE INTERACTIVO */}
      <section className={card}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-black text-slate-900">Tareas pendientes</h3>
            <p className="text-xs text-slate-500">Haz clic en cualquier tarea para ver la descripción completa y detalles</p>
          </div>
          <span className="text-xs text-slate-600">{pluralize(pendingTasks.length, 'entrega')}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {pendingTasks.length ? (
            pendingTasks.map(task => (
              <button
                type="button"
                key={task.id}
                onClick={() => setSelectedTaskForDetail(task)}
                className="p-3.5 rounded-[var(--radius-sm)] border border-slate-200 bg-white hover:border-purple-400 hover:bg-purple-50/20 text-left transition-all cursor-pointer flex flex-col justify-between group shadow-2xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                      {task.subjectName}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 group-hover:text-purple-600 flex items-center gap-0.5">
                      Ver detalle <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 mt-2 group-hover:text-purple-900 leading-snug">
                    {task.title}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Entrega: {task.dueDate || 'Sin fecha'}</span>
                </div>
              </button>
            ))
          ) : (
            <p className="text-sm text-slate-500 col-span-2 py-4 text-center">No hay entregas pendientes registradas.</p>
          )}
        </div>
      </section>

      {/* MODAL DETALLE DE CALIFICACIÓN INDIVIDUAL (DEEP LINKING DESDE NOTIFICACIONES) */}
      <SingleGradeDetailModal
        task={selectedGradeForDetail}
        student={activeStudent}
        onClose={() => setSelectedGradeForDetail(null)}
        onConfirmReading={handleConfirmSignature}
        onDisputeGrade={handleDisputeGrade}
        onOpenAllGrades={() => {
          setSelectedGradeForDetail(null);
          setShowAllGradesModal(true);
        }}
      />

      {/* CALENDARIO INTERACTIVO DE ASISTENCIA */}
      <AttendanceCalendarModal
        isOpen={showAttendanceCalendar}
        onClose={() => {
          setShowAttendanceCalendar(false);
          setInitialAttendanceDate(null);
        }}
        attendances={studentAttendances}
        studentName={activeStudent.name}
        attendanceStats={attendanceStats}
        initialDate={initialAttendanceDate}
      />

      {/* MODAL HISTORIAL COMPLETO DE CALIFICACIONES DE TODAS LAS MATERIAS */}
      <AllGradesModal
        isOpen={showAllGradesModal}
        onClose={() => setShowAllGradesModal(false)}
        studentName={activeStudent.name}
        gradeName={activeStudent.gradeName}
        averageScore={averageScore}
        subjectSummaries={subjectSummaries}
        studentTasks={studentTasks}
        onDisputeGrade={handleDisputeGrade}
      />

      {/* MODAL DE DETALLE DE TAREA */}
      <TaskDetailModal
        task={selectedTaskForDetail}
        student={activeStudent}
        onClose={() => setSelectedTaskForDetail(null)}
      />

      {/* MODAL DE SOLICITUD DE REVISIÓN / APELACIÓN */}
      <GuardianAppealModal
        isOpen={Boolean(appealTask)}
        onClose={() => setAppealTask(null)}
        task={appealTask}
        student={activeStudent}
        onSubmit={handleSubmitAppeal}
      />

      {/* MODAL DE RESOLUCIÓN DE APELACIÓN (VISTA ACUDIENTE) */}
      <GuardianAppealResolutionModal
        isOpen={Boolean(viewingResolutionAppeal)}
        onClose={() => setViewingResolutionAppeal(null)}
        appeal={viewingResolutionAppeal}
        task={studentTasks.find(t => t.id === viewingResolutionAppeal?.taskId || t.id === viewingResolutionAppeal?.assignment_id)}
      />
    </div>
  );
}
