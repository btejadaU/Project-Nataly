import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { buildAppData, buildAlertsList, createTaskLookups, mapTask } from './appDataMappers';
import { getReadAlertIds, saveReadAlertId, saveMultipleReadAlertIds } from '../utils/notificationsStorage';
import { countBy, indexBy } from '../utils/collections';
import { toLocalISODate } from '../utils/formatters';

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
  const [tasks, setTasks] = useState([]);
  const [teacherAssignments, setTeacherAssignments] = useState([]);
  const [inAppAlerts, setInAppAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [attendances, setAttendances] = useState([]);
  const [activeTeacherId, setActiveTeacherId] = useState(null);
  const [activeStudentId, setActiveStudentId] = useState(null);
  const [guardianSection, setGuardianSection] = useState('grades');
  const [gradingSettings, setGradingSettings] = useState({ format: 'one_five', passingValue: 3 });

  const isMountedRef = useRef(true);
  const loadRequestRef = useRef(0);
  const tasksRef = useRef(tasks);
  const studentsRef = useRef(students);
  const subjectsRef = useRef(subjects);
  const gradesRef = useRef(grades);
  const teachersRef = useRef(teachers);
  const pendingGradeWritesRef = useRef(new Map());
  const gradeWriteChainRef = useRef(new Map());

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
        supabase.from('asistencias').select('*').order('date', { ascending: false })
      ]);
      if (isStale()) return;
      const failed = firstError(results);
      if (failed) {
        setLoadError(failed.message);
        return;
      }

      const [salonResult, gradoResult, courseResult, subjectResult, profileResult, studentResult, assignmentResult, scheduleResult, taskResult, gradeResult, notificationResult, adminRoleResult, teacherRoleResult, guardianRoleResult, gradingResult, attendanceResult] = results;
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
        asistencias: attendanceResult.data
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

  useEffect(() => {
    if (!supabase || authenticatedRole === 'admin') return;

    // Sincronización en tiempo real vía Realtime Channel
    const channel = supabase
      .channel('notificaciones-realtime-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notificaciones' }, () => {
        refreshAlerts();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tareas' }, () => {
        loadData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'asistencias' }, () => {
        refreshAlerts();
        loadData();
      })
      .subscribe();

    // Sondeo de respaldo periódico (cada 15s) y al enfocar pestaña
    const interval = setInterval(() => {
      refreshAlerts();
    }, 15000);

    const onWindowFocus = () => {
      refreshAlerts();
    };
    window.addEventListener('focus', onWindowFocus);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
      window.removeEventListener('focus', onWindowFocus);
    };
  }, [refreshAlerts, loadData, authenticatedRole]);

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
      return true;
    }).length;
  }, [inAppAlerts, authenticatedRole, activeStudentId]);

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
  }, [inAppAlerts, authenticatedRole, activeStudentId]);

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
    const mapped = mapTask(data, createTaskLookups({ grades, subjects, teachers }));
    setTasks(current => [mapped, ...current]);

    // Notificar a los acudientes de los estudiantes de este curso
    const studentsInCourse = students.filter(s => s.gradeId === newTaskData.gradeId && s.guardianId);
    const subject = subjects.find(s => s.id === newTaskData.subjectId);
    const subjectName = subject?.name || 'la materia';
    const dueDateFormatted = newTaskData.dueDate ? `. Fecha de entrega: ${newTaskData.dueDate}` : '';

    if (studentsInCourse.length > 0) {
      const notifRows = studentsInCourse.map(st => ({
        recipient_id: st.guardianId,
        student_id: st.id,
        assignment_id: data.id,
        title: `Nueva Tarea: ${newTaskData.title}`,
        message: `Se asignó una nueva tarea en ${subjectName}: "${newTaskData.title}"${dueDateFormatted}.`,
        is_read: false
      }));

      try {
        await supabase.from('notificaciones').insert(notifRows);
      } catch (err) {
        console.warn('Inserción directa de notificaciones (posible RLS o trigger):', err);
      }
    }

    await refreshAlerts();
    return mapped;
  };

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
    const results = await Promise.all([
      supabase.from('calificaciones').update({ is_notified: true, notified_at: notifiedAt, is_read: false }).eq('assignment_id', taskId).eq('student_id', studentId),
      supabase.from('tareas').update({ status: 'notified' }).eq('id', taskId),
      supabase.from('notificaciones').insert({ recipient_id: guardianId, student_id: studentId, assignment_id: taskId, title: `Calificación notificada para ${student.name.split(' ')[0]}`, message: `${task.subjectName}: calificación de ${grade.score ?? 'N/A'} en "${task.title}".`, is_read: false }).select().single()
    ]);
    const failed = firstError(results);
    if (failed) throw failed;

    const alert = results[2].data;
    setTasks(current => current.map(item => item.id === taskId ? { ...item, status: 'Calificada y Notificada', studentGrades: { ...item.studentGrades, [studentId]: { ...item.studentGrades?.[studentId], isNotified: true, notifiedAt, isRead: false } } } : item));
    if (alert) setInAppAlerts(current => [{ id: alert.id, title: alert.title, message: alert.message, taskId, studentId, timestamp: 'Justo ahora', read: false }, ...current]);
  };

  const confirmReadNotification = async (taskId, studentId) => {
    const readAt = new Date().toISOString();
    const { error } = await supabase.rpc('confirmar_lectura_calificacion', { p_assignment_id: taskId, p_student_id: studentId });
    if (error) throw error;
    setTasks(current => current.map(task => task.id === taskId ? { ...task, studentGrades: { ...task.studentGrades, [studentId]: { ...task.studentGrades[studentId], isRead: true, readAt } } } : task));
    setInAppAlerts(current => current.map(alert => alert.taskId === taskId && alert.studentId === studentId ? { ...alert, read: true } : alert));
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
    // Si hubo inasistencia o tardanza, recargar alertas para mostrar inmediatamente la notificación
    if (payload.some(row => row.status === 'ausente' || row.status === 'tardanza')) {
      await refreshAlerts();
    }
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
    const payload = { name: subjectData.name, short_name: subjectData.shortName, icon: subjectData.icon || 'BookOpen', color: subjectData.color || 'purple' };
    const query = subjectId
      ? supabase.from('asignaturas').update(payload).eq('id', subjectId)
      : supabase.from('asignaturas').insert(payload);
    const { error } = await query;
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
    const { error } = await supabase.from('configuracion_calificaciones').upsert({ id: true, format: settings.format, passing_value: settings.passingValue, updated_by: profileId, updated_at: new Date().toISOString() });
    if (error) throw error;
    setGradingSettings(settings);
  };

  return <AppContext.Provider value={{ currentRole: authenticatedRole, isLoading, isReady, loadError, salones, grados, grades, subjects, teachers, guardians, students, schedule, tasks, attendances, teacherAssignments, teacherClassesMap, gradingSettings, activeTeacherId, setActiveTeacherId, activeStudentId, setActiveStudentId, guardianSection, setGuardianSection, activeTeacher, activeStudent, inAppAlerts, unreadAlertsForActiveStudent, unreadAlertsCount: unreadAlertsForActiveStudent, markAlertAsRead, markAllAlertsAsRead, refreshAlerts, createTask, updateStudentGrade, notifyGuardian, confirmReadNotification, saveAttendance, saveAttendanceBatch, assignTeacherToCourse, saveSalon, removeSalon, saveGrado, removeGrado, saveCourse, removeCourse, saveSubject, removeSubject, saveStudent, removeStudent, saveProfile, removeProfile, saveGradingSettings, loadData }}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
}
