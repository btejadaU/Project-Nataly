import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { buildAppData, buildAlertsList, createTaskLookups, mapTask, inferNotificationType } from './appDataMappers';
import { getReadAlertIds, saveReadAlertId, saveMultipleReadAlertIds } from '../utils/notificationsStorage';
import { countBy, indexBy } from '../utils/collections';
import { toLocalISODate } from '../utils/formatters';
import {
  APPEAL_STATUS,
  loadLocalAppeals,
  saveLocalAppeals,
  fetchAppealsFromSupabase,
  persistAppealToSupabase,
  normalizeAppeal
} from '../utils/appealsStorage';

const AppContext = createContext();

// Espera tras la última pulsación antes de persistir una nota/observación.
const GRADE_SAVE_DEBOUNCE_MS = 400;
const ATTENDANCE_CONFLICT_KEY = 'student_id,class_group_id,subject_id,date';
const gradeKey = (taskId, studentId) => `${taskId}:${studentId}`;
const attendanceKey = row => `${row.student_id}|${row.class_group_id}|${row.subject_id ?? ''}|${row.date}`;
const roleTableFor = role => (role === 'teacher' ? 'perfiles_profesores' : role === 'guardian' ? 'perfiles_acudientes' : 'perfiles_administradores');

function firstError(results) {
  return results.find(result => result?.error)?.error || null;
}

