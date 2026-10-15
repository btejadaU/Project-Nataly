import React, { useState, useMemo } from 'react';
import {
  Scale,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  BookOpen,
  ArrowLeft,
  User,
  Calendar,
  AlertCircle,
  Eye,
  SlidersHorizontal
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import GradeAppealBadge from '../common/GradeAppealBadge';
import { APPEAL_STATUS } from '../../utils/appealsStorage';

export default function TeacherAppealsView({
  appeals = [],
  students = [],
  tasks = [],
  subjects = [],
  grades = [],
  teacherClasses = [],
  activeTeacherId,
  onOpenAppealModal,
  onBackToClasses
}) {
  const { teacherClassesMap } = useApp ? useApp() : {};
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('ALL');
  const [selectedSubjectId, setSelectedSubjectId] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  const activeTeacherClasses = useMemo(() => {
    if (teacherClasses && teacherClasses.length > 0) return teacherClasses;
    if (teacherClassesMap && activeTeacherId && teacherClassesMap[activeTeacherId]) {
      return teacherClassesMap[activeTeacherId];
    }
    return [];
  }, [teacherClasses, teacherClassesMap, activeTeacherId]);

  // Enriquecer apelaciones con datos de estudiante, tarea, curso y materia
  const enrichedAppeals = useMemo(() => {
    const studentMap = new Map(students.map(s => [s.id, s]));
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    const subjectMap = new Map(subjects.map(s => [s.id, s]));
    const gradeMap = new Map(grades.map(g => [g.id, g]));

    return appeals
      .filter(appeal => {
        const task = taskMap.get(appeal.assignment_id || appeal.taskId);
        const tId = appeal.teacher_id || appeal.teacherId || task?.teacherId;
        if (activeTeacherId && tId && String(tId) !== String(activeTeacherId)) {
          return false;
        }
        return true;
      })
      .map(appeal => {
        const student = studentMap.get(appeal.student_id || appeal.studentId);
        const task = taskMap.get(appeal.assignment_id || appeal.taskId);
        const subject = subjectMap.get(appeal.subject_id || appeal.subjectId || task?.subjectId);
        const course = gradeMap.get(appeal.class_group_id || appeal.gradeId || student?.gradeId || task?.gradeId);

        const score = task?.studentGrades?.[student?.id]?.score ?? appeal.score ?? null;

        return {
          ...appeal,
          studentName: student?.name || 'Estudiante',
          studentAvatar: student?.avatar || null,
          guardianName: student?.guardianName || 'Acudiente',
          courseName: course?.name || student?.gradeName || task?.gradeName || 'Curso',
          courseId: course?.id || student?.gradeId || task?.gradeId,
          subjectName: subject?.name || task?.subjectName || 'Materia',
          subjectId: subject?.id || task?.subjectId,
          taskTitle: task?.title || 'Actividad',
          score,
          rawStudent: student,
          rawTask: task
        };
      });
  }, [appeals, students, tasks, subjects, grades, activeTeacherId]);

  // Contadores KPI
  const stats = useMemo(() => {
    const total = enrichedAppeals.length;
    const pending = enrichedAppeals.filter(a => (a.estado || a.status) === APPEAL_STATUS.EN_REVISION).length;
    const accepted = enrichedAppeals.filter(a => (a.estado || a.status) === APPEAL_STATUS.REVISION_ACEPTADA).length;
    const rejected = enrichedAppeals.filter(a => (a.estado || a.status) === APPEAL_STATUS.REVISION_RECHAZADA).length;
    return { total, pending, accepted, rejected };
  }, [enrichedAppeals]);

  // Filtros aplicados
  const filteredAppeals = useMemo(() => {
    return enrichedAppeals.filter(appeal => {
      // Filtro por Grado / Curso
      if (selectedCourseId !== 'ALL' && appeal.courseId !== selectedCourseId) {
        return false;
      }
      // Filtro por Materia
      if (selectedSubjectId !== 'ALL' && appeal.subjectId !== selectedSubjectId) {
        return false;
      }
      // Filtro por Estado
      const status = appeal.estado || appeal.status;
      if (selectedStatus === 'PENDING' && status !== APPEAL_STATUS.EN_REVISION) {
        return false;
      }
      if (selectedStatus === 'ACCEPTED' && status !== APPEAL_STATUS.REVISION_ACEPTADA) {
        return false;
      }
      if (selectedStatus === 'REJECTED' && status !== APPEAL_STATUS.REVISION_RECHAZADA) {
        return false;
      }

      // Buscador por nombre de estudiante
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = (appeal.studentName || '').toLowerCase().includes(query);
        const matchesTask = (appeal.taskTitle || '').toLowerCase().includes(query);
        const matchesSubject = (appeal.subjectName || '').toLowerCase().includes(query);
        if (!matchesName && !matchesTask && !matchesSubject) {
          return false;
        }
      }

      return true;
    });
  }, [enrichedAppeals, selectedCourseId, selectedSubjectId, selectedStatus, searchTerm]);

  // Listas de salones y materias vinculadas EXCLUSIVAMENTE al docente autenticado
  const availableCourses = useMemo(() => {
    const courseMap = new Map();
    activeTeacherClasses.forEach(cls => {
      if (cls.gradeId) {
        courseMap.set(cls.gradeId, {
          id: cls.gradeId,
          name: cls.gradeName || `${cls.gradeNum}° ${cls.section || ''}`
        });
      }
    });
    enrichedAppeals.forEach(a => {
      if (a.courseId && !courseMap.has(a.courseId)) {
        courseMap.set(a.courseId, {
          id: a.courseId,
          name: a.courseName
        });
      }
    });
    return Array.from(courseMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [activeTeacherClasses, enrichedAppeals]);

  const availableSubjects = useMemo(() => {
    const subjectMap = new Map();
    activeTeacherClasses.forEach(cls => {
      if (cls.subjectId) {
        subjectMap.set(cls.subjectId, {
          id: cls.subjectId,
          name: cls.subjectName
        });
      }
    });
    enrichedAppeals.forEach(a => {
      if (a.subjectId && !subjectMap.has(a.subjectId)) {
        subjectMap.set(a.subjectId, {
          id: a.subjectId,
          name: a.subjectName
        });
      }
    });
    return Array.from(subjectMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [activeTeacherClasses, enrichedAppeals]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Cabecera de la sección */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-purple-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 shrink-0" />
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              Gestión de Notas Apeladas
            </h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200">
              {stats.pending} pendientes
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Historial y solicitudes de revisión de calificaciones recibidas de los acudientes.
          </p>
        </div>

        {onBackToClasses && (
          <button
            type="button"
            onClick={onBackToClasses}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a Mis Clases
          </button>
        )}
      </div>

      {/* Tarjetas KPI de Estado */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setSelectedStatus('ALL')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer shadow-2xs ${selectedStatus === 'ALL'
              ? 'bg-purple-50/70 border-purple-300 ring-2 ring-purple-200'
              : 'bg-white border-slate-200 hover:border-purple-300'
            }`}
          title="Ver todas las solicitudes (Todos los estados)"
        >
          <span className={`text-[10px] font-bold uppercase tracking-wider block ${selectedStatus === 'ALL' ? 'text-purple-700' : 'text-slate-400'
            }`}>
            Total Solicitudes
          </span>
          <div className="flex items-center justify-between mt-1">
            <strong className={`text-2xl font-black ${selectedStatus === 'ALL' ? 'text-purple-900' : 'text-slate-800'
              }`}>{stats.total}</strong>
            <Scale className={`w-5 h-5 ${selectedStatus === 'ALL' ? 'text-purple-600' : 'text-purple-500 opacity-60'
              }`} />
          </div>
        </button>

        <div
          onClick={() => setSelectedStatus(selectedStatus === 'PENDING' ? 'ALL' : 'PENDING')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs ${selectedStatus === 'PENDING'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-200'
              : 'bg-white border-slate-200 hover:border-amber-300'
            }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
            En Revisión (Pendientes)
          </span>
          <div className="flex items-center justify-between mt-1">
            <strong className="text-2xl font-black text-amber-800">{stats.pending}</strong>
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
        </div>

        <div
          onClick={() => setSelectedStatus(selectedStatus === 'ACCEPTED' ? 'ALL' : 'ACCEPTED')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs ${selectedStatus === 'ACCEPTED'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-200'
              : 'bg-white border-slate-200 hover:border-emerald-300'
            }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">
            Aceptadas
          </span>
          <div className="flex items-center justify-between mt-1">
            <strong className="text-2xl font-black text-emerald-800">{stats.accepted}</strong>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
        </div>

        <div
          onClick={() => setSelectedStatus(selectedStatus === 'REJECTED' ? 'ALL' : 'REJECTED')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-2xs ${selectedStatus === 'REJECTED'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-200'
              : 'bg-white border-slate-200 hover:border-rose-300'
            }`}
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
            Rechazadas
          </span>
          <div className="flex items-center justify-between mt-1">
            <strong className="text-2xl font-black text-rose-800">{stats.rejected}</strong>
            <XCircle className="w-5 h-5 text-rose-600" />
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 pb-2 border-b border-slate-100">
          <SlidersHorizontal className="w-4 h-4 text-purple-600" />
          <span>Filtros y Búsqueda de Apelaciones</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Buscador */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por estudiante o tarea..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white text-slate-800 transition-all"
            />
          </div>

          {/* Filtro Grado / Curso */}
          <div>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-400 text-slate-800 cursor-pointer"
            >
              <option value="ALL">Todos los grados y cursos</option>
              {availableCourses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Materia */}
          <div>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-400 text-slate-800 cursor-pointer"
            >
              <option value="ALL">Todas las materias</option>
              {availableSubjects.map(subj => (
                <option key={subj.id} value={subj.id}>
                  {subj.name}
                </option>
              ))}
            </select>
          </div>


        </div>
      </div>

      {/* Listado de Apelaciones */}
      {filteredAppeals.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center mx-auto text-purple-600">
            <Scale className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-slate-800">
            No se encontraron apelaciones
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchTerm || selectedCourseId !== 'ALL' || selectedSubjectId !== 'ALL' || selectedStatus !== 'ALL'
              ? 'No hay registros que coincidan con los filtros seleccionados. Intenta restablecer los filtros.'
              : 'Aún no has recibido solicitudes de revisión de calificaciones por parte de los acudientes.'}
          </p>
          {(searchTerm || selectedCourseId !== 'ALL' || selectedSubjectId !== 'ALL' || selectedStatus !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setSelectedCourseId('ALL');
                setSelectedSubjectId('ALL');
                setSelectedStatus('ALL');
              }}
              className="mt-2 px-4 py-1.5 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors cursor-pointer"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Vista Cards / Tabla adaptable */}
          <div className="grid grid-cols-1 gap-3">
            {filteredAppeals.map(appeal => {
              const status = appeal.estado || appeal.status;
              const formattedDate = appeal.created_at
                ? new Date(appeal.created_at).toLocaleDateString('es-CO', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })
                : 'Reciente';

              return (
                <div
                  key={appeal.id}
                  className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-2xs hover:border-purple-300 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Datos del estudiante y contexto */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-purple-500 to-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                      {(appeal.studentName || 'E').slice(0, 2).toUpperCase()}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900 truncate">
                          {appeal.studentName}
                        </h4>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200 shrink-0">
                          {appeal.courseName}
                        </span>
                        <GradeAppealBadge status={status} />
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span className="font-semibold text-slate-700 flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                          {appeal.subjectName}: "{appeal.taskTitle}"
                        </span>
                        <span>· Acudiente: {appeal.guardianName}</span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Calendar className="w-3 h-3" />
                          {formattedDate}
                        </span>
                      </div>

                      {/* Snippet del motivo */}
                      <p className="text-xs text-slate-600 line-clamp-1 italic pt-0.5">
                        "{appeal.motivo_acudiente || appeal.reason}"
                      </p>
                    </div>
                  </div>

                  {/* Calificación y Acción */}
                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">
                        Calificación
                      </span>
                      <strong
                        className={`text-xl font-black ${appeal.score !== null && appeal.score !== undefined && Number(appeal.score) < 3
                            ? 'text-rose-700'
                            : 'text-emerald-700'
                          }`}
                      >
                        {appeal.score !== null && appeal.score !== undefined ? Number(appeal.score).toFixed(1) : '—'}
                      </strong>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenAppealModal(appeal)}
                      className="px-4 py-2 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver / Gestionar</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
