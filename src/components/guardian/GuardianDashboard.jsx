import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import confetti from 'canvas-confetti';
import {
  HeartHandshake,
  Calendar,
  Award,
  BookOpen,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Clock,
  User,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Info,
  Layers,
  Phone,
  Mail,
  Bell
} from 'lucide-react';

export default function GuardianDashboard() {
  const {
    students,
    tasks,
    schedule,
    activeStudentId,
    setActiveStudentId,
    confirmReadNotification
  } = useApp();

  const [activeTab, setActiveTab] = useState('grades'); // 'grades', 'schedule'
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('ALL');
  const [justConfirmedTaskId, setJustConfirmedTaskId] = useState(null);

  const activeStudent = students.find(s => s.id === activeStudentId) || students[0];

  // Extraer todas las tareas donde este estudiante tenga notas o esté inscrito
  const studentTasks = useMemo(() => {
    return tasks.map(task => {
      const studentGrade = task.studentGrades?.[activeStudent.id] || null;
      return {
        ...task,
        studentGrade
      };
    }).filter(t => {
      if (selectedSubjectFilter === 'ALL') return true;
      return t.subjectId === selectedSubjectFilter;
    });
  }, [tasks, activeStudent.id, selectedSubjectFilter]);

  // Cálculo de promedio acumulado del estudiante
  const { averageScore, gradedCount, approvedCount, failedCount } = useMemo(() => {
    let total = 0;
    let count = 0;
    let approved = 0;
    let failed = 0;

    tasks.forEach(task => {
      const grade = task.studentGrades?.[activeStudent.id]?.score;
      if (grade !== null && grade !== undefined) {
        total += grade;
        count++;
        if (grade >= 3.0) approved++;
        else failed++;
      }
    });

    return {
      averageScore: count > 0 ? (total / count).toFixed(1) : '0.0',
      gradedCount: count,
      approvedCount: approved,
      failedCount: failed
    };
  }, [tasks, activeStudent.id]);

  // Manejador de confirmación de lectura / firma
  const handleConfirmSignature = (taskId) => {
    confirmReadNotification(taskId, activeStudent.id);
    setJustConfirmedTaskId(taskId);

    // Lanzar efecto de confeti suave de celebración pedagógica
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#A78BFA', '#DDD6FE', '#10B981', '#F472B6']
      });
    } catch (e) {
      // Ignorar si confetti falla
    }

    setTimeout(() => {
      setJustConfirmedTaskId(null);
    }, 4000);
  };

  // Tareas notificadas pero no leídas
  const pendingNotificationTasks = studentTasks.filter(
    t => t.studentGrade && t.studentGrade.isNotified && !t.studentGrade.isRead
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Cabecera Limpia Rol Acudiente */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-purple-100/70">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-fuchsia-600"></span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              Seguimiento Escolar: {activeStudent.name}
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-fuchsia-50 text-fuchsia-800 border border-fuchsia-200">
              Grado {activeStudent.gradeName}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Acudiente titular: <strong className="text-slate-700">{activeStudent.guardianName}</strong> ({activeStudent.guardianKinship})
          </p>
        </div>

        {/* Selector de Estudiante Limpio */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-bold text-slate-500">Hijo(a):</span>
          <select
            value={activeStudentId}
            onChange={(e) => setActiveStudentId(e.target.value)}
            className="bg-white text-slate-800 font-bold px-3 py-1.5 rounded-xl border border-purple-200 text-xs focus:ring-2 focus:ring-fuchsia-400 cursor-pointer shadow-xs"
          >
            {students.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.gradeName})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Aviso Aclaratorio 100% Informativo */}
      <div className="p-4 rounded-3xl bg-purple-50/80 border border-purple-200/70 flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-2xl bg-purple-200 flex items-center justify-center text-purple-800 shrink-0">
          <Info className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-extrabold text-purple-900 uppercase tracking-wider">
            Canal de Consulta en Tiempo Real (Solo Informativo)
          </h4>
          <p className="text-xs text-purple-800/90 mt-0.5 leading-relaxed">
            Este portal está diseñado exclusivamente para consultar avances escolares, plan de clases y calificaciones inmediatas. No requiere subir tareas ni documentos, garantizando transparencia y tranquilidad para el hogar.
          </p>
        </div>
      </div>

      {/* Alerta Destacada si hay tareas sin confirmar lectura */}
      {pendingNotificationTasks.length > 0 && (
        <div className="p-5 rounded-3xl bg-amber-50 border-2 border-amber-300 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-200 flex items-center justify-center text-amber-800 shrink-0">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h4 className="font-extrabold text-amber-900 text-sm">
                Tienes {pendingNotificationTasks.length} aviso(s) académico(s) pendiente(s) de confirmación
              </h4>
              <p className="text-xs text-amber-800">
                El docente ha publicado nuevas calificaciones y observaciones. Por favor revisa y firma de enterado.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('grades')}
            className="px-4 py-2 rounded-2xl bg-amber-600 text-white font-bold text-xs shadow-xs hover:bg-amber-700 cursor-pointer self-end sm:self-auto"
          >
            Revisar en Ficha de Notas
          </button>
        </div>
      )}

      {/* Métricas del Estudiante Activo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-3xl border border-purple-100/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Promedio General</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-emerald-700">{averageScore} <span className="text-sm font-bold text-slate-600">/ 5.0</span></div>
            <p className="text-xs text-emerald-600 font-semibold mt-1">Desempeño Aprobatorio</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-purple-100/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Trabajos Calificados</span>
            <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
              <FileCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-slate-800">{gradedCount}</div>
            <p className="text-xs text-slate-600 mt-1">En el periodo actual</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-purple-100/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Actividades Aprobadas</span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-indigo-700">{approvedCount}</div>
            <p className="text-xs text-indigo-600 font-semibold mt-1">≥ 3.0 Puntos</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-purple-100/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Acudiente Titular</span>
            <div className="w-10 h-10 rounded-2xl bg-fuchsia-50 flex items-center justify-center text-fuchsia-600">
              <User className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-sm font-black text-slate-800 truncate">{activeStudent.guardianName}</div>
            <p className="text-xs text-fuchsia-700 font-bold mt-1">{activeStudent.guardianKinship} • Activa</p>
          </div>
        </div>
      </div>

      {/* Selector de Pestañas: Ficha de Notas / Calendario Semanal */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-purple-100 pb-4">
        <div className="flex items-center gap-2 p-1.5 bg-purple-50/70 rounded-2xl border border-purple-100/80 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('grades')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'grades'
                ? 'bg-white text-purple-900 shadow-xs border border-purple-200/60'
                : 'text-slate-600 hover:text-purple-700'
            }`}
          >
            <Award className="w-4 h-4 text-purple-600" />
            Ficha de Notas en Tiempo Real ({studentTasks.length})
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'schedule'
                ? 'bg-white text-purple-900 shadow-xs border border-purple-200/60'
                : 'text-slate-600 hover:text-purple-700'
            }`}
          >
            <Calendar className="w-4 h-4 text-purple-600" />
            Calendario y Horario Semanal
          </button>
        </div>

        {activeTab === 'grades' && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-slate-600">Materia:</span>
            <select
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              className="px-3 py-2 text-xs sm:text-sm bg-white rounded-2xl border border-purple-100 text-slate-700 font-semibold focus:ring-2 focus:ring-purple-400 cursor-pointer"
            >
              <option value="ALL">Todas las asignaturas</option>
              <option value="mat">Matemáticas y Álgebra</option>
              <option value="cie">Ciencias Naturales</option>
              <option value="esp">Lengua Castellana</option>
            </select>
          </div>
        )}
      </div>

      {/* PESTAÑA 1: FICHA DE NOTAS EN TIEMPO REAL */}
      {activeTab === 'grades' && (
        <div className="space-y-6">
          
          {/* Leyenda Visual */}
          <div className="flex items-center justify-between p-4 bg-white rounded-3xl border border-purple-100 text-xs text-slate-600">
            <span className="font-bold text-slate-700">Estado de Calificaciones:</span>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700">
                <span className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-emerald-200"></span>
                ≥ 3.0 Aprobado (Verde)
              </span>
              <span className="inline-flex items-center gap-1.5 font-bold text-rose-700">
                <span className="w-3 h-3 rounded-full bg-rose-500 ring-2 ring-rose-200"></span>
                &lt; 3.0 Reprobado (Rojo)
              </span>
            </div>
          </div>

          {/* Lista de Tareas y Notas */}
          <div className="space-y-5">
            {studentTasks.map((task) => {
              const gradeData = task.studentGrade;
              const score = gradeData?.score;
              const hasScore = score !== null && score !== undefined;
              const isApproved = hasScore && score >= 3.0;
              const isFailed = hasScore && score < 3.0;
              const isRead = gradeData?.isRead;
              const isJustConfirmed = justConfirmedTaskId === task.id;

              return (
                <div
                  key={task.id}
                  className={`bg-white rounded-3xl border p-6 transition-all duration-200 ${
                    hasScore && isApproved
                      ? 'border-emerald-200/80 shadow-xs hover:border-emerald-300'
                      : hasScore && isFailed
                      ? 'border-rose-200/80 shadow-xs hover:border-rose-300'
                      : 'border-purple-100 shadow-xs'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                    
                    {/* Detalles de la Tarea y Materia */}
                    <div className="space-y-3 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 rounded-xl text-xs font-black bg-purple-50 text-purple-700 border border-purple-100">
                          {task.subjectName}
                        </span>
                        <span className="text-xs text-slate-600 font-medium">
                          Docente: {task.teacherName}
                        </span>
                        <span className="text-xs text-slate-600">• Límite: {task.dueDate}</span>
                      </div>

                      <h3 className="text-lg font-black text-slate-800">
                        {task.title}
                      </h3>

                      <p className="text-xs text-slate-600 leading-relaxed">
                        {task.description}
                      </p>

                      {/* Observación informal del profesor */}
                      {gradeData?.teacherNote && (
                        <div className="p-3 bg-slate-50/90 rounded-2xl border border-slate-200/70 text-xs">
                          <span className="font-bold text-slate-700 block mb-0.5">
                            Comentario directo del docente:
                          </span>
                          <span className="text-slate-600">{gradeData.teacherNote}</span>
                        </div>
                      )}

                      {/* Mensaje Adaptado por la IA */}
                      {gradeData?.aiMessage ? (
                        <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200/80 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-purple-800">
                              <Sparkles className="w-4 h-4 text-purple-600" />
                              Mensaje adaptado con IA para el hogar:
                            </span>
                            <span className="text-[10px] text-purple-600 font-bold bg-white px-2 py-0.5 rounded-full border border-purple-100">
                              Comunicación Asertiva
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-800 italic leading-relaxed bg-white/90 p-3 rounded-xl border border-purple-100">
                            "{gradeData.aiMessage}"
                          </p>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-600 italic">
                          (El docente aún no ha emitido mensaje personalizado con IA).
                        </div>
                      )}
                    </div>

                    {/* Tarjeta de Calificación y Acción de Firma */}
                    <div className="lg:w-72 shrink-0 flex flex-col justify-between gap-4 p-5 rounded-2xl bg-slate-50/80 border border-slate-100">
                      
                      {/* Nota Definitiva */}
                      <div className="text-center space-y-1">
                        <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block">
                          Calificación Definitiva
                        </span>

                        {hasScore ? (
                          <div className="space-y-1">
                            <div className={`text-4xl font-black ${
                              isApproved ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              {score.toFixed(1)}
                            </div>
                            <div className="inline-block">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                isApproved
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}>
                                {isApproved ? 'Aprobado' : 'Reprobado / Alerta'}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="py-3">
                            <span className="text-slate-600 text-sm font-semibold">Pendiente de calificar</span>
                          </div>
                        )}
                      </div>

                      {/* Estado de Notificación y Botón de Firma */}
                      <div className="space-y-2 pt-3 border-t border-slate-200/60">
                        {gradeData?.isNotified && (
                          <div className="text-[11px] text-slate-600 text-center">
                            Notificado el {gradeData.notifiedAt}
                          </div>
                        )}

                        {isRead || isJustConfirmed ? (
                          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-1 animate-in zoom-in-95 duration-200">
                            <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-800">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              Firma Confirmada
                            </span>
                            <p className="text-[10px] text-emerald-700 leading-tight">
                              Firmado por {activeStudent.guardianName} ({gradeData?.readAt || 'Hoy'})
                            </p>
                          </div>
                        ) : gradeData?.isNotified ? (
                          <button
                            onClick={() => handleConfirmSignature(task.id)}
                            className="w-full py-2.5 px-4 rounded-2xl bg-linear-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs shadow-md hover:from-purple-700 hover:to-indigo-700 transition-all cursor-pointer transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
                          >
                            <FileCheck className="w-4 h-4" />
                            Confirmar lectura / Firmar
                          </button>
                        ) : (
                          <div className="text-center text-xs text-slate-600 font-medium py-1">
                            Aún no notificado por el docente
                          </div>
                        )}
                      </div>

                    </div>

                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* PESTAÑA 2: CALENDARIO Y HORARIO SEMANAL */}
      {activeTab === 'schedule' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-purple-100/80 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-purple-50">
              <div>
                <h3 className="text-lg font-bold text-slate-800">
                  Plan Semanal de Materias y Trabajos del Alumno
                </h3>
                <p className="text-xs text-slate-600">
                  Revise los horarios diarios de {activeStudent.name} y los compromisos dejados para cada fecha.
                </p>
              </div>
              <span className="px-3 py-1 bg-purple-50 text-purple-700 font-bold text-xs rounded-full border border-purple-100 self-start sm:self-auto">
                Grado {activeStudent.gradeName} - Salón 205
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-6 items-start">
              {schedule.map((dayPlan) => {
                const isCurrentDay = dayPlan.day.toLowerCase() === 'viernes';

                return (
                  <div
                    key={dayPlan.day}
                    className={`rounded-3xl transition-all duration-200 text-left ${
                      isCurrentDay
                        ? 'bg-purple-50/90 border-2 border-purple-500 shadow-lg shadow-purple-200/50 p-5 ring-4 ring-purple-100 md:-translate-y-1'
                        : 'bg-slate-50/70 border border-slate-200/70 p-4 opacity-85 hover:opacity-100'
                    }`}
                  >
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

                    <div className="space-y-2.5">
                      {dayPlan.periods.map((period, idx) => {
                        if (period.isBreak) {
                          return (
                            <div key={idx} className="p-2 bg-amber-50 rounded-xl text-center border border-amber-100 text-[10px] font-bold text-amber-800">
                              ☕ {period.label}
                            </div>
                          );
                        }

                        return (
                          <div
                            key={idx}
                            className={`p-3 rounded-2xl border text-left transition-all ${
                              isCurrentDay
                                ? 'bg-white border-purple-300 shadow-xs ring-1 ring-purple-200'
                                : 'bg-white/90 border-slate-200/70'
                            }`}
                          >
                            <span className="text-[10px] font-mono text-slate-500 block font-bold">{period.time}</span>
                            <h5 className="font-bold text-xs text-slate-800 mt-0.5 leading-snug">{period.subject}</h5>
                            <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">{period.topic}</p>
                            {period.homeworkDue && (
                              <div className="mt-2 pt-1.5 border-t border-purple-50 flex items-center gap-1 text-[10px] font-bold text-fuchsia-700">
                                <BookOpen className="w-3 h-3 text-fuchsia-500 shrink-0" />
                                Trabajo: {period.homeworkDue}
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
        </div>
      )}

    </div>
  );
}
