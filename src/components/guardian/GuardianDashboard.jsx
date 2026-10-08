import React, { useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import { BookOpen, CheckCircle2, FileCheck, Sparkles, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { pluralize } from '../../utils/formatters';

const hasScore = score => score !== null && score !== undefined;
const card = 'bg-white rounded-[var(--radius-md)] border border-slate-200 shadow-[var(--shadow-sm)] p-5';

export default function GuardianDashboard() {
  const { subjects, tasks, schedule, attendances, activeStudent, guardianSection, setGuardianSection, confirmReadNotification } = useApp();
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const studentId = activeStudent?.id;

  // Solo las tareas del curso del estudiante, con su calificación individual.
  const studentTasks = useMemo(() => tasks
    .filter(task => task.gradeId === activeStudent?.gradeId)
    .map(task => ({ ...task, studentGrade: task.studentGrades?.[studentId] || null })), [tasks, activeStudent?.gradeId, studentId]);

  const subjectSummaries = useMemo(() => subjects.map(subject => {
    const scores = studentTasks.filter(task => task.subjectId === subject.id).map(task => task.studentGrade?.score).filter(hasScore);
    return { ...subject, average: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null };
  }), [subjects, studentTasks]);

  // El promedio general pondera cada materia por igual y excluye materias sin nota.
  const averageScore = useMemo(() => {
    const graded = subjectSummaries.filter(subject => subject.average !== null);
    return graded.length ? (graded.reduce((sum, subject) => sum + subject.average, 0) / graded.length).toFixed(1) : '—';
  }, [subjectSummaries]);

  const studentAttendances = useMemo(() => {
    return attendances.filter(a => a.student_id === studentId);
  }, [attendances, studentId]);

  const attendanceStats = useMemo(() => {
    const total = studentAttendances.length;
    if (!total) {
      return { percentage: '100%', absences: 0, tardies: 0, justificada: 0, hasRecords: false };
    }
    const absences = studentAttendances.filter(a => a.status === 'ausente').length;
    const tardies = studentAttendances.filter(a => a.status === 'tardanza').length;
    const justificada = studentAttendances.filter(a => a.status === 'justificada').length;
    const attended = studentAttendances.filter(a => a.status === 'presente' || a.status === 'justificada').length;
    const pct = Math.round((attended / total) * 100);
    return {
      percentage: `${pct}%`,
      absences,
      tardies,
      justificada,
      hasRecords: true
    };
  }, [studentAttendances]);

  if (!activeStudent) {
    return <div className={`${card} text-sm text-slate-600`}>No hay estudiantes vinculados a esta cuenta. Comuníquese con la coordinación del colegio.</div>;
  }

  const pendingTasks = studentTasks.filter(task => !hasScore(task.studentGrade?.score)).slice(0, 4);
  const pendingSignatures = studentTasks.filter(task => task.studentGrade?.isNotified && !task.studentGrade?.isRead);
  const selectedSubject = subjectSummaries.find(subject => subject.id === selectedSubjectId);
  const selectedSubjectTasks = studentTasks.filter(task => task.subjectId === selectedSubjectId && hasScore(task.studentGrade?.score));

  const handleConfirmSignature = async taskId => {
    await confirmReadNotification(taskId, studentId);
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 }, colors: ['#A78BFA', '#DDD6FE', '#10B981', '#F472B6'] });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="pb-2 border-b border-purple-100/70">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-fuchsia-600 shrink-0"></span>
          <h2 className="text-lg sm:text-2xl font-black text-slate-800 tracking-tight break-words">Seguimiento Escolar: {activeStudent.name}</h2>
          <span className="text-xs font-semibold text-slate-600 shrink-0">Grado {activeStudent.gradeName}</span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">Acudiente titular: <strong className="text-slate-700">{activeStudent.guardianName}</strong> ({activeStudent.guardianKinship})</p>
      </div>

      {pendingSignatures.length > 0 && (
        <section className={`${card} border-purple-200`}>
          <div className="flex items-center justify-between mb-4"><h3 className="text-base font-black text-slate-900">Calificaciones por confirmar</h3><span className="text-xs text-slate-600">{pluralize(pendingSignatures.length, 'pendiente')}</span></div>
          <div className="space-y-3">
            {pendingSignatures.map(task => {
              const grade = task.studentGrade;
              return (
                <div key={task.id} className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 p-4 rounded-[var(--radius-sm)] border border-slate-200">
                  <div className="space-y-2 min-w-0">
                    <p className="text-xs font-bold text-purple-700">{task.subjectName} · {task.teacherName}</p>
                    <h4 className="text-sm font-black text-slate-900">{task.title}</h4>
                    {grade.teacherNote && <p className="text-xs text-slate-600"><strong>Docente:</strong> {grade.teacherNote}</p>}
                    {grade.aiMessage && <p className="text-xs text-slate-800 italic bg-purple-50/70 border border-purple-100 rounded-xl p-3"><Sparkles className="inline w-3.5 h-3.5 mr-1 text-purple-600" />"{grade.aiMessage}"</p>}
                  </div>
                  <div className="flex sm:flex-col items-center gap-3 shrink-0">
                    {hasScore(grade.score) && <strong className={`text-3xl ${grade.score < 3 ? 'text-rose-700' : 'text-emerald-700'}`}>{grade.score.toFixed(1)}</strong>}
                    <button type="button" onClick={() => handleConfirmSignature(task.id)} className="py-2 px-4 rounded-2xl bg-linear-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs shadow-md hover:from-purple-700 hover:to-indigo-700 flex items-center gap-2 cursor-pointer"><FileCheck className="w-4 h-4" />Confirmar lectura</button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <section className={`lg:col-span-2 ${card}`}>
          <div className="flex items-center justify-between mb-4"><h3 className="text-base font-black text-slate-900">Notas por materia</h3><span className="text-xs text-slate-600">Escala de 0 a 5</span></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {subjectSummaries.map(subject => (
              <button type="button" key={subject.id} onClick={() => setSelectedSubjectId(subject.id)} className="flex items-center justify-between gap-3 p-3 rounded-[var(--radius-sm)] bg-slate-50 border border-slate-100 text-left hover:border-purple-300 hover:bg-purple-50/40 transition-colors cursor-pointer">
                <div><p className="text-sm font-bold text-slate-800">{subject.shortName || subject.name}</p><p className="text-xs text-slate-600 mt-1">{subject.average !== null ? 'Ver notas y actividades' : 'Sin calificaciones aún'}</p></div>
                <strong className={`text-lg ${subject.average !== null && subject.average < 3 ? 'text-rose-700' : 'text-slate-900'}`}>{subject.average !== null ? subject.average.toFixed(1) : '—'}</strong>
              </button>
            ))}
          </div>
        </section>

        <div className="space-y-4">
          <section className={card}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-black text-slate-900">Asistencia</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${parseInt(attendanceStats.percentage, 10) < 85 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                {parseInt(attendanceStats.percentage, 10) < 85 ? 'Alerta' : 'Regular'}
              </span>
            </div>
            <div className="mt-4 flex items-end gap-2">
              <strong className={`text-3xl ${parseInt(attendanceStats.percentage, 10) < 85 ? 'text-rose-700' : 'text-emerald-700'}`}>
                {attendanceStats.percentage}
              </strong>
              <span className="text-xs text-slate-600 pb-1">asistencia acumulada</span>
            </div>
            <p className="text-xs text-slate-600 mt-2">
              {attendanceStats.hasRecords
                ? `${pluralize(attendanceStats.absences, 'ausencia')} · ${pluralize(attendanceStats.tardies, 'llegada')} tarde`
                : 'Sin reportes de inasistencia registrados'}
            </p>
          </section>

          <section className={card}>
            <h3 className="text-base font-black text-slate-900">Promedio general</h3>
            <div className="mt-4 flex items-end gap-2">
              <strong className={`text-3xl ${averageScore !== '—' && Number(averageScore) < 3 ? 'text-rose-700' : 'text-emerald-700'}`}>{averageScore}</strong>
              <span className="text-xs text-slate-600 pb-1">sobre 5.0</span>
            </div>
            <p className="text-xs text-slate-600 mt-2">Promedio de las materias con calificaciones</p>
          </section>
        </div>
      </div>

      <section className={card}>
        <div className="flex items-center justify-between mb-4"><h3 className="text-base font-black text-slate-900">Tareas pendientes</h3><span className="text-xs text-slate-600">{pluralize(pendingTasks.length, 'entrega')}</span></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {pendingTasks.length ? pendingTasks.map(task => <div key={task.id} className="p-3 rounded-[var(--radius-sm)] border border-slate-200"><p className="text-sm font-bold text-slate-800">{task.title}</p><p className="text-xs text-slate-600 mt-1">{task.subjectName} · Fecha límite: {task.dueDate}</p></div>) : <p className="text-sm text-slate-600">No hay entregas pendientes.</p>}
        </div>
      </section>

      {selectedSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 sm:p-6" role="presentation" onClick={() => setSelectedSubjectId(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-canvas)] shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="subject-modal-title" onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
              <div><p className="text-xs font-bold text-purple-700">Notas por materia</p><h3 id="subject-modal-title" className="text-lg font-black text-slate-900">{selectedSubject.name}</h3></div>
              <button type="button" onClick={() => setSelectedSubjectId(null)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Cerrar notas"><X className="w-5 h-5" /></button>
            </div>
            <div className="max-h-[calc(90vh-88px)] overflow-y-auto p-5 space-y-4">
              <div className="flex items-end gap-2"><strong className={`text-4xl ${selectedSubject.average !== null && selectedSubject.average < 3 ? 'text-rose-700' : 'text-emerald-700'}`}>{selectedSubject.average !== null ? selectedSubject.average.toFixed(1) : '—'}</strong><span className="text-xs text-slate-600 pb-1">promedio de la materia</span></div>
              {selectedSubjectTasks.length > 0 ? selectedSubjectTasks.map(task => {
                const { score, isRead } = task.studentGrade;
                return (
                  <div key={task.id} className="bg-white rounded-[var(--radius-md)] border border-slate-200 p-4 flex items-start justify-between gap-4">
                    <div><h4 className="text-sm font-bold text-slate-900">{task.title}</h4><p className="text-xs text-slate-600 mt-1">{task.teacherName} · {task.assignedDate}</p><p className="text-xs text-slate-600 mt-1">Fecha límite: {task.dueDate}</p>{isRead && <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" />Lectura confirmada</p>}</div>
                    <strong className={`text-xl ${score < 3 ? 'text-rose-700' : 'text-emerald-700'}`}>{score.toFixed(1)}</strong>
                  </div>
                );
              }) : <p className="bg-white rounded-[var(--radius-md)] border border-slate-200 p-4 text-sm text-slate-600">Aún no hay notas registradas para esta materia.</p>}
            </div>
          </div>
        </div>
      )}

      {guardianSection === 'schedule' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 sm:p-6" role="presentation" onClick={() => setGuardianSection('grades')}>
          <div className="bg-white p-6 rounded-[var(--radius-lg)] shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="schedule-modal-title" onClick={event => event.stopPropagation()}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-purple-50">
              <div>
                <h3 id="schedule-modal-title" className="text-lg font-bold text-slate-800">Plan Semanal de Materias y Trabajos del Alumno</h3>
                <p className="text-xs text-slate-600">Revise los horarios diarios de {activeStudent.name}.</p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto"><span className="text-xs text-slate-600">Grado {activeStudent.gradeName}</span><button type="button" onClick={() => setGuardianSection('grades')} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Cerrar horario"><X className="w-5 h-5" /></button></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6 items-start">
              {schedule.length === 0 && <p className="text-sm text-slate-600 md:col-span-5">Aún no hay horario registrado.</p>}
              {schedule.map(dayPlan => (
                <div key={dayPlan.day} className="rounded-3xl bg-slate-50/70 border border-slate-200/70 p-4">
                  <div className="pb-2 mb-3 border-b border-purple-200/60 font-black text-sm uppercase tracking-wide text-slate-600">{dayPlan.day}</div>
                  <div className="space-y-2.5">
                    {dayPlan.periods.map((period, idx) => period.isBreak ? (
                      <div key={idx} className="p-2 bg-amber-50 rounded-xl text-center border border-amber-100 text-[10px] font-bold text-amber-800">☕ {period.label}</div>
                    ) : (
                      <div key={idx} className="p-3 rounded-2xl border bg-white/90 border-slate-200/70">
                        <span className="text-[10px] font-mono text-slate-500 block font-bold">{period.time}</span>
                        <h5 className="font-bold text-xs text-slate-800 mt-0.5 leading-snug"><BookOpen className="inline w-3 h-3 mr-1 text-purple-500" />{period.subject}</h5>
                        {period.topic && <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">{period.topic}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