export function AppProvider({ children }) {
  const { role: authenticatedRole, profile } = useAuth();
  const profileId = profile?.id;
  const [grades, setGrades] = useState([]);
  const [salones, setSalones] = useState([]);
  const [grados, setGrados] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [guardians, setGuardians] = useState([]);
  const [students, setStudents] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [rawHorarios, setRawHorarios] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [inAppAlerts, setInAppAlerts] = useState([]);
  const [appeals, setAppeals] = useState(() => loadLocalAppeals());
  const [activeDeepLink, setActiveDeepLink] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [attendances, setAttendances] = useState([]);
  const [activeTeacherId, setActiveTeacherId] = useState(null);
  const [activeStudentId, setActiveStudentId] = useState(null);
  const [guardianSection, setGuardianSection] = useState('grades');
  const [teacherSection, setTeacherSection] = useState(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path.includes('/docente/horario')) return 'schedule';
      if (path.includes('/docente/notas-apeladas')) return 'appeals';
      if (path.includes('/docente/clases')) return 'classes';
    }
    return 'classes';
  });
  const [gradingSettings, setGradingSettings] = useState({ format: 'one_five', passingValue: 3 });

  useEffect(() => {
    if (authenticatedRole === 'teacher' && typeof window !== 'undefined') {
      const targetPath =
        teacherSection === 'schedule'
          ? '/docente/horario'
          : teacherSection === 'appeals'
          ? '/docente/notas-apeladas'
          : '/docente/clases';
      if (window.location.pathname !== targetPath && (window.location.pathname.startsWith('/docente/') || window.location.pathname === '/')) {
        window.history.replaceState(null, '', targetPath);
      }
    }
  }, [teacherSection, authenticatedRole]);

  const isMountedRef = useRef(true);
  const loadRequestRef = useRef(0);
  const tasksRef = useRef(tasks);
  const studentsRef = useRef(students);
  const subjectsRef = useRef(subjects);
  const gradesRef = useRef(grades);
  const teachersRef = useRef(teachers);
  const appealsRef = useRef(appeals);
  const profilesRef = useRef([]);
  const assignmentsRef = useRef([]);
  const realtimeDebounceTimerRef = useRef(null);
  const pendingGradeWritesRef = useRef(new Map());
  const gradeWriteChainRef = useRef(new Map());

  useEffect(() => {
    appealsRef.current = appeals;
    saveLocalAppeals(appeals);
  }, [appeals]);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);
  useEffect(() => {
    studentsRef.current = students;
  }, [students]);
  useEffect(() => {
    subjectsRef.current = subjects;
  }, [subjects]);
  useEffect(() => {
    gradesRef.current = grades;
  }, [grades]);
  useEffect(() => {
    teachersRef.current = teachers;
  }, [teachers]);

  const loadData = useCallback(async () => {
    if (!supabase) return;
    // Solo la petición más reciente puede escribir estado: evita que una recarga lenta
    // (p. ej. disparada por una mutación anterior) sobrescriba datos más nuevos.
    const requestId = ++loadRequestRef.current;
    const isStale = () => !isMountedRef.current || requestId !== loadRequestRef.current;
    setIsLoading(true);
    setLoadError('');
    try {
      const results = await Promise.all([
        supabase.from('salones').select('*').order('name'),
        supabase.from('grados').select('*').order('numeric_level'),
        supabase.from('cursos').select('*, grados(*), salones(*)').order('section'),
        supabase.from('asignaturas').select('*').order('name'),
        supabase.from('perfiles').select('*').order('full_name'),
        supabase.from('estudiantes').select('*').order('full_name'),
        supabase.from('asignaciones_docentes').select('*'),
        supabase.from('horarios').select('*').order('day_of_week').order('start_time'),
        supabase.from('tareas').select('*').order('assigned_at', { ascending: false }),
        supabase.from('calificaciones').select('*'),
        authenticatedRole === 'admin'
          ? Promise.resolve({ data: [] })
          : supabase.from('notificaciones').select('*').order('created_at', { ascending: false }),
        supabase.from('perfiles_administradores').select('*'),
        supabase.from('perfiles_profesores').select('*'),
        supabase.from('perfiles_acudientes').select('*'),
        supabase.from('configuracion_calificaciones').select('*').eq('id', true).maybeSingle(),
        supabase.from('asistencias').select('*').order('date', { ascending: false }),
        supabase.from('profesor_materias').select('*').then(res => (res.error ? { data: [] } : res)).catch(() => ({ data: [] }))
      ]);
      if (isStale()) return;
      const failed = firstError(results.slice(0, 16));
      if (failed) {
        setLoadError(failed.message);
        return;
      }

      const [salonResult, gradoResult, courseResult, subjectResult, profileResult, studentResult, assignmentResult, scheduleResult, taskResult, gradeResult, notificationResult, adminRoleResult, teacherRoleResult, guardianRoleResult, gradingResult, attendanceResult, teacherSubjectsResult] = results;

      profilesRef.current = profileResult.data || [];
      assignmentsRef.current = assignmentResult.data || [];

      // Cargar y unificar apelaciones (remotas de Supabase + locales de fallback)
      const localAppeals = loadLocalAppeals();
      const remoteAppeals = await fetchAppealsFromSupabase(supabase);
      const mergedAppealsMap = new Map();
      for (const a of localAppeals) {
        mergedAppealsMap.set(a.id, a);
      }
      if (remoteAppeals) {
        for (const a of remoteAppeals) {
          mergedAppealsMap.set(a.id, a);
        }
      }
      const loadedAppeals = Array.from(mergedAppealsMap.values());
      setAppeals(loadedAppeals);

      const data = buildAppData({
        salones: salonResult.data,
        grados: gradoResult.data,
        cursos: courseResult.data,
        asignaturas: subjectResult.data,
        perfiles: profileResult.data,
        estudiantes: studentResult.data,
        asignaciones: assignmentResult.data,
        horarios: scheduleResult.data,
        tareas: taskResult.data,
        calificaciones: gradeResult.data,
        notificaciones: notificationResult.data,
        administradores: adminRoleResult.data,
        profesores: teacherRoleResult.data,
        acudientes: guardianRoleResult.data,
        configuracionCalificaciones: gradingResult.data,
        asistencias: attendanceResult.data,
        profesorMaterias: teacherSubjectsResult?.data || [],
        appeals: loadedAppeals
      }, { readAlertIds: getReadAlertIds(), role: authenticatedRole });

      setSalones(data.salones);
      setGrados(data.grados);
      setGrades(data.grades);
      setSubjects(data.subjects);
      setTeachers(data.teachers);
      setGuardians(data.guardians);
      if (data.gradingSettings) setGradingSettings(data.gradingSettings);
      setStudents(data.students);
      setAttendances(data.attendances);
      setTeacherAssignments(data.teacherAssignments);
      setSchedule(data.schedule);
      setRawHorarios(data.rawHorarios || []);
      setTasks(data.tasks);
      setInAppAlerts(data.alerts);
      setActiveTeacherId(current => current || (authenticatedRole === 'teacher' ? profileId : data.teachers[0]?.id));
      setActiveStudentId(current => current || (authenticatedRole === 'guardian' ? data.students[0]?.id : null));
      setIsReady(true);
    } catch (error) {
      if (!isStale()) setLoadError(error?.message || 'Error de conexión al cargar la información.');
    } finally {
      if (!isStale()) setIsLoading(false);
    }
  }, [authenticatedRole, profileId]);

  useEffect(() => {
    isMountedRef.current = true;
    // Sincronización con un sistema externo (Supabase): la carga es asíncrona por diseño.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const refreshAlerts = useCallback(async () => {
    if (!supabase || authenticatedRole === 'admin') {
      if (isMountedRef.current && authenticatedRole === 'admin') {
        setInAppAlerts([]);
      }
      return;
    }
    const { data, error } = await supabase.from('notificaciones').select('*').order('created_at', { ascending: false });
    if (error) {
      console.warn('No se pudieron recargar las notificaciones:', error.message);
      return;
    }
    if (isMountedRef.current) {
      const alerts = buildAlertsList({
        rawNotifications: data || [],
        tasks: tasksRef.current,
        students: studentsRef.current,
        subjects: subjectsRef.current,
        readAlertIds: getReadAlertIds()
      });
      setInAppAlerts(alerts);
    }
  }, [authenticatedRole]);

  // Recarga ligera y reactiva de datos académicos sin alterar isLoading ni provocar parpadeos
  const reloadAcademicData = useCallback(async () => {
    if (!supabase || !isMountedRef.current) return;
    try {
      const [taskRes, gradeRes, notifRes, attRes, remoteAppeals] = await Promise.all([
        supabase.from('tareas').select('*').order('assigned_at', { ascending: false }),
        supabase.from('calificaciones').select('*'),
        authenticatedRole === 'admin'
          ? Promise.resolve({ data: [] })
          : supabase.from('notificaciones').select('*').order('created_at', { ascending: false }),
        supabase.from('asistencias').select('*').order('date', { ascending: false }),
        fetchAppealsFromSupabase(supabase)
      ]);

      if (!isMountedRef.current) return;

      const localAppeals = loadLocalAppeals();
      const mergedAppealsMap = new Map();
      for (const a of localAppeals) mergedAppealsMap.set(a.id, a);
      if (remoteAppeals) {
        for (const a of remoteAppeals) mergedAppealsMap.set(a.id, a);
      }
      const loadedAppeals = Array.from(mergedAppealsMap.values());
      setAppeals(loadedAppeals);
      appealsRef.current = loadedAppeals;

      if (!taskRes.error && !gradeRes.error && taskRes.data) {
        const lookups = createTaskLookups({
          grades: gradesRef.current,
          subjects: subjectsRef.current,
          teachers: teachersRef.current,
          profiles: profilesRef.current,
          assignments: assignmentsRef.current,
          gradeRows: gradeRes.data || [],
          appeals: loadedAppeals
        });

        const mappedTasks = taskRes.data.map(task => mapTask(task, lookups));
        setTasks(mappedTasks);
        tasksRef.current = mappedTasks;

        if (!notifRes.error) {
          const alerts = authenticatedRole === 'admin'
            ? []
            : buildAlertsList({
                rawNotifications: notifRes.data || [],
                tasks: mappedTasks,
                students: studentsRef.current,
                subjects: subjectsRef.current,
                readAlertIds: getReadAlertIds()
              });
          setInAppAlerts(alerts);
        }
      }

      if (!attRes.error && attRes.data) {
        setAttendances(attRes.data);
      }
    } catch (err) {
      console.warn('Error en sincronización académica en tiempo real:', err);
    }
  }, [authenticatedRole]);

  // Debounce para mitigar ráfagas de eventos Postgres (ej. guardado de notas en lote)
  const triggerDebouncedReload = useCallback(() => {
    if (realtimeDebounceTimerRef.current) {
      clearTimeout(realtimeDebounceTimerRef.current);
    }
    realtimeDebounceTimerRef.current = setTimeout(() => {
      reloadAcademicData();
    }, 200);
  }, [reloadAcademicData]);

  // Sincronización instantánea entre pestañas abiertas en el mismo navegador
  const broadcastChange = useCallback((action) => {
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('project-nataly-sync');
        bc.postMessage({ type: 'ACADEMIC_DATA_CHANGED', action, timestamp: Date.now() });
        bc.close();
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    let bc;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('project-nataly-sync');
        bc.onmessage = (event) => {
          if (event.data?.type === 'ACADEMIC_DATA_CHANGED') {
            triggerDebouncedReload();
          }
        };
      }
    } catch {
      // ignore
    }
    return () => {
      if (bc) bc.close();
    };
  }, [triggerDebouncedReload]);

  useEffect(() => {
    if (!supabase || authenticatedRole === 'admin') return;

    // Sincronización en tiempo real vía Realtime Channel
    const channel = supabase
      .channel('notificaciones-realtime-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notificaciones' }, () => {
        triggerDebouncedReload();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tareas' }, () => {
        triggerDebouncedReload();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'asistencias' }, () => {
        triggerDebouncedReload();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calificaciones' }, () => {
        triggerDebouncedReload();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'apelaciones_calificaciones' }, () => {
        triggerDebouncedReload();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'perfiles' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'estudiantes' }, () => {
        loadData();
      })
      .subscribe();

    // Sondeo de respaldo periódico (cada 15s) y al enfocar pestaña
    const interval = setInterval(() => {
      triggerDebouncedReload();
    }, 15000);

    const onWindowFocus = () => {
      triggerDebouncedReload();
    };
    window.addEventListener('focus', onWindowFocus);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      window.removeEventListener('focus', onWindowFocus);
    };
  }, [triggerDebouncedReload, loadData, authenticatedRole]);

  // ---------------------------------------------------------------------------
  // Calificaciones: actualización optimista + escritura con debounce y serializada
  // ---------------------------------------------------------------------------
  const writeGrade = useCallback(async (taskId, studentId, payload) => {
    // Lee el estado más reciente (no el de un closure viejo) para no pisar campos.
    const existing = tasksRef.current.find(task => task.id === taskId)?.studentGrades?.[studentId] || {};
    const merged = { ...existing, ...payload };
    const { data, error } = await supabase.from('calificaciones').upsert({
      assignment_id: taskId,
      student_id: studentId,
      score: merged.score ?? null,
      teacher_note: merged.teacherNote ?? '',
      ai_message: merged.aiMessage ?? ''
    }, { onConflict: 'assignment_id,student_id' }).select().single();
    if (error) throw error;
    return data;
  }, []);

  /** Persiste de inmediato los cambios pendientes de una calificación y espera escrituras en curso. */
  const flushGradeWrite = useCallback((taskId, studentId) => {
    const key = gradeKey(taskId, studentId);
    const pending = pendingGradeWritesRef.current.get(key);
    const previous = gradeWriteChainRef.current.get(key) || Promise.resolve();
    if (!pending) return previous;

    pendingGradeWritesRef.current.delete(key);
    clearTimeout(pending.timer);
    // Encadenar garantiza que las escrituras de una misma calificación lleguen en orden.
    const write = previous.catch(() => undefined).then(() => writeGrade(taskId, studentId, pending.payload));
    gradeWriteChainRef.current.set(key, write);
    write.then(pending.resolve, pending.reject);
    write
      .finally(() => {
        if (gradeWriteChainRef.current.get(key) === write) gradeWriteChainRef.current.delete(key);
      })
      .catch(() => undefined);
    return write;
  }, [writeGrade]);

  const updateStudentGrade = useCallback((taskId, studentId, gradePayload) => {
    setTasks(current => current.map(task => task.id !== taskId ? task : {
      ...task,
      studentGrades: { ...task.studentGrades, [studentId]: { ...(task.studentGrades?.[studentId] || {}), ...gradePayload } }
    }));

    const key = gradeKey(taskId, studentId);
    let pending = pendingGradeWritesRef.current.get(key);
    if (!pending) {
      let resolve;
      let reject;
      const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
      // Evita "unhandled rejection" si nadie espera el resultado; quien lo espere sigue recibiendo el error.
      promise.catch(() => undefined);
      pending = { taskId, studentId, payload: {}, promise, resolve, reject, timer: null };
      pendingGradeWritesRef.current.set(key, pending);
    }
    pending.payload = { ...pending.payload, ...gradePayload };
    clearTimeout(pending.timer);
    pending.timer = setTimeout(() => flushGradeWrite(taskId, studentId), GRADE_SAVE_DEBOUNCE_MS);
    return pending.promise;
  }, [flushGradeWrite]);

  useEffect(() => {
    const pendingWrites = pendingGradeWritesRef.current;
    return () => {
      isMountedRef.current = false;
      // No perder ediciones pendientes al desmontar.
      for (const pending of [...pendingWrites.values()]) flushGradeWrite(pending.taskId, pending.studentId);
    };
  }, [flushGradeWrite]);

  const activeTeacher = useMemo(() => teachers.find(item => item.id === activeTeacherId) || teachers[0] || null, [teachers, activeTeacherId]);
  const activeStudent = useMemo(() => students.find(item => item.id === activeStudentId) || students[0] || null, [students, activeStudentId]);
  const teacherClassesMap = useMemo(() => {
    const gradesById = indexBy(grades);
    const subjectsById = indexBy(subjects);
    const studentsPerCourse = countBy(students, student => student.gradeId);
    const result = {};
    for (const assignment of teacherAssignments) {
      const course = gradesById.get(assignment.class_group_id);
      const subject = subjectsById.get(assignment.subject_id);
      if (!course || !subject) continue;
      const classItem = {
        id: `${subject.id}-${course.id}`,
        subjectId: subject.id,
        gradeId: course.id,
        gradeNum: course.gradeNum,
        section: course.section,
        subjectName: subject.name,
        gradeName: course.name,
        salon: course.salon,
        studentsCount: studentsPerCourse.get(course.id) || 0,
        days: []
      };
      if (!result[assignment.teacher_id]) result[assignment.teacher_id] = [];
      result[assignment.teacher_id].push(classItem);
    }
    return result;
  }, [teacherAssignments, grades, subjects, students]);
  const unreadAlertsForActiveStudent = useMemo(() => {
    if (authenticatedRole === 'admin') return 0;
    return inAppAlerts.filter(alert => {
      if (alert.read) return false;
      if (authenticatedRole === 'guardian') {
        if (alert.studentId && activeStudentId && alert.studentId !== activeStudentId) {
          return false;
        }
      }
      if (authenticatedRole === 'teacher') {
        if (alert.isVirtual) return false;
        if (alert.recipientId && activeTeacherId && alert.recipientId !== activeTeacherId) {
          return false;
        }
      }
      return true;
    }).length;
  }, [inAppAlerts, authenticatedRole, activeStudentId, activeTeacherId]);

  const markAlertAsRead = useCallback(async alertId => {
    if (!alertId) return;
    saveReadAlertId(alertId);
    setInAppAlerts(current => current.map(item => item.id === alertId ? { ...item, read: true } : item));

    if (!String(alertId).startsWith('task-virtual-') && supabase) {
      try {
        await supabase.from('notificaciones').update({ is_read: true }).eq('id', alertId);
      } catch (err) {
        console.warn('Error al marcar notificación leída en BD:', err);
      }
    }
  }, []);

  const markAllAlertsAsRead = useCallback(async () => {
    const alertsToMark = inAppAlerts.filter(alert => {
      if (alert.read) return false;
      if (authenticatedRole === 'guardian') {
        if (alert.studentId && activeStudentId && alert.studentId !== activeStudentId) {
          return false;
        }
      }
      if (authenticatedRole === 'teacher') {
        if (alert.isVirtual) return false;
        if (alert.recipientId && activeTeacherId && alert.recipientId !== activeTeacherId) {
          return false;
        }
      }
      return true;
    });

    const alertIds = alertsToMark.map(a => a.id);
    if (!alertIds.length) return;

    saveMultipleReadAlertIds(alertIds);
    setInAppAlerts(current => current.map(item => alertIds.includes(item.id) ? { ...item, read: true } : item));

    if (supabase) {
      try {
        const dbIds = alertIds.filter(id => !String(id).startsWith('task-virtual-'));
        if (dbIds.length > 0) {
          await supabase.from('notificaciones').update({ is_read: true }).in('id', dbIds);
        }
      } catch (err) {
        console.warn('Error al marcar todas las notificaciones como leídas en BD:', err);
      }
    }
  }, [inAppAlerts, authenticatedRole, activeStudentId, activeTeacherId]);

  const createTask = async newTaskData => {
    const { data, error } = await supabase.from('tareas').insert({
      title: newTaskData.title,
      description: newTaskData.description || '',
      subject_id: newTaskData.subjectId,
      class_group_id: newTaskData.gradeId,
      teacher_id: activeTeacherId || profileId,
      due_date: newTaskData.dueDate,
      status: 'pending'
    }).select().single();
    if (error) throw error;
    const mapped = mapTask(data, createTaskLookups({
      grades: gradesRef.current,
      subjects: subjectsRef.current,
      teachers: teachersRef.current,
      profiles: profilesRef.current,
      assignments: assignmentsRef.current
    }));
    setTasks(current => [mapped, ...current]);
    broadcastChange('TASK_CREATED');
    await refreshAlerts();
    return mapped;
  };

  const saveGradesBatch = async (taskId, recordsMap) => {
    const task = tasksRef.current.find(t => t.id === taskId);
    if (!task) throw new Error('Tarea no encontrada');

    const entries = Object.entries(recordsMap || {});
    if (entries.length === 0) return [];

    const nowIso = new Date().toISOString();
    const upsertRows = entries.map(([studentId, data]) => {
      const scoreNum = data.score !== null && data.score !== undefined && data.score !== '' ? Number(data.score) : null;
      return {
        assignment_id: taskId,
        student_id: studentId,
        score: isNaN(scoreNum) ? null : scoreNum,
        letter_grade: data.letterGrade || (typeof data.score === 'string' && ['A', 'B', 'C', 'D', 'F'].includes(data.score.toUpperCase()) ? data.score.toUpperCase() : null),
        teacher_note: data.teacherNote || '',
        ai_message: '',
        is_notified: true,
        notified_at: nowIso,
        is_read: false
      };
    });

    const { data: savedData, error } = await supabase
      .from('calificaciones')
      .upsert(upsertRows, { onConflict: 'assignment_id,student_id' })
      .select();

    if (error) throw error;

    if (supabase) {
      try {
        await supabase.from('tareas').update({ status: 'notified' }).eq('id', taskId);
      } catch (e) {
        console.warn('Aviso al actualizar status de tarea:', e);
      }
    }

    // Actualizar estado local de la tarea
    setTasks(current => current.map(t => {
      if (t.id !== taskId) return t;
      const updatedGrades = { ...t.studentGrades };
      entries.forEach(([studentId, data]) => {
        const scoreNum = data.score !== null && data.score !== undefined && data.score !== '' ? Number(data.score) : null;
        updatedGrades[studentId] = {
          ...(updatedGrades[studentId] || {}),
          score: isNaN(scoreNum) ? null : scoreNum,
          letterGrade: data.letterGrade || (typeof data.score === 'string' && ['A', 'B', 'C', 'D', 'F'].includes(data.score.toUpperCase()) ? data.score.toUpperCase() : null),
          teacherNote: data.teacherNote || '',
          aiMessage: '',
          isNotified: true,
          notifiedAt: nowIso
        };
      });
      return { ...t, status: 'Calificada y Notificada', studentGrades: updatedGrades };
    }));

    broadcastChange('GRADES_SAVED');

    // Disparar notificaciones a estudiante y acudiente solo si no fueron creadas por el trigger de BD
    const notifRows = [];
    for (const [studentId, data] of entries) {
      if (data.score === null || data.score === undefined || data.score === '') continue;
      const student = studentsRef.current.find(s => s.id === studentId);
      if (!student || !student.guardianId) continue;

      const isLetter = typeof data.score === 'string' && ['A', 'B', 'C', 'D', 'F'].includes(data.score.toUpperCase());
      const formattedScore = isLetter
        ? data.score.toUpperCase()
        : Number(data.score).toFixed(1);
      const studentFirst = student.name.split(' ')[0];
      const noteSuffix = data.teacherNote?.trim() ? ` Observación del docente: "${data.teacherNote.trim()}".` : '';

      notifRows.push({
        recipient_id: student.guardianId,
        student_id: studentId,
        assignment_id: taskId,
        title: `Calificación: ${task.subjectName}`,
        message: `Se registró la nota de ${formattedScore} para ${studentFirst} en la actividad "${task.title}".${noteSuffix}`,
        is_read: false
      });
    }

    if (notifRows.length > 0 && supabase) {
      try {
        // Verificar si el trigger de BD ya insertó notificaciones recientes para esta asignación
        const { data: existingNotifs } = await supabase
          .from('notificaciones')
          .select('student_id')
          .eq('assignment_id', taskId)
          .gte('created_at', new Date(Date.now() - 30000).toISOString());

        const existingStudentIds = new Set((existingNotifs || []).map(n => n.student_id));
        const missingRows = notifRows.filter(r => !existingStudentIds.has(r.student_id));

        if (missingRows.length > 0) {
          await supabase.from('notificaciones').insert(missingRows);
        }
      } catch (err) {
        console.warn('Advertencia al verificar/insertar notificaciones de calificaciones:', err);
      }
    }

    await refreshAlerts();
    return savedData;
  };

  const disputeGrade = async ({ taskId, studentId, reason }) => {
    const student = studentsRef.current.find(s => s.id === studentId);
    const task = tasksRef.current.find(t => t.id === taskId);
    if (!task) throw new Error('Actividad no encontrada');

    const existingAppeal = appealsRef.current.find(a =>
      (a.taskId === taskId || a.assignment_id === taskId) &&
      (a.studentId === studentId || a.student_id === studentId)
    ) || task.studentGrades?.[studentId]?.appeal;
    if (existingAppeal) {
      throw new Error('Esta actividad ya cuenta con una solicitud de revisión registrada previamente.');
    }

    const studentFirst = student ? student.name.split(' ')[0] : 'Estudiante';
    const disputeMessage = `El acudiente de ${student?.name || studentFirst} (${student?.guardianName || 'Acudiente'}) manifestó inconformidad con la nota en "${task.title}" (${task.subjectName}). Motivo: "${reason}".`;
    const notifTitle = `Inconformidad de nota: ${studentFirst} - ${task.title}`;

    const recipients = [];
    if (task?.teacherId) recipients.push(task.teacherId);
    if (student?.guardianId && !recipients.includes(student.guardianId)) recipients.push(student.guardianId);

    const insertedAlerts = [];
    for (const recId of recipients) {
      const notifId = crypto.randomUUID();
      const notifPayload = {
        id: notifId,
        recipient_id: recId,
        student_id: studentId,
        assignment_id: taskId,
        title: notifTitle,
        message: disputeMessage,
        is_read: false
      };
      if (supabase) {
        try {
          const { error: notifErr } = await supabase.from('notificaciones').insert(notifPayload);
          if (notifErr) {
            console.warn('Aviso al insertar notificación de disputa:', notifErr.message);
          }
        } catch (err) {
          console.warn('Advertencia al registrar notificación de disputa:', err);
        }
      }
      insertedAlerts.push({
        id: notifId,
        title: notifTitle,
        message: disputeMessage,
        taskId,
        studentId,
        recipientId: recId,
        timestamp: new Date().toISOString(),
        read: false,
        isVirtual: false
      });
    }

    if (insertedAlerts.length > 0) {
      setInAppAlerts(current => [...insertedAlerts, ...current]);
    } else {
      const fallbackAlerts = recipients.map(recId => ({
        id: `dispute-${Date.now()}-${recId}`,
        title: notifTitle,
        message: disputeMessage,
        taskId,
        studentId,
        recipientId: recId,
        timestamp: new Date().toISOString(),
        read: false,
        isVirtual: false
      }));
      setInAppAlerts(current => [...fallbackAlerts, ...current]);
    }

    await refreshAlerts();
    return { success: true };
  };

  const submitGradeAppeal = useCallback(async ({ taskId, studentId, reason }) => {
    if (!reason || !reason.trim()) {
      throw new Error('El motivo del desacuerdo es obligatorio.');
    }
    const student = studentsRef.current.find(s => s.id === studentId);
    const task = tasksRef.current.find(t => t.id === taskId);
    if (!task) throw new Error('Actividad no encontrada.');

    // Verificar si ya existe una apelación previa registrada
    const existingAppeal = appealsRef.current.find(a =>
      (a.taskId === taskId || a.assignment_id === taskId) &&
      (a.studentId === studentId || a.student_id === studentId)
    ) || task.studentGrades?.[studentId]?.appeal;

    if (existingAppeal) {
      throw new Error('Esta actividad ya cuenta con una solicitud de revisión registrada previamente. Solo se permite una revisión por actividad.');
    }

    const appealId = `appeal-${taskId}-${studentId}`;
    const newAppeal = normalizeAppeal({
      id: appealId,
      nota_id: `${taskId}:${studentId}`,
      assignment_id: taskId,
      student_id: studentId,
      guardian_id: (authenticatedRole === 'guardian' && profileId) ? profileId : (student?.guardianId || profileId),
      teacher_id: task.teacherId,
      subject_id: task.subjectId,
      class_group_id: task.gradeId,
      motivo_acudiente: reason.trim(),
      estado: APPEAL_STATUS.EN_REVISION,
      status: APPEAL_STATUS.EN_REVISION,
      respuesta_docente: '',
      teacher_response: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // 1. Actualizar estado de apelaciones localmente
    setAppeals(current => {
      const next = current.filter(a => a.id !== appealId && a.nota_id !== newAppeal.nota_id);
      const updated = [newAppeal, ...next];
      saveLocalAppeals(updated);
      return updated;
    });

    // 2. Actualizar estado de tareas localmente
    setTasks(current => current.map(t => {
      if (t.id !== taskId) return t;
      const currentGrade = t.studentGrades?.[studentId] || {};
      return {
        ...t,
        studentGrades: {
          ...t.studentGrades,
          [studentId]: {
            ...currentGrade,
            appealStatus: APPEAL_STATUS.EN_REVISION,
            appeal: newAppeal
          }
        }
      };
    }));

    // 3. Persistir en Supabase (si está configurado)
    if (supabase) {
      persistAppealToSupabase(supabase, newAppeal).then(persisted => {
        if (persisted && persisted.id && persisted.id !== appealId) {
          setAppeals(current => {
            const next = current.map(a =>
              (a.id === appealId || a.nota_id === newAppeal.nota_id) ? { ...a, id: persisted.id } : a
            );
            saveLocalAppeals(next);
            return next;
          });
        }
      }).catch(err => {
        console.warn('Aviso al guardar apelación en Supabase:', err);
      });
    }

    // 4. Despachar notificación al docente titular
    const studentFirst = student ? student.name.split(' ')[0] : 'Estudiante';
    const notifTitle = `Solicitud de Revisión: ${studentFirst} - ${task.title}`;
    const notifMessage = `El acudiente de ${student?.name || studentFirst} solicitó formalmente la revisión de la nota en "${task.title}" (${task.subjectName}). Motivo: "${reason.trim()}".`;

    const notifId = crypto.randomUUID();
    const notificationPayload = {
      id: notifId,
      recipient_id: task.teacherId,
      student_id: studentId,
      assignment_id: taskId,
      title: notifTitle,
      message: notifMessage,
      is_read: false
    };

    const createdAlert = {
      id: notifId,
      title: notifTitle,
      message: notifMessage,
      taskId,
      studentId,
      recipientId: task.teacherId,
      timestamp: new Date().toISOString(),
      read: false,
      isVirtual: false,
      tipo: 'APELACION_NOTA',
      referencia_id: newAppeal.id,
      metadata: {
        tipo: 'APELACION_NOTA',
        referencia_id: newAppeal.id,
        taskId,
        studentId
      }
    };

    if (supabase && task.teacherId) {
      try {
        const { error: notifErr } = await supabase.from('notificaciones').insert(notificationPayload);
        if (notifErr) {
          console.warn('Aviso al insertar notificación de apelación en BD:', notifErr.message);
        }
      } catch (err) {
        console.warn('Advertencia al insertar notificación en BD:', err);
      }
    }

    setInAppAlerts(current => [createdAlert, ...current]);

    broadcastChange('GRADE_APPEAL');
    await refreshAlerts();
    return newAppeal;
  }, [profileId, refreshAlerts, broadcastChange]);

  const resolveGradeAppeal = useCallback(async ({ appealId, taskId, studentId, decision, respuestaDocente }) => {
    const existingAppeal = appealsRef.current.find(
      a => a.id === appealId || (a.taskId === taskId && a.studentId === studentId) || (a.assignment_id === taskId && a.student_id === studentId)
    );
    const effectiveTaskId = taskId || existingAppeal?.assignment_id || existingAppeal?.taskId;
    const effectiveStudentId = studentId || existingAppeal?.student_id || existingAppeal?.studentId;

    const student = studentsRef.current.find(s => s.id === effectiveStudentId);
    const task = tasksRef.current.find(t => t.id === effectiveTaskId);

    let newStatus;
    if (decision === 'ACCEPT') {
      newStatus = APPEAL_STATUS.REVISION_ACEPTADA;
    } else if (decision === 'CALIFICADA' || decision === 'RESOLVED' || decision === 'REVISION_COMPLETADA') {
      newStatus = APPEAL_STATUS.CALIFICADA;
    } else {
      newStatus = APPEAL_STATUS.REVISION_RECHAZADA;
    }

    const isAccepted = newStatus === APPEAL_STATUS.REVISION_ACEPTADA;
    const isCalificada = newStatus === APPEAL_STATUS.CALIFICADA;

    const defaultRejectMsg = 'Tras la revisión de la solicitud, la calificación se mantiene ya que refleja fielmente los criterios y el desempeño demostrado en la actividad.';
    const finalComment = newStatus === APPEAL_STATUS.CALIFICADA
      ? (respuestaDocente?.trim() || 'Calificación actualizada tras revisión en clase.')
      : (decision === 'ACCEPT'
        ? (respuestaDocente?.trim() || 'La solicitud de revisión ha sido aceptada. La calificación se revisará en la próxima clase.')
        : (respuestaDocente?.trim() || defaultRejectMsg));

    const updatedAppeal = normalizeAppeal({
      ...(existingAppeal || {}),
      id: appealId || existingAppeal?.id || `appeal-${effectiveTaskId}-${effectiveStudentId}`,
      nota_id: `${effectiveTaskId}:${effectiveStudentId}`,
      assignment_id: effectiveTaskId,
      student_id: effectiveStudentId,
      guardian_id: student?.guardianId || existingAppeal?.guardian_id,
      teacher_id: task?.teacherId || existingAppeal?.teacher_id,
      subject_id: task?.subjectId || existingAppeal?.subject_id,
      class_group_id: task?.gradeId || existingAppeal?.class_group_id,
      estado: newStatus,
      status: newStatus,
      respuesta_docente: finalComment,
      teacher_response: finalComment,
      updated_at: new Date().toISOString()
    });

    setAppeals(current => {
      const next = current.map(a => (a.id === updatedAppeal.id || a.nota_id === updatedAppeal.nota_id) ? updatedAppeal : a);
      saveLocalAppeals(next);
      return next;
    });

    setTasks(current => current.map(t => {
      if (t.id !== effectiveTaskId) return t;
      const currentGrade = t.studentGrades?.[effectiveStudentId] || {};
      return {
        ...t,
        studentGrades: {
          ...t.studentGrades,
          [effectiveStudentId]: {
            ...currentGrade,
            appealStatus: newStatus,
            appeal: updatedAppeal
          }
        }
      };
    }));

    if (supabase) {
      persistAppealToSupabase(supabase, updatedAppeal).then(persisted => {
        if (persisted && persisted.id && persisted.id !== updatedAppeal.id) {
          setAppeals(current => {
            const next = current.map(a =>
              (a.id === updatedAppeal.id || a.nota_id === updatedAppeal.nota_id) ? { ...a, id: persisted.id } : a
            );
            saveLocalAppeals(next);
            return next;
          });
        }
      }).catch(err => {
        console.warn('Aviso al persistir resolución en Supabase:', err);
      });
    }

    // Despachar notificación automática al acudiente
    const guardianId = student?.guardianId || updatedAppeal.guardian_id;
    if (guardianId) {
      const studentFirst = student ? student.name.split(' ')[0] : 'Estudiante';
      const notifTitle = isCalificada
        ? `Revisión Aceptada y Calificada: ${studentFirst} - ${task?.subjectName || 'Calificación'}`
        : isAccepted
          ? `Revisión Aceptada: ${studentFirst} - ${task?.subjectName || 'Calificación'}`
          : `Revisión Rechazada: ${studentFirst} - ${task?.subjectName || 'Calificación'}`;

      const notifId = crypto.randomUUID();
      const notifPayload = {
        id: notifId,
        recipient_id: guardianId,
        student_id: effectiveStudentId,
        assignment_id: effectiveTaskId,
        title: notifTitle,
        message: finalComment,
        is_read: false
      };

      const createdAlert = {
        id: notifId,
        title: notifTitle,
        message: finalComment,
        taskId: effectiveTaskId,
        studentId: effectiveStudentId,
        recipientId: guardianId,
        timestamp: new Date().toISOString(),
        read: false,
        isVirtual: false,
        tipo: 'RESOLUCION_APELACION',
        referencia_id: updatedAppeal.id,
        metadata: {
          tipo: 'RESOLUCION_APELACION',
          referencia_id: updatedAppeal.id,
          taskId: effectiveTaskId,
          studentId: effectiveStudentId,
          decision: newStatus
        }
      };

      if (supabase) {
        try {
          const { error: notifErr } = await supabase.from('notificaciones').insert(notifPayload);
          if (notifErr) {
            console.warn('Aviso al insertar notificación de resolución en BD:', notifErr.message);
          }
        } catch (err) {
          console.warn('Advertencia al insertar notificación de resolución en BD:', err);
        }
      }

      setInAppAlerts(current => [createdAlert, ...current]);
    }

    broadcastChange('APPEAL_RESOLVED');
    await refreshAlerts();
    return updatedAppeal;
  }, [refreshAlerts, broadcastChange]);

  const triggerDeepLink = useCallback((alert) => {
    if (!alert) return;
    if (!alert.read) {
      markAlertAsRead(alert.id);
    }
    const tipo = alert.tipo || alert.metadata?.tipo || inferNotificationType(alert);
    const taskId = alert.taskId || alert.assignment_id || alert.assignmentId || alert.metadata?.taskId;
    const studentId = alert.studentId || alert.student_id || alert.metadata?.studentId;
    const referenciaId = alert.referencia_id || alert.referenciaId || alert.metadata?.referencia_id;

    const matchingAppeal = appealsRef.current.find(
      a => a.id === referenciaId || (taskId && studentId && (a.taskId === taskId || a.assignment_id === taskId) && (a.studentId === studentId || a.student_id === studentId))
    );

    setActiveDeepLink({
      tipo: tipo || 'NOTA',
      taskId,
      studentId,
      referenciaId,
      alert,
      appeal: matchingAppeal || null
    });
  }, [markAlertAsRead]);

  const clearDeepLink = useCallback(() => {
    setActiveDeepLink(null);
  }, []);

  const notifyGuardian = async (taskId, studentId) => {
    const student = students.find(item => item.id === studentId);
    if (!student || !tasksRef.current.some(item => item.id === taskId)) return;
    // La nota debe existir en BD antes de marcarla como notificada.
    await flushGradeWrite(taskId, studentId);
    const task = tasksRef.current.find(item => item.id === taskId);
    const grade = task?.studentGrades?.[studentId];
    if (!task || !grade) return;

    let guardianId = student.guardianId;
    if (!guardianId) {
      const { data: studentRow, error } = await supabase.from('estudiantes').select('guardian_id').eq('id', studentId).single();
      if (error) throw error;
      guardianId = studentRow?.guardian_id;
    }

    const notifiedAt = new Date().toISOString();
    const notifId = crypto.randomUUID();
    const notifPayload = {
      id: notifId,
      recipient_id: guardianId,
      student_id: studentId,
      assignment_id: taskId,
      title: `Calificación notificada para ${student.name.split(' ')[0]}`,
      message: `${task.subjectName}: calificación de ${grade.score ?? 'N/A'} en "${task.title}".`,
      is_read: false
    };

    const updateResults = await Promise.all([
      supabase.from('calificaciones').update({ is_notified: true, notified_at: notifiedAt, is_read: false }).eq('assignment_id', taskId).eq('student_id', studentId),
      supabase.from('tareas').update({ status: 'notified' }).eq('id', taskId)
    ]);
    const failed = firstError(updateResults);
    if (failed) throw failed;

    try {
      const { error: notifErr } = await supabase.from('notificaciones').insert(notifPayload);
      if (notifErr) console.warn('Aviso en BD al insertar notificación:', notifErr.message);
    } catch (notifErr) {
      console.warn('Advertencia al insertar notificación de calificación:', notifErr);
    }

    setTasks(current => current.map(item => item.id === taskId ? { ...item, status: 'Calificada y Notificada', studentGrades: { ...item.studentGrades, [studentId]: { ...item.studentGrades?.[studentId], isNotified: true, notifiedAt, isRead: false } } } : item));
    setInAppAlerts(current => [{ id: notifId, title: notifPayload.title, message: notifPayload.message, taskId, studentId, timestamp: 'Justo ahora', read: false }, ...current]);
  };

  const confirmReadNotification = async (taskId, studentId) => {
    const readAt = new Date().toISOString();
    if (supabase) {
      try {
        const { error } = await supabase.rpc('confirmar_lectura_calificacion', { p_assignment_id: taskId, p_student_id: studentId });
        if (error) console.warn('Aviso en RPC confirmar_lectura_calificacion:', error);
      } catch (err) {
        console.warn('Aviso al llamar RPC confirmar_lectura_calificacion:', err);
      }
    }

    // Actualizar estado local de la tarea
    setTasks(current => current.map(task => task.id === taskId ? {
      ...task,
      studentGrades: {
        ...task.studentGrades,
        [studentId]: { ...(task.studentGrades?.[studentId] || {}), isRead: true, readAt }
      }
    } : task));

    // Marcar como leída la notificación original que tenía el acudiente
    setInAppAlerts(current => current.map(alert => alert.taskId === taskId && alert.studentId === studentId && !String(alert.title || '').toLowerCase().includes('confirmada') ? { ...alert, read: true } : alert));

    // Generar notificación para el docente titular
    const student = studentsRef.current.find(s => s.id === studentId);
    const task = tasksRef.current.find(t => t.id === taskId);
    const teacherId = task?.teacherId;

    if (teacherId) {
      const studentFirst = student ? student.name.split(' ')[0] : 'Estudiante';
      const notifTitle = `Lectura confirmada: ${studentFirst} - ${task?.title || 'Actividad'}`;
      const notifMessage = `El acudiente de ${student?.name || studentFirst} (${student?.guardianName || 'Acudiente'}) confirmó la lectura y firma de la calificación en "${task?.title || 'la tarea'}" (${task?.subjectName || 'Asignatura'}).`;

      const notifId = crypto.randomUUID();
      const notifPayload = {
        id: notifId,
        recipient_id: teacherId,
        student_id: studentId,
        assignment_id: taskId,
        title: notifTitle,
        message: notifMessage,
        is_read: false
      };

      if (supabase) {
        try {
          const { error: notifErr } = await supabase.from('notificaciones').insert(notifPayload);
          if (notifErr) {
            console.warn('Aviso en BD al insertar confirmación de lectura:', notifErr.message);
          }
        } catch (err) {
          console.warn('Advertencia al insertar notificación de confirmación de lectura:', err);
        }
      }

      const createdAlert = {
        id: notifId,
        title: notifTitle,
        message: notifMessage,
        taskId,
        studentId,
        recipientId: teacherId,
        timestamp: new Date().toISOString(),
        read: false,
        isVirtual: false
      };

      setInAppAlerts(current => [createdAlert, ...current]);

      broadcastChange('CONFIRM_READ');
      await refreshAlerts();
    }
  };

  const toAttendancePayload = ({ studentId, classGroupId, subjectId, teacherId, date, status, note }) => ({
    student_id: studentId,
    class_group_id: classGroupId,
    subject_id: subjectId || null,
    teacher_id: teacherId || profileId || null,
    date: date || toLocalISODate(),
    status: status || 'presente',
    note: note || null
  });

  /** Guarda la asistencia de varios estudiantes en una sola petición. */
  const saveAttendanceBatch = async records => {
    if (!records?.length) return [];
    const payload = records.map(toAttendancePayload);
    const { data, error } = await supabase.from('asistencias').upsert(payload, { onConflict: ATTENDANCE_CONFLICT_KEY }).select();
    if (error) throw error;
    const saved = data || [];
    setAttendances(current => {
      const savedByKey = new Map(saved.map(row => [attendanceKey(row), row]));
      const next = current.map(row => {
        const key = attendanceKey(row);
        if (!savedByKey.has(key)) return row;
        const updated = savedByKey.get(key);
        savedByKey.delete(key);
        return updated;
      });
      return [...savedByKey.values(), ...next];
    });

    // Notificación automática por asistencia a clase confirmada (presente)
    const presentRecords = payload.filter(r => r.status === 'presente');
    if (presentRecords.length > 0) {
      const attendanceNotifs = [];
      for (const rec of presentRecords) {
        const student = studentsRef.current.find(s => s.id === rec.student_id);
        if (!student?.guardianId) continue;
        const subject = subjectsRef.current.find(sb => sb.id === rec.subject_id);
        const subjectName = subject?.name || 'su clase';
        const studentFirst = student.name.split(' ')[0];
        const dateFormatted = rec.date || toLocalISODate();

        attendanceNotifs.push({
          recipient_id: student.guardianId,
          student_id: rec.student_id,
          title: `Asistencia a Clase Confirmada: ${studentFirst}`,
          message: `${studentFirst} asistió puntualmente a su clase de ${subjectName} el día ${dateFormatted}.`,
          is_read: false
        });
      }

      if (attendanceNotifs.length > 0) {
        try {
          await supabase.from('notificaciones').insert(attendanceNotifs);
        } catch (err) {
          console.warn('Advertencia al insertar notificaciones de asistencia puntual:', err);
        }
      }
    }

    // Si hubo inasistencia, tardanza o asistencia puntual, recargar alertas
    broadcastChange('ATTENDANCE_SAVED');
    await refreshAlerts();
    return saved;
  };

  const saveAttendance = async record => {
    const [saved] = await saveAttendanceBatch([record]);
    return saved;
  };

  const assignTeacherToCourse = async ({ teacherId, subjectId, courseId, dayOfWeek = 1, startTime = '07:00', endTime = '08:30' }) => {
    const { error } = await supabase.from('asignaciones_docentes').upsert({ teacher_id: teacherId, subject_id: subjectId, class_group_id: courseId }, { onConflict: 'teacher_id,subject_id,class_group_id,academic_year' });
    if (error) throw error;
    const { data: scheduleRow, error: scheduleError } = await supabase.from('horarios').select('id').eq('teacher_id', teacherId).eq('subject_id', subjectId).eq('class_group_id', courseId).order('id', { ascending: false }).limit(1).maybeSingle();
    if (scheduleError) throw scheduleError;
    if (scheduleRow) {
      const { error: updateError } = await supabase.from('horarios').update({ day_of_week: dayOfWeek, start_time: startTime, end_time: endTime }).eq('id', scheduleRow.id);
      if (updateError) throw updateError;
    }
    await loadData();
  };

  const saveCourse = async (courseData, courseId = null) => {
    const payload = { grado_id: courseData.gradoId, section: courseData.section, salon_id: courseData.salonId, director_id: courseData.directorId || null };
    const query = courseId
      ? supabase.from('cursos').update(payload).eq('id', courseId)
      : supabase.from('cursos').insert(payload);
    const { error } = await query;
    if (error) throw error;
    await loadData();
  };

  const removeCourse = async courseId => {
    const { error } = await supabase.from('cursos').delete().eq('id', courseId);
    if (error) throw error;
    await loadData();
  };

  const saveSalon = async (salonData, salonId = null) => {
    const payload = { name: salonData.name, building: salonData.building || '' };
    const query = salonId ? supabase.from('salones').update(payload).eq('id', salonId) : supabase.from('salones').insert(payload);
    const { error } = await query;
    if (error) throw error;
    await loadData();
  };

  const removeSalon = async salonId => {
    const { error } = await supabase.from('salones').delete().eq('id', salonId);
    if (error) throw error;
    await loadData();
  };

  const saveGrado = async (gradoData, gradoId = null) => {
    const payload = { name: gradoData.name, numeric_level: Number(gradoData.numericLevel) };
    const query = gradoId ? supabase.from('grados').update(payload).eq('id', gradoId) : supabase.from('grados').insert(payload);
    const { error } = await query;
    if (error) throw error;
    await loadData();
  };

  const removeGrado = async gradoId => {
    const { error } = await supabase.from('grados').delete().eq('id', gradoId);
    if (error) throw error;
    await loadData();
  };

  const saveSubject = async (subjectData, subjectId = null) => {
    const trimmedName = (subjectData.name || '').trim();
    if (!trimmedName) {
      throw new Error('El nombre de la materia es obligatorio.');
    }

    // Validación de unicidad insensible a mayúsculas/minúsculas y espacios:
    const normalized = trimmedName.toLowerCase();
    const duplicate = subjectsRef.current.find(
      s => s.name.trim().toLowerCase() === normalized && s.id !== subjectId
    );
    if (duplicate) {
      throw new Error(`Ya existe una materia registrada con el nombre "${duplicate.name}".`);
    }

    const payload = {
      name: trimmedName,
      short_name: subjectData.shortName?.trim() || trimmedName,
      icon: subjectData.icon || 'BookOpen',
      color: subjectData.color || 'purple'
    };

    const query = subjectId
      ? supabase.from('asignaturas').update(payload).eq('id', subjectId)
      : supabase.from('asignaturas').insert(payload);

    const { error } = await query;
    if (error) {
      if (error.code === '23505' || error.message?.includes('unique') || error.message?.includes('duplicate')) {
        throw new Error(`Ya existe una materia registrada con el nombre "${trimmedName}".`);
      }
      throw error;
    }
    await loadData();
  };

  const saveTeacherSubjects = async (teacherId, subjectIds = []) => {
    if (!teacherId) return;
    try {
      await supabase.from('profesor_materias').delete().eq('teacher_id', teacherId);
      if (subjectIds.length > 0) {
        const rows = subjectIds.map(subId => ({
          teacher_id: teacherId,
          subject_id: subId
        }));
        await supabase.from('profesor_materias').insert(rows);
      }
    } catch (err) {
      console.warn('Advertencia al sincronizar profesor_materias:', err);
    }
    await loadData();
  };

  const saveScheduleBlock = async (blockData, blockId = null) => {
    const { classGroupId, subjectId, teacherId, dayOfWeek, startTime, endTime, topic } = blockData;
    if (!classGroupId || !subjectId || !dayOfWeek || !startTime || !endTime) {
      throw new Error('Faltan datos obligatorios para guardar la clase en el horario.');
    }

    const payload = {
      class_group_id: classGroupId,
      subject_id: subjectId,
      teacher_id: teacherId || null,
      day_of_week: Number(dayOfWeek),
      start_time: startTime,
      end_time: endTime,
      topic: topic || null,
      is_break: false
    };

    const query = blockId
      ? supabase.from('horarios').update(payload).eq('id', blockId)
      : supabase.from('horarios').insert(payload);

    const { error } = await query;
    if (error) throw error;
    await loadData();
  };

  const deleteScheduleBlock = async blockId => {
    if (!blockId) return;
    const { error } = await supabase.from('horarios').delete().eq('id', blockId);
    if (error) throw error;
    await loadData();
  };

  const removeSubject = async subjectId => {
    const { error } = await supabase.from('asignaturas').delete().eq('id', subjectId);
    if (error) throw error;
    await loadData();
  };

  const saveStudent = async (studentData, studentId = null) => {
    const payload = { full_name: studentData.name, document_number: studentData.documentNumber || null, student_code: studentData.studentCode, class_group_id: studentData.gradeId, guardian_id: studentData.guardianId, status: studentData.status || 'active' };
    const query = studentId
      ? supabase.from('estudiantes').update(payload).eq('id', studentId)
      : supabase.from('estudiantes').insert(payload);
    const { error } = await query;
    if (error) throw error;
    await loadData();
  };

  const removeStudent = async studentId => {
    const { error } = await supabase.from('estudiantes').delete().eq('id', studentId);
    if (error) throw error;
    await loadData();
  };

  const saveProfile = async (profileData, targetProfileId, role) => {
    const { error: baseError } = await supabase.from('perfiles').update({ full_name: profileData.fullName, email: profileData.email, avatar_url: profileData.avatarUrl || null }).eq('id', targetProfileId);
    if (baseError) throw baseError;
    const { error } = await supabase.from(roleTableFor(role)).update({ document_number: profileData.documentNumber || null, phone: profileData.phone || null }).eq('id', targetProfileId);
    if (error) throw error;
    await loadData();
  };

  const removeProfile = async (targetProfileId, role) => {
    // 1. Intentar borrar en cascada vía RPC si existe
    const { error: rpcError } = await supabase.rpc('eliminar_usuario_por_admin', { p_user_id: targetProfileId });
    if (rpcError) {
      // 2. Si no hay RPC, eliminar el registro del rol específico y de perfiles
      const table = role === 'teacher' ? 'perfiles_profesores' : 'perfiles_acudientes';
      const { error: roleError } = await supabase.from(table).delete().eq('id', targetProfileId);
      if (roleError) throw roleError;
      const { error: profileError } = await supabase.from('perfiles').delete().eq('id', targetProfileId);
      if (profileError) throw profileError;
    }
    await loadData();
  };

  const saveGradingSettings = async settings => {
    const payload = {
      id: true,
      format: settings.format,
      passing_value: Number(settings.passingValue),
      updated_at: new Date().toISOString()
    };
    if (profileId) {
      payload.updated_by = profileId;
    }
    let { error } = await supabase.from('configuracion_calificaciones').upsert(payload);
    if (error && (error.code === '23503' || error.message?.includes('foreign key'))) {
      delete payload.updated_by;
      const retry = await supabase.from('configuracion_calificaciones').upsert(payload);
      error = retry.error;
    }
    if (error) throw error;
    setGradingSettings({
      format: settings.format,
      passingValue: Number(settings.passingValue)
    });
  };

  return <AppContext.Provider value={{ currentRole: authenticatedRole, isLoading, isReady, loadError, salones, grados, grades, subjects, teachers, guardians, students, schedule, rawHorarios, tasks, attendances, teacherAssignments, teacherClassesMap, gradingSettings, activeTeacherId, setActiveTeacherId, activeStudentId, setActiveStudentId, guardianSection, setGuardianSection, teacherSection, setTeacherSection, activeTeacher, activeStudent, inAppAlerts, unreadAlertsForActiveStudent, unreadAlertsCount: unreadAlertsForActiveStudent, markAlertAsRead, markAllAlertsAsRead, refreshAlerts, reloadAcademicData, createTask, updateStudentGrade, saveGradesBatch, disputeGrade, submitGradeAppeal, resolveGradeAppeal, appeals, activeDeepLink, triggerDeepLink, clearDeepLink, notifyGuardian, confirmReadNotification, saveAttendance, saveAttendanceBatch, assignTeacherToCourse, saveSalon, removeSalon, saveGrado, removeGrado, saveCourse, removeCourse, saveSubject, removeSubject, saveTeacherSubjects, saveScheduleBlock, deleteScheduleBlock, saveStudent, removeStudent, saveProfile, removeProfile, saveGradingSettings, loadData }}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
}
