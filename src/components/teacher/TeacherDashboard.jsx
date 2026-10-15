import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Calendar,
  BookOpen,
  Plus,
  Clock,
  ChevronRight,
  ClipboardCheck,
  X,
  Users,
  Scale,
  Building2,
  Check
} from 'lucide-react';
import TeacherAttendanceModal from './TeacherAttendanceModal';
import TeacherNewTaskModal from './TeacherNewTaskModal';
import TeacherGradingModal from './TeacherGradingModal';
import TeacherAppealModal from './TeacherAppealModal';
import TeacherAppealsView from './TeacherAppealsView';
import { APPEAL_STATUS } from '../../utils/appealsStorage';

const dayNamesSpanish = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const card = 'bg-white rounded-[var(--radius-md)] border border-slate-200 shadow-[var(--shadow-sm)] p-5';

export default function TeacherDashboard() {
  const {
    activeTeacher,
    activeTeacherId,
    tasks,
    students,
    subjects,
    grades,
    schedule,
    attendances,
    saveAttendance,
    saveAttendanceBatch,
    teacherClassesMap: databaseTeacherClassesMap,
    createTask,
    updateStudentGrade,
    saveGradesBatch,
    notifyGuardian,
    teacherSection,
    setTeacherSection,
    appeals,
    resolveGradeAppeal,
    activeDeepLink,
    clearDeepLink
  } = useApp();

  // Pestaña activa principal: 'classes' (Clases y Tareas) | 'schedule' (Calendario) | 'appeals' (Notas Apeladas)
  const [activeTab, setActiveTab] = useState(() => teacherSection || 'classes');
  const [selectedAppeal, setSelectedAppeal] = useState(null);

  useEffect(() => {
    if (teacherSection && teacherSection !== activeTab) {
      setActiveTab(teacherSection);
    }
  }, [teacherSection, activeTab]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (setTeacherSection) setTeacherSection(tab);
  };

  // Deep-linking directo desde notificaciones de apelación para el docente
  useEffect(() => {
    if (!activeDeepLink) return;

    if (activeDeepLink.tipo === 'APELACION_NOTA') {
      const match = (appeals || []).find(
        a =>
          a.id === activeDeepLink.referenciaId ||
          (a.taskId === activeDeepLink.taskId && a.studentId === activeDeepLink.studentId) ||
          (a.assignment_id === activeDeepLink.taskId && a.student_id === activeDeepLink.studentId)
      );

      if (match) {
        setSelectedAppeal(match);
      } else {
        setSelectedAppeal({
          id: activeDeepLink.referenciaId || 'appeal-deep-link',
          taskId: activeDeepLink.taskId,
          studentId: activeDeepLink.studentId,
          motivo_acudiente: activeDeepLink.alert?.message,
          estado: APPEAL_STATUS.EN_REVISION
        });
      }
      clearDeepLink();
    }
  }, [activeDeepLink, appeals, clearDeepLink]);

  // Modales
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [gradingTaskId, setGradingTaskId] = useState(null);

  // Contador de apelaciones pendientes para el badge
  const pendingAppealsCount = useMemo(() => {
    return (appeals || []).filter(a => {
      const status = a.estado || a.status;
      if (status !== APPEAL_STATUS.EN_REVISION) return false;
      if (activeTeacherId && a.teacher_id && String(a.teacher_id) !== String(activeTeacherId)) {
        return false;
      }
      return true;
    }).length;
  }, [appeals, activeTeacherId]);

  // Resolver estudiante y tarea asociados a la apelación seleccionada
  const appealStudent = useMemo(() => {
    if (!selectedAppeal) return null;
    const sId = selectedAppeal.student_id || selectedAppeal.studentId;
    return students.find(s => s.id === sId) || selectedAppeal.rawStudent || null;
  }, [selectedAppeal, students]);

  const appealTask = useMemo(() => {
    if (!selectedAppeal) return null;
    const tId = selectedAppeal.assignment_id || selectedAppeal.taskId;
    return tasks.find(t => t.id === tId) || selectedAppeal.rawTask || null;
  }, [selectedAppeal, tasks]);

  // Agrupar clases por Salón / Curso (Nivel 1 de la jerarquía)
  const teacherClasses = useMemo(
    () => databaseTeacherClassesMap[activeTeacherId] || [],
    [databaseTeacherClassesMap, activeTeacherId]
  );

  const assignedSalones = useMemo(() => {
    const map = new Map();
    for (const cls of teacherClasses) {
      if (!map.has(cls.gradeId)) {
        map.set(cls.gradeId, {
          gradeId: cls.gradeId,
          gradeName: cls.gradeName,
          gradeNum: cls.gradeNum,
          section: cls.section,
          salon: cls.salon || 'Aula regular',
          studentsCount: cls.studentsCount || 0,
          subjects: []
        });
      }
      map.get(cls.gradeId).subjects.push({
        classId: cls.id,
        subjectId: cls.subjectId,
        subjectName: cls.subjectName,
        isToday: cls.isToday,
        cls
      });
    }
    return Array.from(map.values()).sort((a, b) => {
      const numA = parseInt(a.gradeNum, 10) || 0;
      const numB = parseInt(b.gradeNum, 10) || 0;
      if (numA !== numB) return numA - numB;
      return (a.section || '').localeCompare(b.section || '');
    });
  }, [teacherClasses]);

  const [selectedGradeId, setSelectedGradeId] = useState(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);

  // Sincronización al cambiar docente activo: reajusta estado y cierra modales
  const [prevTeacherId, setPrevTeacherId] = useState(activeTeacherId);
  if (activeTeacherId !== prevTeacherId) {
    setPrevTeacherId(activeTeacherId);
    setSelectedGradeId(null);
    setSelectedSubjectId(null);
    setGradingTaskId(null);
    setShowAttendanceModal(false);
    setShowNewTaskModal(false);
  }

  // Día actual para resaltar en horario semanal
  const todayName = useMemo(() => dayNamesSpanish[new Date().getDay()] || 'Lunes', []);

  // Salón activo resuelto
  const activeSalón = useMemo(() => {
    if (selectedGradeId) {
      const match = assignedSalones.find(s => s.gradeId === selectedGradeId);
      if (match) return match;
    }
    return assignedSalones[0] || null;
  }, [selectedGradeId, assignedSalones]);

  // Materia activa resuelta dentro del salón seleccionado
  const activeSubject = useMemo(() => {
    if (!activeSalón || activeSalón.subjects.length === 0) return null;
    if (selectedSubjectId) {
      const match = activeSalón.subjects.find(s => s.subjectId === selectedSubjectId);
      if (match) return match;
    }
    return activeSalón.subjects[0] || null;
  }, [activeSalón, selectedSubjectId]);

  // Objeto de la clase actualmente activa (combinación Salón + Materia)
  const currentClass = useMemo(() => {
    return activeSubject?.cls || null;
  }, [activeSubject]);

  // Índice O(1) de asistencias para no iterar todo el array por estudiante
  const attendanceLookup = useMemo(() => {
    const map = new Map();
    for (const a of attendances || []) {
      map.set(`${a.student_id}:${a.class_group_id}:${a.subject_id ?? ''}:${a.date}`, a);
    }
    return map;
  }, [attendances]);

  // Tareas correspondientes exclusivamente a la combinación de salón y materia seleccionadas
  const classTasks = useMemo(() => {
    if (!currentClass) return [];
    return tasks.filter(t => {
      const matchesGrade = t.gradeId === currentClass.gradeId;
      if (!matchesGrade) return false;
      const matchesSubject = !t.subjectId || t.subjectId === currentClass.subjectId;
      if (!matchesSubject) return false;
      if (t.teacherId && t.teacherId !== activeTeacherId) {
        return false;
      }
      return true;
    });
  }, [tasks, currentClass, activeTeacherId]);

  // Tarea en proceso de calificación
  const currentGradingTask = useMemo(
    () => tasks.find(t => t.id === gradingTaskId) || null,
    [tasks, gradingTaskId]
  );

  // Alumnos del curso de la tarea
  const courseStudents = useMemo(() => {
    if (!currentGradingTask) return [];
    return students.filter(s => s.gradeId === currentGradingTask.gradeId);
  }, [students, currentGradingTask]);

  // Alumnos de la clase actualmente seleccionada
  const currentClassStudents = useMemo(() => {
    if (!currentClass) return [];
    return students.filter(s => s.gradeId === currentClass.gradeId);
  }, [students, currentClass]);

  // Manejo de crear tarea: permanece en la vista general del curso/materia sin abrir automáticamente el modal de calificación
  const handleCreateTask = async (taskPayload) => {
    const created = await createTask(taskPayload);
    return created;
  };

  // Guard de verificación de rol activo (consistente con el panel de acudiente)
  if (!activeTeacher) {
    return (
      <div className={`${card} text-sm text-slate-600`}>
        No hay un perfil docente asignado o vinculado a esta cuenta. Comuníquese con la coordinación del colegio.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-150">

      {/* ============================================================ */}
      {/* VISTA 1: HORARIO SEMANAL */}
      {/* ============================================================ */}
      {activeTab === 'schedule' && (
        <div className="bg-white p-5 sm:p-7 rounded-3xl border border-purple-100 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-purple-50">
            <div>
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                Calendario Escolar Semanal
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                El día de hoy se encuentra ampliado y resaltado en morado.
              </p>
            </div>
            <span className="self-start sm:self-auto px-3 py-1 bg-purple-100 text-purple-800 text-xs font-extrabold rounded-full border border-purple-200">
              Hoy es {todayName}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
            {schedule.length === 0 ? (
              <div className="md:col-span-5 bg-slate-50/70 rounded-3xl border border-slate-200/70 p-8 text-center text-slate-500 text-sm">
                Aún no hay un horario registrado en el sistema para esta institución.
              </div>
            ) : (
              schedule.map((dayPlan) => {
                const isCurrentDay = dayPlan.day.toLowerCase() === todayName.toLowerCase();
                const teacherId = String(activeTeacher?.id || '');
                const teacherName = (activeTeacher?.name || '').toLowerCase().trim();

                // Filtro estricto: mostrar únicamente las clases y franjas asignadas a este docente
                const teacherPeriods = (dayPlan.periods || []).filter((period) => {
                  if (period.isBreak) return false;
                  const matchId = period.teacherId && String(period.teacherId) === teacherId;
                  const matchName = period.teacher && period.teacher.toLowerCase().includes(teacherName);
                  return matchId || matchName;
                });

                return (
                  <div
                    key={dayPlan.day}
                    className={`rounded-3xl transition-all duration-200 text-left ${isCurrentDay
                      ? 'bg-purple-50/90 border-2 border-purple-500 shadow-lg shadow-purple-200/50 p-5 ring-4 ring-purple-100 md:-translate-y-1'
                      : 'bg-slate-50/70 border border-slate-200/70 p-4 opacity-85 hover:opacity-100'
                      }`}
                  >
                    {/* Cabecera del día */}
                    <div className="flex items-center justify-between pb-2 mb-3 border-b border-purple-200/60">
                      <span
                        className={`font-black text-sm uppercase tracking-wide ${isCurrentDay ? 'text-purple-900 text-base' : 'text-slate-600'
                          }`}
                      >
                        {dayPlan.day}
                      </span>
                      {isCurrentDay && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-600 text-white shadow-xs">
                          HOY
                        </span>
                      )}
                    </div>

                    {/* Clases asignadas al docente */}
                    <div className="space-y-3">
                      {teacherPeriods.length === 0 ? (
                        <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/70 text-center text-xs text-slate-400 font-medium">
                          Sin clases este día
                        </div>
                      ) : (
                        teacherPeriods.map((period, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-2xl border bg-white border-purple-200/80 shadow-xs space-y-1"
                          >
                            <span className="text-[10px] font-mono text-purple-700 font-extrabold block">
                              {period.time}
                            </span>
                            <h5 className="font-extrabold text-xs text-slate-800 leading-snug">
                              {period.subject}
                            </h5>
                            <div className="text-[11px] font-semibold text-slate-600">
                              {period.courseName || 'Curso'} {period.room ? `• ${period.room}` : ''}
                            </div>
                            {period.topic && (
                              <p className="text-[11px] text-slate-500 line-clamp-2">
                                {period.topic}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* VISTA 2: NAVEGACIÓN Y GESTIÓN DE CLASES / TAREAS */}
      {/* ============================================================ */}
      {activeTab === 'classes' && (
        <div className="space-y-6 text-left">
          {/* ============================================================ */}
          {/* NIVEL 1: SALONES / CURSOS ASIGNADOS */}
          {/* ============================================================ */}
          <section className={card}>
            <div className="flex items-end justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-purple-600" />
                  Salones Asignados
                </h3>

              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 shrink-0">
                {assignedSalones.length} {assignedSalones.length === 1 ? 'salón' : 'salones'}
              </span>
            </div>

            {assignedSalones.length === 0 ? (
              <div className="text-center py-10 px-4 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                <BookOpen className="w-10 h-10 text-purple-400 mx-auto mb-2 opacity-50" />
                <h4 className="text-sm font-bold text-slate-800">No tienes salones asignados</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Aún no tienes salones o asignaturas asociadas en el sistema para este período escolar. Comunícate con la coordinación académica.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                {assignedSalones.map((salon) => {
                  const isSelected = activeSalón?.gradeId === salon.gradeId;
                  const subjectsCount = salon.subjects.length;
                  return (
                    <button
                      key={salon.gradeId}
                      type="button"
                      onClick={() => {
                        setSelectedGradeId(salon.gradeId);
                        setSelectedSubjectId(salon.subjects[0]?.subjectId || null);
                      }}
                      className={`text-left p-3.5 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between relative w-36 sm:w-40 aspect-square shrink-0 ${isSelected
                        ? 'border-purple-600 ring-3 ring-purple-200/80 bg-gradient-to-br from-purple-50/70 via-white to-purple-50/30 shadow-md'
                        : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/20 shadow-2xs hover:shadow-xs'
                        }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2.5 right-2.5 flex items-center justify-center w-5 h-5 rounded-full bg-purple-600 text-white shadow-xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                      <div>
                        <div className="pr-5">
                          <span className={`text-lg sm:text-xl font-black block leading-tight ${isSelected ? 'text-purple-950' : 'text-slate-900 group-hover:text-purple-700'}`}>
                            {salon.gradeNum ? `${salon.gradeNum}° ${salon.section || ''}` : salon.gradeName}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-400 block truncate mt-0.5">
                            {salon.gradeName}
                          </span>
                        </div>
                        <p className="mt-1.5 text-xs text-purple-700 font-bold">
                          {subjectsCount} {subjectsCount === 1 ? 'materia' : 'materias'}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="flex items-center gap-1 font-medium text-slate-600">
                          <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{salon.studentsCount}</span>
                        </span>
                        <span className="font-semibold text-slate-700 truncate text-[10px] sm:text-[11px]">
                          {salon.salon}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* ============================================================ */}
          {/* NIVEL 2: MATERIAS ESPECÍFICAS DEL SALÓN SELECCIONADO */}
          {/* ============================================================ */}
          {activeSalón && activeSalón.subjects.length > 0 && (
            <section className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-purple-50/70 via-indigo-50/40 to-white border border-purple-200/90 shadow-2xs space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-purple-700" />
                  <h4 className="text-sm font-extrabold text-slate-900">
                    Materias a las que das clases en {activeSalón.gradeNum ? `${activeSalón.gradeNum}° ${activeSalón.section || ''}` : activeSalón.gradeName}:
                  </h4>
                </div>

              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {activeSalón.subjects.map((subj) => {
                  const isSubjSelected = activeSubject?.subjectId === subj.subjectId;
                  return (
                    <button
                      key={subj.subjectId}
                      type="button"
                      onClick={() => setSelectedSubjectId(subj.subjectId)}
                      className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${isSubjSelected
                        ? 'bg-purple-600 text-white shadow-sm ring-2 ring-purple-300 active:scale-95'
                        : 'bg-white text-slate-700 border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 shadow-2xs'
                        }`}
                    >
                      <BookOpen className={`w-3.5 h-3.5 ${isSubjSelected ? 'text-white' : 'text-purple-600'}`} />
                      <span>{subj.subjectName}</span>
                      {subj.isToday && (
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded-full ${isSubjSelected ? 'bg-purple-800 text-purple-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                          Hoy
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* SECCIÓN: DETALLE DE CLASE SELECCIONADA Y TAREAS */}
          {currentClass && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Barra de Título y Acciones de la Clase Activa */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">

                    <h4 className="font-black text-slate-900 text-base sm:text-lg truncate">
                      {currentClass.subjectName}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {classTasks.length} {classTasks.length === 1 ? 'tarea registrada' : 'tareas registradas'} • {currentClassStudents.length} alumnos inscritos
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setShowAttendanceModal(true)}
                    className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-white border border-purple-200 text-purple-700 text-xs font-bold hover:bg-purple-50 transition-colors cursor-pointer shadow-2xs active:scale-[0.99]"
                  >
                    <ClipboardCheck className="w-4 h-4 text-purple-600" />
                    <span>Tomar Asistencia</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewTaskModal(true)}
                    className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors cursor-pointer shadow-xs active:scale-[0.99]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nueva tarea</span>
                  </button>
                </div>
              </div>

              {/* Grid de Tareas de la Clase */}
              {classTasks.length === 0 ? (
                <div className={`${card} text-center py-12 space-y-3`}>
                  <BookOpen className="w-10 h-10 text-purple-300 mx-auto" />
                  <p className="text-slate-700 text-sm font-bold">
                    Aún no hay tareas creadas para {currentClass.subjectName} ({currentClass.gradeName}).
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Crea una tarea para asignar calificaciones numéricas, redactar retroalimentaciones y notificar a los acudientes.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowNewTaskModal(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs shadow-xs hover:bg-purple-700 cursor-pointer transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    Crear la primera tarea
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {classTasks.map((task) => {
                    const gradedCount = Object.keys(task.studentGrades || {}).filter(
                      (k) => task.studentGrades[k].score !== null && task.studentGrades[k].score !== undefined
                    ).length;
                    const isFullyNotified = task.status === 'Calificada y Notificada';

                    return (
                      <div
                        key={task.id}
                        onClick={() => setGradingTaskId(task.id)}
                        className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs hover:border-purple-400 hover:shadow-md transition-all duration-150 cursor-pointer group text-left space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`text-[10px] font-black px-2.5 py-0.5 rounded-full shrink-0 ${isFullyNotified
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                              }`}
                          >
                            {task.status}
                          </span>

                          <span className="text-xs font-mono text-slate-500 flex items-center gap-1 font-medium">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            Límite: {task.dueDate || 'Sin fecha'}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-base font-black text-slate-900 group-hover:text-purple-900 transition-colors tracking-tight">
                            {task.title}
                          </h4>
                          {task.description && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-slate-600 font-medium">
                            Calificados:{' '}
                            <strong className="text-purple-700 font-black">
                              {gradedCount} / {currentClass.studentsCount}
                            </strong>
                          </span>
                          <span className="text-purple-700 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                            Calificar alumnos <ChevronRight className="w-4 h-4" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* VISTA 3: NOTAS APELADAS */}
      {/* ============================================================ */}
      {activeTab === 'appeals' && (
        <TeacherAppealsView
          appeals={appeals}
          students={students}
          tasks={tasks}
          subjects={subjects}
          grades={grades}
          teacherClasses={teacherClasses}
          activeTeacherId={activeTeacherId}
          onOpenAppealModal={(appeal) => setSelectedAppeal(appeal)}
          onBackToClasses={() => handleTabChange('classes')}
        />
      )}

      {/* ============================================================ */}
      {/* MODAL 1: CALIFICACIÓN DE ALUMNOS */}
      {/* ============================================================ */}
      <TeacherGradingModal
        isOpen={Boolean(gradingTaskId && currentGradingTask)}
        onClose={() => setGradingTaskId(null)}
        task={currentGradingTask}
        courseStudents={courseStudents}
        onSaveBatch={saveGradesBatch}
        onUpdateStudentGrade={updateStudentGrade}
        onNotifyGuardian={notifyGuardian}
      />

      {/* ============================================================ */}
      {/* MODAL 2: CREAR NUEVA TAREA */}
      {/* ============================================================ */}
      <TeacherNewTaskModal
        isOpen={showNewTaskModal && Boolean(currentClass)}
        onClose={() => setShowNewTaskModal(false)}
        currentClass={currentClass}
        onCreateTask={handleCreateTask}
      />

      {/* ============================================================ */}
      {/* MODAL 3: CONTROL DE ASISTENCIA */}
      {/* ============================================================ */}
      <TeacherAttendanceModal
        isOpen={showAttendanceModal && Boolean(currentClass)}
        onClose={() => setShowAttendanceModal(false)}
        currentClass={currentClass}
        students={currentClassStudents}
        attendanceLookup={attendanceLookup}
        activeTeacherId={activeTeacherId}
        saveAttendance={saveAttendance}
        saveAttendanceBatch={saveAttendanceBatch}
      />

      {/* ============================================================ */}
      {/* MODAL 4: GESTIÓN DE APELACIÓN DE NOTA */}
      {/* ============================================================ */}
      <TeacherAppealModal
        isOpen={Boolean(selectedAppeal)}
        onClose={() => setSelectedAppeal(null)}
        appeal={selectedAppeal}
        student={appealStudent}
        task={appealTask}
        onResolve={resolveGradeAppeal}
      />
    </div>
  );
}
