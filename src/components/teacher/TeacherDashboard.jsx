import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { generateAIEmpatheticMessage } from '../../utils/aiAssistant';
import { toLocalISODate } from '../../utils/formatters';
import {
  Calendar,
  BookOpen,
  Plus,
  Sparkles,
  Send,
  CheckCircle2,
  Clock,
  MessageSquare,
  FileCheck,
  ChevronRight,
  ClipboardCheck,
  X,
} from 'lucide-react';

const dayNamesSpanish = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function TeacherDashboard() {
  const {
    activeTeacher,
    activeTeacherId,
    tasks,
    students,
    schedule,
    attendances,
    saveAttendance,
    saveAttendanceBatch,
    teacherClassesMap: databaseTeacherClassesMap,
    createTask,
    updateStudentGrade,
    notifyGuardian
  } = useApp();

  // Pestaña activa principal: 'classes' (Clases y Tareas) | 'schedule' (Calendario)
  const [activeTab, setActiveTab] = useState('classes');

  // Modal para tomar asistencia del día (en zona horaria local)
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(() => toLocalISODate());
  const [attendanceStatuses, setAttendanceStatuses] = useState({});
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [attendanceSavedMessage, setAttendanceSavedMessage] = useState('');

  // Filtros multinivel en pestañas:
  // 1) Grado
  // 2) Nivel / Sección
  // 3) Clase / Materia
  const [selectedGradeNum, setSelectedGradeNum] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState(null);

  // Sincronización al cambiar docente activo: reajusta estado directamente durante el render
  const [prevTeacherId, setPrevTeacherId] = useState(activeTeacherId);
  if (activeTeacherId !== prevTeacherId) {
    setPrevTeacherId(activeTeacherId);
    setSelectedGradeNum(null);
    setSelectedSection(null);
    setSelectedClassId(null);
    setGradingTaskId(null);
  }

  // Tarea activa para calificar alumnos (despliegue / modal de alumnos)
  const [gradingTaskId, setGradingTaskId] = useState(null);

  // Modal para crear nueva tarea
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');

  // Estados de animación para adaptación con IA y confirmación de notificación
  const [isGeneratingAI, setIsGeneratingAI] = useState({});
  const [notificationSuccess, setNotificationSuccess] = useState({});

  // Día actual para resaltar (según fecha real del sistema)
  const todayName = useMemo(() => dayNamesSpanish[new Date().getDay()] || 'Lunes', []);

  // Clases del profesor actualmente seleccionado
  const teacherClasses = useMemo(() => databaseTeacherClassesMap[activeTeacherId] || [], [databaseTeacherClassesMap, activeTeacherId]);

  // 1. Grados disponibles para este docente (dinámico: 6, 7, 8, 9, 10, 11...)
  const availableGrades = useMemo(() => {
    const unique = Array.from(new Set(teacherClasses.map(c => c.gradeNum).filter(Boolean)));
    return unique.sort((a, b) => (parseInt(a, 10) || 0) - (parseInt(b, 10) || 0));
  }, [teacherClasses]);

  // Grado activo resuelto (si no se ha seleccionado o no existe, toma el primero disponible)
  const activeGradeNum = useMemo(() => {
    if (selectedGradeNum && availableGrades.includes(selectedGradeNum)) {
      return selectedGradeNum;
    }
    return availableGrades[0] || '';
  }, [selectedGradeNum, availableGrades]);

  // 2. Secciones disponibles para el grado activo (A, B, C...)
  const availableSections = useMemo(() => {
    if (!activeGradeNum) return [];
    const unique = Array.from(new Set(
      teacherClasses.filter(c => c.gradeNum === activeGradeNum).map(c => c.section).filter(Boolean)
    ));
    return unique.sort();
  }, [teacherClasses, activeGradeNum]);

  // Sección activa resuelta (si no se ha seleccionado o no existe en este grado, toma la primera)
  const activeSection = useMemo(() => {
    if (selectedSection && availableSections.includes(selectedSection)) {
      return selectedSection;
    }
    return availableSections[0] || '';
  }, [selectedSection, availableSections]);

  // 3. Clases asignadas de este profesor en ese Grado y Sección
  const availableClasses = useMemo(() => {
    if (!activeGradeNum || !activeSection) return [];
    return teacherClasses.filter(
      c => c.gradeNum === activeGradeNum && c.section === activeSection
    );
  }, [teacherClasses, activeGradeNum, activeSection]);

  // Clase activa resuelta
  const activeClassId = useMemo(() => {
    if (selectedClassId && availableClasses.some(c => c.id === selectedClassId)) {
      return selectedClassId;
    }
    return availableClasses[0]?.id || null;
  }, [selectedClassId, availableClasses]);

  // Objeto de la clase actualmente activa
  const currentClass = useMemo(() => {
    return teacherClasses.find(c => c.id === activeClassId) || availableClasses[0] || null;
  }, [teacherClasses, activeClassId, availableClasses]);

  const handleSelectClass = (classId) => {
    setSelectedClassId(classId);
  };

  // Índice O(1) de asistencias para no iterar todo el array por estudiante
  const attendanceLookup = useMemo(() => {
    const map = new Map();
    for (const a of attendances || []) {
      map.set(`${a.student_id}:${a.class_group_id}:${a.subject_id ?? ''}:${a.date}`, a);
    }
    return map;
  }, [attendances]);

  // Tareas correspondientes a la clase seleccionada
  const classTasks = useMemo(() => {
    if (!currentClass) return [];
    return tasks.filter(t => {
      // Coincidencia con el salón/curso (ej: 9A, 10B)
      const matchesGrade = t.gradeId === currentClass.gradeId;
      if (!matchesGrade) return false;

      // Si la tarea tiene profesor asignado, debe coincidir con el docente activo
      if (t.teacherId && t.teacherId !== activeTeacherId) {
        return false;
      }
      return true;
    });
  }, [tasks, currentClass, activeTeacherId]);

  // Tarea en proceso de calificación
  const currentGradingTask = tasks.find(t => t.id === gradingTaskId) || null;

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

  // Abrir modal de asistencia cargando registros existentes si los hay
  const handleOpenAttendanceModal = () => {
    const today = toLocalISODate();
    setAttendanceDate(today);
    setAttendanceSavedMessage('');
    const initial = {};
    for (const st of currentClassStudents) {
      const existing = attendanceLookup.get(`${st.id}:${currentClass.gradeId}:${currentClass.subjectId ?? ''}:${today}`);
      initial[st.id] = {
        status: existing?.status || 'presente',
        note: existing?.note || ''
      };
    }
    setAttendanceStatuses(initial);
    setShowAttendanceModal(true);
  };

  const handleAttendanceDateChange = (newDate) => {
    setAttendanceDate(newDate);
    const updated = {};
    for (const st of currentClassStudents) {
      const existing = attendanceLookup.get(`${st.id}:${currentClass.gradeId}:${currentClass.subjectId ?? ''}:${newDate}`);
      updated[st.id] = {
        status: existing?.status || 'presente',
        note: existing?.note || ''
      };
    }
    setAttendanceStatuses(updated);
  };

  const handleSaveAllAttendance = async (e) => {
    e.preventDefault();
    if (!currentClass) return;
    setAttendanceSaving(true);
    setAttendanceSavedMessage('');
    try {
      const records = currentClassStudents.map(st => {
        const item = attendanceStatuses[st.id] || { status: 'presente', note: '' };
        return {
          studentId: st.id,
          classGroupId: currentClass.gradeId,
          subjectId: currentClass.subjectId,
          teacherId: activeTeacherId,
          date: attendanceDate,
          status: item.status,
          note: item.note
        };
      });

      if (saveAttendanceBatch) {
        await saveAttendanceBatch(records);
      } else {
        await Promise.all(records.map(saveAttendance));
      }

      setAttendanceSavedMessage('¡Asistencia guardada! Se notificó automáticamente a los acudientes con inasistencia.');
      setTimeout(() => {
        setShowAttendanceModal(false);
        setAttendanceSavedMessage('');
      }, 2000);
    } catch (err) {
      setAttendanceSavedMessage('Error al guardar asistencia: ' + (err.message || 'Error desconocido'));
    } finally {
      setAttendanceSaving(false);
    }
  };

  // Manejo de crear tarea
  const handleCreateTask = async (e) => {
    e.preventDefault();
    const created = await createTask({
      title: newTaskTitle,
      subjectId: currentClass?.subjectId,
      gradeId: currentClass?.gradeId,
      dueDate: newTaskDueDate,
      description: newTaskDesc
    });

    setNewTaskTitle('');
    setNewTaskDueDate('');
    setNewTaskDesc('');
    setShowNewTaskModal(false);

    // Abrir automáticamente la tarea creada para calificar
    setGradingTaskId(created.id);
  };

  // Manejo de cambio de nota
  const handleScoreChange = (studentId, rawValue) => {
    const value = rawValue === '' ? null : parseFloat(rawValue);
    updateStudentGrade(currentGradingTask.id, studentId, { score: value });
  };

  // Manejo de observación rápida
  const handleTeacherNoteChange = (studentId, note) => {
    updateStudentGrade(currentGradingTask.id, studentId, { teacherNote: note });
  };

  // Adaptar mensaje con IA
  const handleAdaptWithAI = (student, currentGradeData) => {
    const studentId = student.id;
    setIsGeneratingAI(prev => ({ ...prev, [studentId]: true }));

    setTimeout(() => {
      const aiMessage = generateAIEmpatheticMessage({
        studentName: student.name,
        guardianName: student.guardianName,
        guardianKinship: student.guardianKinship,
        subjectName: currentGradingTask.subjectName,
        taskTitle: currentGradingTask.title,
        score: currentGradeData?.score,
        teacherRawNote: currentGradeData?.teacherNote || '',
        tone: 'empathetic'
      });

      updateStudentGrade(currentGradingTask.id, studentId, { aiMessage });
      setIsGeneratingAI(prev => ({ ...prev, [studentId]: false }));
    }, 400);
  };

  // Enviar y Notificar
  const handleSendNotification = (studentId) => {
    notifyGuardian(currentGradingTask.id, studentId);
    setNotificationSuccess(prev => ({ ...prev, [studentId]: true }));
    setTimeout(() => {
      setNotificationSuccess(prev => ({ ...prev, [studentId]: false }));
    }, 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">

      {/* Cabecera Limpia Rol Docente (gestionada desde la bola superior derecha) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-purple-100/70">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 shrink-0"></span>
            <h2 className="text-lg sm:text-2xl font-black text-slate-800 tracking-tight break-words">
              Panel de Calificaciones y Clases
            </h2>
            <span className="text-xs font-semibold text-slate-600 shrink-0">
              {activeTeacher.subject}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Docente: <strong className="text-slate-700">{activeTeacher.name}</strong> • Selecciona un curso para calificar y notificar acudientes.
          </p>
        </div>

        {/* Pestañas: Mis Clases / Calendario Semanal */}
        <div className="grid grid-cols-2 sm:flex items-center gap-1.5 p-1 bg-purple-50/80 rounded-2xl border border-purple-100/90 w-full sm:w-auto">
          <button
            onClick={() => { setActiveTab('classes'); setSelectedClassId(null); }}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${activeTab === 'classes' && !selectedClassId
              ? 'bg-white text-purple-950 shadow-xs border border-purple-200/60'
              : 'text-slate-600 hover:text-purple-700'
              }`}
          >
            <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 shrink-0" />
            <span className="truncate">Mis Clases</span>
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer text-center ${activeTab === 'schedule'
              ? 'bg-white text-purple-950 shadow-xs border border-purple-200/60'
              : 'text-slate-600 hover:text-purple-700'
              }`}
          >
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 shrink-0" />
            <span className="truncate">Horario Semanal</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* VISTA 1: HORARIO SEMANAL CON DÍA ACTUAL RECALCADO */}
      {/* ============================================================ */}
      {activeTab === 'schedule' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-purple-100 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-purple-50">
            <div>
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                Calendario Escolar Semanal
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                El día de hoy se encuentra ampliado y resaltado en morado.
              </p>
            </div>
            <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-extrabold rounded-full border border-purple-200">
              Hoy es {todayName}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
            {schedule.map((dayPlan) => {
              const isCurrentDay = dayPlan.day.toLowerCase() === todayName.toLowerCase();

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
                    <span className={`font-black text-sm uppercase tracking-wide ${isCurrentDay ? 'text-purple-900 text-base' : 'text-slate-600'
                      }`}>
                      {dayPlan.day}
                    </span>
                    {isCurrentDay && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-600 text-white shadow-xs">
                        HOY
                      </span>
                    )}
                  </div>

                  {/* Clases del día */}
                  <div className="space-y-3">
                    {dayPlan.periods.map((period, idx) => {
                      if (period.isBreak) {
                        return (
                          <div
                            key={idx}
                            className="p-2 bg-amber-50/80 rounded-xl text-center border border-amber-200/70 text-[10px] font-bold text-amber-800"
                          >
                            ☕ {period.label}
                          </div>
                        );
                      }

                      const isTeacherClass = Boolean(activeTeacher?.name && period.teacher?.includes(activeTeacher.name));

                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-2xl border transition-all ${isCurrentDay && isTeacherClass
                            ? 'bg-white border-purple-300 shadow-xs ring-1 ring-purple-200'
                            : 'bg-white/90 border-slate-200/70'
                            }`}
                        >
                          <span className="text-[10px] font-mono text-slate-500 font-bold block">
                            {period.time}
                          </span>
                          <h5 className="font-extrabold text-xs text-slate-800 mt-0.5 leading-snug">
                            {period.subject}
                          </h5>
                          <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                            {period.topic}
                          </p>

                          {period.homeworkDue && (
                            <div className="mt-2 pt-1.5 border-t border-purple-50 text-[10px] font-bold text-purple-700 flex items-center gap-1">
                              📌 Tarea: {period.homeworkDue}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* VISTA: NAVEGACIÓN MULTIPESTAÑAS (GRADO -> SECCIÓN -> CLASE -> TAREAS) */}
      {/* ============================================================ */}
      {activeTab === 'classes' && (
        <div className="space-y-6 relative pb-20 text-left">

          <section>
            <div className="flex items-end justify-between gap-3 mb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">Tus cursos</h3>
                <p className="text-xs text-slate-600 mt-1">Elige un curso para revisar tareas y calificaciones.</p>
              </div>
              <span className="text-xs font-semibold text-slate-600">{teacherClasses.length} cursos</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {teacherClasses.map((cls) => {
                const isSelected = selectedClassId === cls.id;
                return <button key={cls.id} type="button" onClick={() => { handleSelectClass(cls.id); setSelectedGradeNum(cls.gradeNum); setSelectedSection(cls.section); }} className={`text-left bg-white p-5 rounded-[var(--radius-md)] border transition-all ${isSelected ? 'border-purple-500 ring-2 ring-purple-100 shadow-[var(--shadow-md)]' : 'border-slate-200 shadow-[var(--shadow-sm)] hover:border-purple-300'}`}>
                  <div className="flex items-center justify-between gap-2"><span className="text-sm font-black text-slate-900">{cls.gradeNum}°{cls.section}</span>{cls.isToday && <span className="text-[10px] font-bold text-emerald-700">Hoy</span>}</div>
                  <h4 className="mt-3 text-sm font-bold text-slate-800 leading-snug">{cls.subjectName}</h4>
                  <p className="mt-2 text-xs text-slate-600">{cls.studentsCount} estudiantes</p>
                  <p className="mt-1 text-xs text-slate-500">{cls.salon}</p>
                </button>;
              })}
            </div>
          </section>

          {/* 4. Y AHÍ SÍ LAS TAREAS DE ESA CLASE */}
          {currentClass && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-base">
                    Tareas y Trabajos de {currentClass.subjectName} — {currentClass.gradeName} ({classTasks.length})
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    Haz clic en una tarea para desplegar y calificar a los alumnos
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenAttendanceModal}
                    className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-[var(--radius-sm)] bg-white border border-purple-300 text-purple-700 text-xs font-bold hover:bg-purple-50 cursor-pointer shadow-xs"
                  >
                    <ClipboardCheck className="w-4 h-4 text-purple-600" />
                    Tomar Asistencia
                  </button>
                  <button onClick={() => setShowNewTaskModal(true)} className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-[var(--radius-sm)] bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 cursor-pointer"><Plus className="w-4 h-4" />Nueva tarea</button>
                </div>
              </div>

              {classTasks.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border-2 border-purple-200 text-center space-y-3">
                  <p className="text-slate-600 text-sm font-semibold">
                    Aún no hay tareas creadas para {currentClass.subjectName} ({currentClass.gradeName}).
                  </p>
                  <button
                    onClick={() => setShowNewTaskModal(true)}
                    className="px-4 py-2 rounded-2xl bg-purple-600 text-white font-bold text-xs shadow-sm hover:bg-purple-700 cursor-pointer"
                  >
                    Crear la primera tarea
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {classTasks.map((task) => {
                    const gradedCount = Object.keys(task.studentGrades || {}).filter(
                      k => task.studentGrades[k].score !== null
                    ).length;
                    const isFullyNotified = task.status === 'Calificada y Notificada';

                    return (
                      <div
                        key={task.id}
                        onClick={() => setGradingTaskId(task.id)}
                        className="bg-white p-5 rounded-3xl border-2 border-purple-300 shadow-sm hover:bg-linear-to-br hover:from-purple-600 hover:via-purple-700 hover:to-indigo-700 hover:border-purple-600 hover:shadow-xl hover:shadow-purple-400/30 hover:-translate-y-1 transition-all duration-200 cursor-pointer group text-left space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full shadow-xs shrink-0 ${isFullyNotified
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-900 border border-amber-300'
                            }`}>
                            {task.status}
                          </span>

                          <span className="text-xs font-mono text-slate-500 group-hover:text-purple-100 flex items-center gap-1 transition-colors font-medium">
                            <Clock className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-200 transition-colors" />
                            Límite: {task.dueDate}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-base font-black text-slate-800 group-hover:text-white transition-colors tracking-tight">
                            {task.title}
                          </h4>
                          <p className="text-xs text-slate-500 group-hover:text-purple-100 mt-1 line-clamp-2 transition-colors">
                            {task.description}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-purple-100/80 group-hover:border-purple-400/40 flex items-center justify-between text-xs transition-colors">
                          <span className="text-slate-600 group-hover:text-purple-100 font-semibold transition-colors">
                            Calificados: <strong className="text-purple-700 group-hover:text-white transition-colors">{gradedCount} / {currentClass.studentsCount}</strong>
                          </span>
                          <span className="text-purple-700 group-hover:text-white font-extrabold flex items-center gap-1 group-hover:translate-x-1 transition-all">
                            Calificar Alumnos <ChevronRight className="w-4 h-4" />
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
      {/* VISTA 4: MENÚ / DESPLIEGUE DE CALIFICACIÓN DE ALUMNOS (MODAL ENFOCADO) */}
      {/* ============================================================ */}
      {gradingTaskId && currentGradingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col shadow-2xl border border-purple-100 overflow-hidden">

            {/* Cabecera del Menú de Calificación */}
            <div className="p-4 sm:p-6 border-b border-purple-100 flex items-start justify-between gap-3 bg-purple-50/40">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-200 text-purple-900 shrink-0">
                    {currentGradingTask.gradeName} - {currentGradingTask.subjectName}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    Fecha límite: {currentGradingTask.dueDate}
                  </span>
                </div>
                <h3 className="text-base sm:text-xl font-black text-slate-800 mt-1 break-words">
                  Calificación de Alumnos: {currentGradingTask.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Asigna la nota rápida (≥3.0 verde, &lt;3.0 rojo), adapta el mensaje con IA y notifica al acudiente.
                </p>
              </div>

              <button
                onClick={() => setGradingTaskId(null)}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>

            {/* Leyenda de semáforo */}
            <div className="px-4 sm:px-6 py-2 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <span className="font-bold text-slate-700">Criterio Visual:</span>
              <div className="flex items-center gap-3 sm:gap-4">
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> ≥ 3.0 Aprobado
                </span>
                <span className="text-rose-700 font-bold flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> &lt; 3.0 Reprobado
                </span>
              </div>
            </div>

            {/* Lista Scrollable de Alumnos */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {courseStudents.map((student) => {
                const gradeData = currentGradingTask.studentGrades?.[student.id] || {
                  score: null,
                  teacherNote: '',
                  aiMessage: '',
                  isNotified: false,
                  notifiedAt: null,
                  isRead: false,
                  readAt: null
                };

                const score = gradeData.score;
                const isGraded = score !== null && score !== undefined;
                const isApproved = isGraded && score >= 3.0;

                return (
                  <div
                    key={student.id}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all ${student.isTargetStudent
                      ? 'border-purple-300 bg-purple-50/20'
                      : 'border-slate-200/80 bg-white'
                      }`}
                  >
                    {/* Alumno + Input de Nota */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={student.avatar}
                          alt={student.name}
                          className="w-10 h-10 rounded-2xl object-cover border border-purple-200"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h5 className="font-bold text-slate-800 text-sm">{student.name}</h5>
                            {student.isTargetStudent && (
                              <span className="px-1.5 py-0.2 rounded-md text-[10px] font-black bg-purple-100 text-purple-800">
                                María José
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            Acudiente: <strong className="text-slate-700">{student.guardianName}</strong> ({student.guardianKinship})
                          </p>
                        </div>
                      </div>

                      {/* Calificación rápida */}
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <div className="text-right">
                          <label className="block text-[10px] font-black uppercase text-slate-500">
                            Nota
                          </label>
                        </div>

                        <input
                          type="number"
                          min="0"
                          max="5"
                          step="0.1"
                          placeholder="--"
                          value={score !== null && score !== undefined ? score : ''}
                          onChange={(e) => handleScoreChange(student.id, e.target.value)}
                          className={`w-16 py-1.5 text-center text-base font-black rounded-xl border-2 transition-all focus:outline-hidden ${!isGraded
                            ? 'border-slate-200 bg-slate-50 text-slate-600'
                            : isApproved
                              ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                              : 'border-rose-400 bg-rose-50 text-rose-800'
                            }`}
                        />

                        {isGraded && (
                          <span className={`px-2 py-1 rounded-lg text-xs font-bold ${isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                            {isApproved ? 'Aprobado' : 'Alerta'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Observación y Botón IA */}
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                          Observación rápida:
                        </label>

                        <button
                          type="button"
                          onClick={() => handleAdaptWithAI(student, gradeData)}
                          disabled={isGeneratingAI[student.id]}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-linear-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 transition-all cursor-pointer disabled:opacity-50 self-end sm:self-auto"
                        >
                          <Sparkles className={`w-3.5 h-3.5 ${isGeneratingAI[student.id] ? 'animate-spin' : ''}`} />
                          {isGeneratingAI[student.id] ? 'Adaptando...' : 'Adaptar mensaje con IA'}
                        </button>
                      </div>

                      <input
                        type="text"
                        placeholder="Ej: Excelente sustentación; o faltó responder el ejercicio final..."
                        value={gradeData.teacherNote || ''}
                        onChange={(e) => handleTeacherNoteChange(student.id, e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-slate-50 rounded-xl border border-slate-200 text-slate-700 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-400"
                      />

                      {/* Mensaje IA adaptado */}
                      {gradeData.aiMessage && (
                        <div className="p-3 rounded-xl bg-purple-50/70 border border-purple-200/80 text-xs text-slate-700 italic">
                          <span className="not-italic font-bold text-[11px] text-purple-900 block mb-1">
                            ✨ Mensaje generado para el acudiente:
                          </span>
                          "{gradeData.aiMessage}"
                        </div>
                      )}

                      {/* Botón de Enviar y Notificar */}
                      <div className="flex items-center justify-between pt-1">
                        <div className="text-xs">
                          {gradeData.isNotified ? (
                            <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Notificado ({gradeData.notifiedAt})
                            </span>
                          ) : (
                            <span className="text-slate-600 font-medium">
                              Sin notificar
                            </span>
                          )}

                          {gradeData.isRead && (
                            <span className="ml-2 text-indigo-700 font-bold inline-flex items-center gap-1">
                              • <FileCheck className="w-3.5 h-3.5" /> Firmado de enterado
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSendNotification(student.id)}
                          disabled={!isGraded}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${notificationSuccess[student.id]
                            ? 'bg-emerald-600 text-white'
                            : !isGraded
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'bg-purple-600 text-white hover:bg-purple-700'
                            }`}
                        >
                          <Send className="w-3 h-3" />
                          {notificationSuccess[student.id]
                            ? '¡Notificado!'
                            : gradeData.isNotified
                              ? 'Reenviar'
                              : 'Enviar y Notificar'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer del Modal */}
            <div className="p-4 border-t border-purple-100 flex items-center justify-end bg-slate-50/60">
              <button
                onClick={() => setGradingTaskId(null)}
                className="px-5 py-2 rounded-2xl bg-purple-700 text-white font-bold text-xs shadow-xs hover:bg-purple-800 cursor-pointer"
              >
                Cerrar y Guardar Cambios
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CREAR NUEVA TAREA */}
      {/* ============================================================ */}
      {showNewTaskModal && currentClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-purple-100 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-800">Nueva Tarea Escolar</h3>
                <p className="text-xs text-slate-500">
                  Para: <strong className="text-purple-700">{currentClass.subjectName} ({currentClass.gradeName})</strong>
                </p>
              </div>
              <button
                onClick={() => setShowNewTaskModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nombre de la Tarea / Trabajo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Taller Práctico de Trigonometría"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-purple-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Fecha Límite de Entrega
                </label>
                <input
                  type="date"
                  required
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-purple-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descripción corta
                </label>
                <textarea
                  rows="2"
                  placeholder="Puntos a resolver, criterios de entrega..."
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-2xl border border-purple-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                ></textarea>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-purple-50">
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-md hover:bg-purple-700 cursor-pointer"
                >
                  Crear Tarea
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TOMAR ASISTENCIA DE LA CLASE */}
      {showAttendanceModal && currentClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-purple-100 overflow-hidden">
            <div className="p-5 border-b border-purple-100 flex items-center justify-between bg-purple-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <h3 className="text-base font-black text-slate-900">Control de Asistencia</h3>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  {currentClass.subjectName} · {currentClass.gradeName} ({currentClassStudents.length} estudiantes)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAttendanceModal(false)}
                className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAllAttendance} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200/60 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <label htmlFor="att-date" className="text-xs font-bold text-slate-700">Fecha:</label>
                  <input
                    id="att-date"
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => handleAttendanceDateChange(e.target.value)}
                    className="text-xs px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-400"
                  />
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  <span>Al marcar <strong>Ausente</strong>, se notificará al acudiente.</span>
                </div>
              </div>

              {attendanceSavedMessage && (
                <div className={`p-3 text-xs font-bold text-center ${attendanceSavedMessage.startsWith('Error') ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-800'}`}>
                  {attendanceSavedMessage}
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {currentClassStudents.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 py-8">No hay alumnos asignados a este curso.</p>
                ) : (
                  currentClassStudents.map((st) => {
                    const currentStatus = attendanceStatuses[st.id]?.status || 'presente';
                    const currentNote = attendanceStatuses[st.id]?.note || '';
                    return (
                      <div
                        key={st.id}
                        className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          currentStatus === 'ausente'
                            ? 'bg-rose-50/50 border-rose-200'
                            : currentStatus === 'tardanza'
                            ? 'bg-amber-50/50 border-amber-200'
                            : currentStatus === 'justificada'
                            ? 'bg-blue-50/50 border-blue-200'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 truncate">{st.name}</p>
                          <p className="text-[11px] text-slate-500">
                            Acudiente: <span className="font-semibold text-slate-700">{st.guardianName}</span>
                          </p>
                          {currentStatus === 'ausente' && (
                            <input
                              type="text"
                              placeholder="Observación opcional para el padre..."
                              value={currentNote}
                              onChange={(e) => {
                                const val = e.target.value;
                                setAttendanceStatuses(prev => ({
                                  ...prev,
                                  [st.id]: { ...prev[st.id], note: val }
                                }));
                              }}
                              className="mt-1.5 w-full text-[11px] px-2.5 py-1 rounded-xl border border-rose-200 bg-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-rose-400"
                            />
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setAttendanceStatuses(prev => ({
                                ...prev,
                                [st.id]: { ...prev[st.id], status: 'presente' }
                              }));
                            }}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              currentStatus === 'presente'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Presente
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAttendanceStatuses(prev => ({
                                ...prev,
                                [st.id]: { ...prev[st.id], status: 'ausente' }
                              }));
                            }}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              currentStatus === 'ausente'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Ausente
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAttendanceStatuses(prev => ({
                                ...prev,
                                [st.id]: { ...prev[st.id], status: 'tardanza' }
                              }));
                            }}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              currentStatus === 'tardanza'
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Tarde
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAttendanceStatuses(prev => ({
                                ...prev,
                                [st.id]: { ...prev[st.id], status: 'justificada' }
                              }));
                            }}
                            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              currentStatus === 'justificada'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Justificada
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-4 border-t border-purple-100 bg-white flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAttendanceModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="submit"
                  disabled={attendanceSaving || currentClassStudents.length === 0}
                  className="px-5 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-md hover:bg-purple-700 cursor-pointer disabled:opacity-50"
                >
                  {attendanceSaving ? 'Guardando...' : 'Guardar y Notificar Faltas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
