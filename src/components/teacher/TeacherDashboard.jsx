import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { generateAIEmpatheticMessage } from '../../utils/aiAssistant';
import {
  Calendar,
  BookOpen,
  Plus,
  Sparkles,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  GraduationCap,
  MessageSquare,
  FileCheck,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  X,
  Users,
  Check
} from 'lucide-react';

export default function TeacherDashboard() {
  const {
    teachers,
    activeTeacher,
    activeTeacherId,
    setActiveTeacherId,
    tasks,
    students,
    schedule,
    createTask,
    updateStudentGrade,
    notifyGuardian
  } = useApp();

  // Selector de profesor desplegable en la esquina izquierda
  const [showTeacherDropdown, setShowTeacherDropdown] = useState(false);

  // Pestaña activa principal: 'classes' (Clases y Tareas) | 'schedule' (Calendario)
  const [activeTab, setActiveTab] = useState('classes');

  // Filtros multinivel en pestañas:
  // 1) Grado (6, 7, 8, 9, 10, 11)
  // 2) Nivel / Sección (A, B, C...)
  // 3) Clase / Materia (la que dé el profe en ese salón)
  const [selectedGradeNum, setSelectedGradeNum] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState(null);
  
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

  // Día actual para resaltar (Viernes según fecha del sistema)
  const todayName = 'Viernes';

  // Mapa dinámico de clases asignadas según el profesor activo
  const teacherClassesMap = useMemo(() => ({
    't-carlos': [
      {
        id: 'cls-mat-9a',
        gradeNum: '9',
        section: 'A',
        subjectName: 'Matemáticas y Álgebra',
        gradeId: '9A',
        gradeName: 'Grado 9°A',
        salon: 'Aula 205 (Piso 2)',
        studentsCount: 8,
        isToday: true,
        todaySchedule: '07:00 - 08:30 AM',
        todayTopic: 'Ecuaciones cuadráticas por factorización',
        days: ['Lunes', 'Martes', 'Miércoles', 'Viernes'],
        color: 'purple'
      },
      {
        id: 'cls-dir-9a',
        gradeNum: '9',
        section: 'A',
        subjectName: 'Dirección de Grupo',
        gradeId: '9A',
        gradeName: 'Grado 9°A',
        salon: 'Aula 205 (Piso 2)',
        studentsCount: 8,
        isToday: true,
        todaySchedule: '12:00 - 01:30 PM',
        todayTopic: 'Evaluación de convivencia y acuerdos',
        days: ['Viernes'],
        color: 'fuchsia'
      },
      {
        id: 'cls-eti-9a',
        gradeNum: '9',
        section: 'A',
        subjectName: 'Ética y Valores',
        gradeId: '9A',
        gradeName: 'Grado 9°A',
        salon: 'Aula 205 (Piso 2)',
        studentsCount: 8,
        isToday: false,
        nextSchedule: 'Jueves (10:30 - 12:00 PM)',
        days: ['Jueves'],
        color: 'slate'
      },
      {
        id: 'cls-mat-9b',
        gradeNum: '9',
        section: 'B',
        subjectName: 'Matemáticas y Geometría',
        gradeId: '9B',
        gradeName: 'Grado 9°B',
        salon: 'Aula 206 (Piso 2)',
        studentsCount: 26,
        isToday: false,
        nextSchedule: 'Lunes (08:30 - 10:00 AM)',
        days: ['Lunes', 'Miércoles'],
        color: 'purple'
      },
      {
        id: 'cls-mat-8a',
        gradeNum: '8',
        section: 'A',
        subjectName: 'Matemáticas y Álgebra',
        gradeId: '8A',
        gradeName: 'Grado 8°A',
        salon: 'Aula 201 (Piso 2)',
        studentsCount: 30,
        isToday: false,
        nextSchedule: 'Lunes (07:00 - 08:30 AM)',
        days: ['Lunes', 'Jueves'],
        color: 'indigo'
      },
      {
        id: 'cls-mat-11a',
        gradeNum: '11',
        section: 'A',
        subjectName: 'Cálculo y Matemáticas',
        gradeId: '11A',
        gradeName: 'Grado 11°A',
        salon: 'Aula 305 (Piso 3)',
        studentsCount: 24,
        isToday: false,
        nextSchedule: 'Martes (10:30 - 12:00 PM)',
        days: ['Martes', 'Jueves'],
        color: 'slate'
      }
    ],
    't-diana': [
      {
        id: 'cls-cie-6a',
        gradeNum: '6',
        section: 'A',
        subjectName: 'Ciencias de la Tierra',
        gradeId: '6A',
        gradeName: 'Grado 6°A',
        salon: 'Aula 101 (Piso 1)',
        studentsCount: 28,
        isToday: false,
        nextSchedule: 'Lunes (10:30 - 12:00 PM)',
        days: ['Lunes', 'Jueves'],
        color: 'emerald'
      },
      {
        id: 'cls-cie-7b',
        gradeNum: '7',
        section: 'B',
        subjectName: 'Biología y Ecosistemas',
        gradeId: '7B',
        gradeName: 'Grado 7°B',
        salon: 'Aula 104 (Piso 1)',
        studentsCount: 26,
        isToday: false,
        nextSchedule: 'Martes (08:30 - 10:00 AM)',
        days: ['Martes', 'Viernes'],
        color: 'teal'
      },
      {
        id: 'cls-cie-9a',
        gradeNum: '9',
        section: 'A',
        subjectName: 'Ciencias Naturales y Biología',
        gradeId: '9A',
        gradeName: 'Grado 9°A',
        salon: 'Aula 205 (Piso 2)',
        studentsCount: 8,
        isToday: true,
        todaySchedule: '08:30 - 10:00 AM',
        todayTopic: 'Exposiciones sobre biomas colombianos',
        days: ['Lunes', 'Miércoles', 'Viernes'],
        color: 'emerald'
      },
      {
        id: 'cls-cie-9b',
        gradeNum: '9',
        section: 'B',
        subjectName: 'Educación Ambiental',
        gradeId: '9B',
        gradeName: 'Grado 9°B',
        salon: 'Aula 206 (Piso 2)',
        studentsCount: 26,
        isToday: false,
        nextSchedule: 'Jueves (08:30 - 10:00 AM)',
        days: ['Jueves'],
        color: 'teal'
      }
    ],
    't-marcela': [
      {
        id: 'cls-esp-9a',
        gradeNum: '9',
        section: 'A',
        subjectName: 'Lengua Castellana y Literatura',
        gradeId: '9A',
        gradeName: 'Grado 9°A',
        salon: 'Aula 205 (Piso 2)',
        studentsCount: 8,
        isToday: true,
        todaySchedule: '10:30 - 12:00 PM',
        todayTopic: 'Taller de oratoria y expresión',
        days: ['Lunes', 'Miércoles', 'Viernes'],
        color: 'amber'
      },
      {
        id: 'cls-esp-9b',
        gradeNum: '9',
        section: 'B',
        subjectName: 'Lectura Crítica',
        gradeId: '9B',
        gradeName: 'Grado 9°B',
        salon: 'Aula 206 (Piso 2)',
        studentsCount: 26,
        isToday: false,
        nextSchedule: 'Miércoles (08:30 - 10:00 AM)',
        days: ['Miércoles'],
        color: 'amber'
      },
      {
        id: 'cls-esp-10b',
        gradeNum: '10',
        section: 'B',
        subjectName: 'Literatura Clásica',
        gradeId: '10B',
        gradeName: 'Grado 10°B',
        salon: 'Aula 302 (Piso 3)',
        studentsCount: 25,
        isToday: false,
        nextSchedule: 'Martes (08:30 - 10:00 AM)',
        days: ['Martes'],
        color: 'orange'
      },
      {
        id: 'cls-esp-11a',
        gradeNum: '11',
        section: 'A',
        subjectName: 'Argumentación y Ensayos',
        gradeId: '11A',
        gradeName: 'Grado 11°A',
        salon: 'Aula 305 (Piso 3)',
        studentsCount: 24,
        isToday: false,
        nextSchedule: 'Jueves (07:00 - 08:30 AM)',
        days: ['Jueves'],
        color: 'amber'
      }
    ],
    't-andres': [
      {
        id: 'cls-ing-7b',
        gradeNum: '7',
        section: 'B',
        subjectName: 'Inglés A2 Básico',
        gradeId: '7B',
        gradeName: 'Grado 7°B',
        salon: 'Aula 104 (Piso 1)',
        studentsCount: 26,
        isToday: false,
        nextSchedule: 'Martes (12:00 - 01:30 PM)',
        days: ['Martes'],
        color: 'indigo'
      },
      {
        id: 'cls-ing-9a',
        gradeNum: '9',
        section: 'A',
        subjectName: 'Inglés B1 Competitivo',
        gradeId: '9A',
        gradeName: 'Grado 9°A',
        salon: 'Aula 205 (Piso 2)',
        studentsCount: 8,
        isToday: false,
        nextSchedule: 'Jueves (07:00 - 08:30 AM)',
        days: ['Lunes', 'Jueves'],
        color: 'blue'
      },
      {
        id: 'cls-ing-9b',
        gradeNum: '9',
        section: 'B',
        subjectName: 'Inglés Conversacional',
        gradeId: '9B',
        gradeName: 'Grado 9°B',
        salon: 'Aula 206 (Piso 2)',
        studentsCount: 26,
        isToday: false,
        nextSchedule: 'Viernes (12:00 - 01:30 PM)',
        days: ['Viernes'],
        color: 'blue'
      }
    ],
    't-carolina': [
      {
        id: 'cls-soc-8a',
        gradeNum: '8',
        section: 'A',
        subjectName: 'Geografía Colombiana',
        gradeId: '8A',
        gradeName: 'Grado 8°A',
        salon: 'Aula 201 (Piso 2)',
        studentsCount: 30,
        isToday: false,
        nextSchedule: 'Lunes (12:00 - 01:30 PM)',
        days: ['Lunes'],
        color: 'rose'
      },
      {
        id: 'cls-soc-9a',
        gradeNum: '9',
        section: 'A',
        subjectName: 'Ciencias Sociales e Historia',
        gradeId: '9A',
        gradeName: 'Grado 9°A',
        salon: 'Aula 205 (Piso 2)',
        studentsCount: 8,
        isToday: false,
        nextSchedule: 'Martes (07:00 - 08:30 AM)',
        days: ['Martes', 'Jueves'],
        color: 'rose'
      },
      {
        id: 'cls-soc-9b',
        gradeNum: '9',
        section: 'B',
        subjectName: 'Cátedra de Paz y Democracia',
        gradeId: '9B',
        gradeName: 'Grado 9°B',
        salon: 'Aula 206 (Piso 2)',
        studentsCount: 26,
        isToday: false,
        nextSchedule: 'Jueves (08:30 - 10:00 AM)',
        days: ['Jueves'],
        color: 'rose'
      }
    ],
    't-roberto': [
      {
        id: 'cls-tec-9a',
        gradeNum: '9',
        section: 'A',
        subjectName: 'Tecnología e Informática',
        gradeId: '9A',
        gradeName: 'Grado 9°A',
        salon: 'Aula 205 (Piso 2)',
        studentsCount: 8,
        isToday: false,
        nextSchedule: 'Martes (10:30 - 12:00 PM)',
        days: ['Martes', 'Jueves'],
        color: 'cyan'
      },
      {
        id: 'cls-tec-9b',
        gradeNum: '9',
        section: 'B',
        subjectName: 'Robótica y Pensamiento Computacional',
        gradeId: '9B',
        gradeName: 'Grado 9°B',
        salon: 'Aula 206 (Piso 2)',
        studentsCount: 26,
        isToday: false,
        nextSchedule: 'Viernes (07:00 - 08:30 AM)',
        days: ['Viernes'],
        color: 'cyan'
      },
      {
        id: 'cls-tec-10a',
        gradeNum: '10',
        section: 'A',
        subjectName: 'Diseño Digital y Web',
        gradeId: '10A',
        gradeName: 'Grado 10°A',
        salon: 'Aula 301 (Piso 3)',
        studentsCount: 27,
        isToday: false,
        nextSchedule: 'Lunes (10:30 - 12:00 PM)',
        days: ['Lunes'],
        color: 'cyan'
      },
      {
        id: 'cls-tec-10b',
        gradeNum: '10',
        section: 'B',
        subjectName: 'Programación y Algoritmos',
        gradeId: '10B',
        gradeName: 'Grado 10°B',
        salon: 'Aula 302 (Piso 3)',
        studentsCount: 25,
        isToday: false,
        nextSchedule: 'Miércoles (12:00 - 01:30 PM)',
        days: ['Miércoles'],
        color: 'cyan'
      }
    ]
  }), []);

  // Clases del profesor actualmente seleccionado
  const teacherClasses = teacherClassesMap[activeTeacherId] || teacherClassesMap['t-carlos'];

  // 1. Grados disponibles para este docente (6, 7, 8, 9, 10, 11)
  const availableGrades = useMemo(() => {
    const set = new Set(teacherClasses.map(c => c.gradeNum));
    const all = ['6', '7', '8', '9', '10', '11'];
    return all.filter(g => set.has(g));
  }, [teacherClasses]);

  // Grado activo resuelto (si no se ha seleccionado o no existe, toma el primero)
  const activeGradeNum = useMemo(() => {
    if (selectedGradeNum && availableGrades.includes(selectedGradeNum)) {
      return selectedGradeNum;
    }
    return availableGrades[0] || '9';
  }, [selectedGradeNum, availableGrades]);

  // 2. Secciones disponibles para el grado activo (A, B, C...)
  const availableSections = useMemo(() => {
    if (!activeGradeNum) return [];
    const set = new Set(
      teacherClasses.filter(c => c.gradeNum === activeGradeNum).map(c => c.section)
    );
    return ['A', 'B', 'C', 'D'].filter(s => set.has(s));
  }, [teacherClasses, activeGradeNum]);

  // Sección activa resuelta (si no se ha seleccionado o no existe en este grado, toma la primera)
  const activeSection = useMemo(() => {
    if (selectedSection && availableSections.includes(selectedSection)) {
      return selectedSection;
    }
    return availableSections[0] || 'A';
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

  // Handlers de selección por pestañas encadenadas
  const handleSelectGrade = (gradeNum) => {
    setSelectedGradeNum(gradeNum);
    // Auto-seleccionar la primera sección de ese nuevo grado
    const secs = teacherClasses.filter(c => c.gradeNum === gradeNum).map(c => c.section);
    const nextSec = secs[0] || 'A';
    setSelectedSection(nextSec);
    const classes = teacherClasses.filter(c => c.gradeNum === gradeNum && c.section === nextSec);
    setSelectedClassId(classes[0]?.id || null);
  };

  const handleSelectSection = (section) => {
    setSelectedSection(section);
    // Auto-seleccionar la primera clase de esa nueva sección
    const classes = teacherClasses.filter(c => c.gradeNum === activeGradeNum && c.section === section);
    setSelectedClassId(classes[0]?.id || null);
  };

  const handleSelectClass = (classId) => {
    setSelectedClassId(classId);
  };

  // Cambiar de profesor desde el menú: inicializa en la primera clase de ese profesor
  const handleSelectTeacher = (teacherId) => {
    setActiveTeacherId(teacherId);
    const nextClasses = teacherClassesMap[teacherId] || teacherClassesMap['t-carlos'];
    const firstGrade = nextClasses[0]?.gradeNum || '9';
    const firstSec = nextClasses[0]?.section || 'A';
    const firstClsId = nextClasses[0]?.id || null;
    setSelectedGradeNum(firstGrade);
    setSelectedSection(firstSec);
    setSelectedClassId(firstClsId);
    setActiveTab('classes');
    setGradingTaskId(null);
    setShowTeacherDropdown(false);
  };

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

  // Manejo de crear tarea
  const handleCreateTask = (e) => {
    e.preventDefault();
    if (!newTaskTitle || !newTaskDueDate) return;

    const created = createTask({
      title: newTaskTitle,
      subjectId: 'mat',
      gradeId: currentClass?.gradeId || '9A',
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
      
      {/* Barra Superior Limpia con selector de cuentas de profesores a la izquierda */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-purple-100/70">
        
        {/* Selector de cuenta docente (Esquina Izquierda) */}
        <div className="relative">
          <div
            onClick={() => setShowTeacherDropdown(!showTeacherDropdown)}
            className="group flex items-center gap-3 p-1.5 -ml-1.5 rounded-2xl hover:bg-purple-50/90 border border-transparent hover:border-purple-200 transition-all cursor-pointer"
            title="Haz clic para variar entre las cuentas de profesores"
          >
            <div className="relative shrink-0">
              <img
                src={activeTeacher.avatar}
                alt={activeTeacher.name}
                className="w-11 h-11 rounded-2xl object-cover border-2 border-purple-200 shadow-xs group-hover:border-purple-400 transition-colors"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-200"></span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight group-hover:text-purple-700 transition-colors">
                  {activeTeacher.name}
                </h2>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                  {activeTeacher.subject}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-50 group-hover:bg-purple-600 group-hover:text-white px-2.5 py-1 rounded-xl border border-purple-200 transition-all shadow-xs">
                  Cambiar docente <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTeacherDropdown ? 'rotate-180' : ''}`} />
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Presiona aquí para alternar cuentas de profesores o selecciona una clase para calificar.
              </p>
            </div>
          </div>

          {/* Menú Desplegable Flotante de Profesores con click outside */}
          {showTeacherDropdown && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowTeacherDropdown(false)}
              />
              <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-purple-100 p-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between px-3 py-2 border-b border-purple-50">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Cuentas de Profesores ({teachers.length})
                </span>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                  Activa: {activeTeacher.name.split(' ')[0]}
                </span>
              </div>

              <div className="space-y-1.5 mt-2 max-h-80 overflow-y-auto">
                {teachers.map((t) => {
                  const isCurrent = t.id === activeTeacherId;
                  return (
                    <button
                      key={t.id}
                      onClick={() => handleSelectTeacher(t.id)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-2xl text-left transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-purple-100/70 border border-purple-300 text-purple-950 font-bold shadow-xs'
                          : 'hover:bg-purple-50/60 text-slate-700 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={t.avatar}
                          alt={t.name}
                          className="w-10 h-10 rounded-xl object-cover border border-purple-200"
                        />
                        <div>
                          <div className="text-sm font-black text-slate-800 leading-snug">
                            {t.name}
                          </div>
                          <div className="text-xs text-purple-700 font-semibold">
                            {t.subject}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Cursos: {t.grades?.join(', ') || 'Varios'}
                          </div>
                        </div>
                      </div>

                      {isCurrent ? (
                        <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                          ✓
                        </div>
                      ) : (
                        <span className="text-xs font-bold text-purple-600 bg-white px-2 py-1 rounded-lg border border-purple-100">
                          Cambiar
                        </span>
                      )}
                    </button>
                  );
                })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Pestañas: Mis Clases / Calendario Semanal */}
        <div className="flex items-center gap-1.5 p-1 bg-purple-50/80 rounded-2xl border border-purple-100/90 self-start sm:self-auto">
          <button
            onClick={() => { setActiveTab('classes'); setSelectedClassId(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'classes' && !selectedClassId
                ? 'bg-white text-purple-950 shadow-xs border border-purple-200/60'
                : 'text-slate-600 hover:text-purple-700'
            }`}
          >
            <BookOpen className="w-4 h-4 text-purple-600" />
            Mis Clases Asignadas
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'schedule'
                ? 'bg-white text-purple-950 shadow-xs border border-purple-200/60'
                : 'text-slate-600 hover:text-purple-700'
            }`}
          >
            <Calendar className="w-4 h-4 text-purple-600" />
            Horario Semanal
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
                  className={`rounded-3xl transition-all duration-200 text-left ${
                    isCurrentDay
                      ? 'bg-purple-50/90 border-2 border-purple-500 shadow-lg shadow-purple-200/50 p-5 ring-4 ring-purple-100 md:-translate-y-1'
                      : 'bg-slate-50/70 border border-slate-200/70 p-4 opacity-85 hover:opacity-100'
                  }`}
                >
                  {/* Cabecera del día */}
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-purple-200/60">
                    <span className={`font-black text-sm uppercase tracking-wide ${
                      isCurrentDay ? 'text-purple-900 text-base' : 'text-slate-600'
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

                      const isTeacherClass = period.teacher.includes('Carlos Mendoza');

                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-2xl border transition-all ${
                            isCurrentDay && isTeacherClass
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
          
          {/* Tarjeta de Pestañas Jerárquicas */}
          <div className="bg-white p-5 sm:p-6 rounded-3xl border-2 border-purple-200/80 shadow-xs space-y-5">
            
            {/* 1. Pestañas de Grado (6, 7, 8, 9, 10, 11) */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[11px] font-bold">1</span>
                  Pestaña de Grado:
                </span>
                {selectedGradeNum && (
                  <span className="text-xs font-extrabold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100">
                    Grado {selectedGradeNum}°
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                {availableGrades.map((gradeNum) => {
                  const isSelected = selectedGradeNum === gradeNum;
                  return (
                    <button
                      key={gradeNum}
                      onClick={() => handleSelectGrade(gradeNum)}
                      className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-300/40 ring-2 ring-purple-300 scale-105'
                          : 'bg-slate-50 text-slate-700 hover:bg-purple-50 hover:text-purple-800 border border-slate-200/80'
                      }`}
                    >
                      Grado {gradeNum}°
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Pestañas de Nivel / Sección (A, B, C...) */}
            {selectedGradeNum && (
              <div className="pt-4 border-t border-purple-100/80 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px] font-bold">2</span>
                    Nivel del Grado (Sección / Grupo):
                  </span>
                  {selectedSection && (
                    <span className="text-xs font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                      Curso: {selectedGradeNum}°{selectedSection}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                  {availableSections.map((sec) => {
                    const isSelected = selectedSection === sec;
                    return (
                      <button
                        key={sec}
                        onClick={() => handleSelectSection(sec)}
                        className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-300/40 ring-2 ring-indigo-300 scale-105'
                            : 'bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:text-indigo-800 border border-slate-200/80'
                        }`}
                      >
                        Sección {sec} ({selectedGradeNum}°{sec})
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 3. Pestañas de Clase / Materia del Profesor */}
            {selectedGradeNum && selectedSection && (
              <div className="pt-4 border-t border-purple-100/80 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-fuchsia-600 text-white flex items-center justify-center text-[11px] font-bold">3</span>
                    Clase que dicta {activeTeacher.name.split(' ')[0]} en {selectedGradeNum}°{selectedSection}:
                  </span>
                  {currentClass && (
                    <span className="text-xs font-extrabold text-fuchsia-700 bg-fuchsia-50 px-2.5 py-0.5 rounded-full border border-fuchsia-100">
                      {currentClass.salon}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {availableClasses.map((cls) => {
                    const isSelected = selectedClassId === cls.id;
                    return (
                      <button
                        key={cls.id}
                        onClick={() => handleSelectClass(cls.id)}
                        className={`px-4 py-3 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer text-left flex items-center gap-3 ${
                          isSelected
                            ? 'bg-linear-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-300/40 ring-2 ring-purple-300 scale-[1.02]'
                            : 'bg-slate-50 text-slate-700 hover:bg-purple-50 hover:text-purple-900 border border-slate-200/80'
                        }`}
                      >
                        <BookOpen className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-purple-600'}`} />
                        <div>
                          <span className="block leading-snug">{cls.subjectName}</span>
                          <span className={`text-[10px] font-medium block mt-0.5 ${isSelected ? 'text-purple-200' : 'text-slate-500'}`}>
                            {cls.salon} • {cls.studentsCount} Alumnos inscritos
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

          {/* 4. Y AHÍ SÍ LAS TAREAS DE ESA CLASE */}
          {currentClass && (
            <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-base">
                    Tareas y Trabajos de {currentClass.subjectName} — {currentClass.gradeName} ({classTasks.length})
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    Haz clic en una tarea para desplegar y calificar a los alumnos
                  </p>
                </div>
                <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200 self-start sm:self-auto">
                  {currentClass.studentsCount} Alumnos matriculados
                </span>
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
                          <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full shadow-xs shrink-0 ${
                            isFullyNotified
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

              {/* BOTÓN FLOTANTE INFERIOR DE NUEVA TAREA */}
              <div className="fixed bottom-6 right-6 sm:right-10 z-40">
                <button
                  onClick={() => setShowNewTaskModal(true)}
                  className="flex items-center gap-2.5 px-5 py-3.5 rounded-full bg-linear-to-r from-purple-600 to-indigo-600 text-white font-black text-sm shadow-xl shadow-purple-500/30 hover:scale-105 hover:from-purple-700 hover:to-indigo-700 transition-all cursor-pointer"
                >
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                  Nueva Tarea
                </button>
              </div>

            </div>
          )}

          {/* Mensajes guía cuando falta seleccionar algún nivel */}
          {!selectedGradeNum && (
            <div className="p-8 bg-purple-50/50 rounded-3xl border border-purple-100 text-center space-y-2">
              <p className="text-sm font-bold text-slate-700">
                👆 Paso 1: Selecciona el Grado (6, 7, 8, 9, 10, 11) en las pestañas de arriba
              </p>
              <p className="text-xs text-slate-500">
                Podrás ver las secciones y las materias asignadas a este docente.
              </p>
            </div>
          )}

          {selectedGradeNum && !selectedSection && (
            <div className="p-8 bg-indigo-50/40 rounded-3xl border border-indigo-100 text-center space-y-2">
              <p className="text-sm font-bold text-slate-700">
                👆 Paso 2: Selecciona el Nivel / Sección (A, B...) para Grado {selectedGradeNum}°
              </p>
              <p className="text-xs text-slate-500">
                Para consultar las clases disponibles en ese salón.
              </p>
            </div>
          )}

          {selectedGradeNum && selectedSection && !selectedClassId && (
            <div className="p-8 bg-fuchsia-50/40 rounded-3xl border border-fuchsia-100 text-center space-y-2">
              <p className="text-sm font-bold text-slate-700">
                👆 Paso 3: Selecciona la Clase del profesor en {selectedGradeNum}°{selectedSection}
              </p>
              <p className="text-xs text-slate-500">
                Haz clic sobre la clase para desplegar sus tareas y trabajos pendientes.
              </p>
            </div>
          )}

        </div>
      )}

      {/* ============================================================ */}
      {/* VISTA 4: MENÚ / DESPLIEGUE DE CALIFICACIÓN DE ALUMNOS (MODAL ENFOCADO) */}
      {/* ============================================================ */}
      {gradingTaskId && currentGradingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-purple-100 overflow-hidden">
            
            {/* Cabecera del Menú de Calificación */}
            <div className="p-5 sm:p-6 border-b border-purple-100 flex items-start justify-between gap-4 bg-purple-50/40">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-purple-200 text-purple-900">
                    {currentGradingTask.gradeName} - {currentGradingTask.subjectName}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">
                    Fecha límite: {currentGradingTask.dueDate}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-800 mt-1">
                  Calificación de Alumnos: {currentGradingTask.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Asigna la nota rápida (≥3.0 verde, &lt;3.0 rojo), adapta el mensaje con IA y notifica al acudiente.
                </p>
              </div>

              <button
                onClick={() => setGradingTaskId(null)}
                className="w-9 h-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-slate-200 cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Leyenda de semáforo */}
            <div className="px-6 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span className="font-bold text-slate-700">Criterio Visual:</span>
              <div className="flex items-center gap-4">
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
                const isFailed = isGraded && score < 3.0;

                return (
                  <div
                    key={student.id}
                    className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                      student.isTargetStudent
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
                                Nataly
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
                          className={`w-16 py-1.5 text-center text-base font-black rounded-xl border-2 transition-all focus:outline-hidden ${
                            !isGraded
                              ? 'border-slate-200 bg-slate-50 text-slate-600'
                              : isApproved
                              ? 'border-emerald-400 bg-emerald-50 text-emerald-800'
                              : 'border-rose-400 bg-rose-50 text-rose-800'
                          }`}
                        />

                        {isGraded && (
                          <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                            isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
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
                          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            notificationSuccess[student.id]
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

    </div>
  );
}
