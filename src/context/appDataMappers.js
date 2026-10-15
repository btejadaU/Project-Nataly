import { countBy, groupBy, indexBy } from '../utils/collections.js';
import { getCachedProfiles, saveCachedProfiles } from '../utils/profilesCache.js';

export const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const gradeNumberByName = { Sexto: '6', Séptimo: '7', Octavo: '8', Noveno: '9', Décimo: '10', Undécimo: '11' };
const taskStatusLabels = { notified: 'Calificada y Notificada', graded: 'Calificada' };

export function mapCourse(course) {
  const gradeLabel = course.grados?.name || 'Grado';
  const courseName = `${gradeLabel} ${course.section}`;
  return {
    id: course.id,
    name: courseName,
    salon: course.salones?.name || 'Salón sin asignar',
    salonId: course.salon_id,
    building: course.salones?.building || '',
    director: 'Sin asignar',
    directorId: course.director_id ?? null,
    totalStudents: 0,
    gradeNum: gradeNumberByName[gradeLabel] || (course.grados?.numeric_level ? String(course.grados.numeric_level) : gradeLabel),
    section: course.section,
    gradeName: courseName,
    gradoId: course.grado_id
  };
}

export function inferNotificationType(notification) {
  if (notification?.metadata?.tipo) {
    return notification.metadata.tipo;
  }
  const title = (notification?.title || '').toLowerCase();
  const message = (notification?.message || '').toLowerCase();
  if (
    title.includes('revisión de calificación aceptada') ||
    title.includes('revisión aceptada') ||
    title.includes('revisión de calificación rechazada') ||
    title.includes('revisión rechazada')
  ) {
    return 'RESOLUCION_APELACION';
  }
  if (
    title.includes('inconformidad') ||
    title.includes('revisión') ||
    title.includes('disputa') ||
    title.includes('apelación')
  ) {
    return 'APELACION_NOTA';
  }
  if (
    title.includes('inasistencia') ||
    title.includes('falta') ||
    title.includes('asistencia') ||
    title.includes('llegada tarde') ||
    message.includes('inasistencia') ||
    message.includes('llegada tarde')
  ) {
    return 'INASISTENCIA';
  }
  if (
    title.includes('nueva tarea') ||
    title.includes('tarea:') ||
    title.includes('tarea asignada') ||
    title.includes('actividad asignada')
  ) {
    return 'TAREA';
  }
  return 'NOTA';
}

export function mapGradeRow(item, appeal = null) {
  return {
    score: item.score,
    letterGrade: item.letter_grade || null,
    teacherNote: item.teacher_note || '',
    aiMessage: item.ai_message || '',
    isNotified: Boolean(item.is_notified),
    notifiedAt: item.notified_at,
    isRead: Boolean(item.is_read),
    readAt: item.read_at,
    appealStatus: appeal?.estado || appeal?.status || 'CALIFICADA',
    appeal: appeal || null
  };
}

export function mapNotification(notification) {
  const meta = notification?.metadata || {};
  const tipo = meta.tipo || inferNotificationType(notification);
  const referenciaId = meta.referencia_id || notification.assignment_id || notification.id;

  return {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    taskId: notification.assignment_id,
    studentId: notification.student_id,
    recipientId: notification.recipient_id,
    timestamp: notification.created_at,
    read: Boolean(notification.is_read),
    tipo,
    referencia_id: referenciaId,
    metadata: {
      ...meta,
      tipo,
      referencia_id: referenciaId
    }
  };
}

export function buildAlertsList({ rawNotifications = [], tasks = [], students = [], subjects = [], readAlertIds = new Set() } = {}) {
  const subjectsById = indexBy(subjects);

  // 1. Notificaciones reales desde BD con filtro de idempotencia y deduplicación por clave compuesta
  const seenNotifIds = new Set();
  const seenCompositeKeys = new Set();
  const seenTaskStudentIds = new Set();
  const dbAlerts = [];

  for (const item of rawNotifications || []) {
    if (!item?.id || seenNotifIds.has(item.id)) {
      continue;
    }

    const mapped = mapNotification(item);
    const tipo = mapped.tipo;
    const refId = mapped.referencia_id || item.assignment_id || '';
    const studentId = item.student_id || '';

    // Ventana temporal de deduplicación (2 minutos) para agrupar despachos idénticos del mismo evento
    const ts = item.created_at || item.timestamp;
    const timeBucket = ts ? Math.floor(new Date(ts).getTime() / 120000) : 0;
    const normalizedTitle = (item.title || '').toLowerCase().trim().replace(/\s+/g, ' ');

    const compositeKey = refId && studentId
      ? `${studentId}:${tipo}:${refId}:${timeBucket}`
      : `${studentId}:${normalizedTitle}:${timeBucket}`;

    if (seenCompositeKeys.has(compositeKey)) {
      continue;
    }

    seenNotifIds.add(item.id);
    seenCompositeKeys.add(compositeKey);

    if (item.assignment_id && item.student_id) {
      seenTaskStudentIds.add(`task:${item.assignment_id}:${item.student_id}`);
    }

    const isLocallyRead = readAlertIds.has(String(item.id));
    dbAlerts.push({
      ...mapped,
      read: Boolean(item.is_read || isLocallyRead)
    });
  }

  // 2. Notificaciones sintetizadas para tareas del curso del estudiante sin notificación previa en BD
  const taskAlerts = [];
  for (const task of tasks || []) {
    const studentsInGrade = (students || []).filter(s => s.gradeId === task.gradeId);
    for (const student of studentsInGrade) {
      const taskEventKey = `task:${task.id}:${student.id}`;
      if (!seenTaskStudentIds.has(taskEventKey)) {
        seenTaskStudentIds.add(taskEventKey);
        const virtualId = `task-virtual-${task.id}-${student.id}`;
        const isLocallyRead = readAlertIds.has(virtualId);
        const subjectName = task.subjectName || subjectsById.get(task.subjectId)?.name || 'la materia';
        const formattedDue = task.dueDate ? ` Fecha de entrega: ${task.dueDate}.` : '';

        taskAlerts.push({
          id: virtualId,
          title: `Nueva Tarea: ${task.title}`,
          message: `El docente asignó una nueva tarea en ${subjectName}: "${task.title}".${formattedDue}`,
          taskId: task.id,
          studentId: student.id,
          recipientId: student.guardianId,
          timestamp: task.assignedDate || task.dueDate || new Date().toISOString(),
          read: Boolean(isLocallyRead),
          isVirtual: true,
          tipo: 'TAREA',
          referencia_id: task.id,
          metadata: {
            tipo: 'TAREA',
            referencia_id: task.id
          }
        });
      }
    }
  }

  const allAlerts = [...dbAlerts, ...taskAlerts];
  allAlerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return allAlerts;
}

/**
 * Prepara índices para `mapTask`. Las calificaciones se agrupan por tarea una sola vez,
 * en lugar de recorrer todas las calificaciones por cada tarea (O(T·G) → O(T + G)).
 */
export function createTaskLookups({ grades = [], subjects = [], teachers = [], profiles = [], assignments = [], gradeRows = [], appeals = [] } = {}) {
  const appealsByKey = new Map();
  for (const a of appeals || []) {
    const key = `${a.assignment_id || a.taskId}:${a.student_id || a.studentId}`;
    appealsByKey.set(key, a);
  }

  const teacherAssignmentsMap = new Map();
  for (const a of assignments || []) {
    if (a.class_group_id && a.subject_id && a.teacher_id) {
      teacherAssignmentsMap.set(`${a.class_group_id}:${a.subject_id}`, a.teacher_id);
    }
  }

  return {
    gradesById: indexBy(grades),
    subjectsById: indexBy(subjects),
    teachersById: indexBy(teachers),
    profilesById: indexBy(profiles),
    teacherAssignmentsMap,
    gradeRowsByTask: groupBy(gradeRows, item => item.assignment_id),
    appealsByKey
  };
}

export function resolveTeacherName(task, lookups) {
  if (!lookups) return null;

  // 1. Búsqueda directa por teacher_id en teachersById
  if (task.teacher_id) {
    const teacher = lookups.teachersById?.get(task.teacher_id);
    if (teacher?.name && teacher.name.trim() && teacher.name !== 'Docente') {
      return teacher.name.trim();
    }
    const profile = lookups.profilesById?.get(task.teacher_id);
    const profileName = profile?.full_name || profile?.name;
    if (profileName && profileName.trim() && profileName !== 'Docente') {
      return profileName.trim();
    }
    const cached = getCachedProfiles();
    const cachedProfile = cached?.[task.teacher_id];
    const cachedName = cachedProfile?.full_name || cachedProfile?.name;
    if (cachedName && cachedName.trim() && cachedName !== 'Docente') {
      return cachedName.trim();
    }
  }

  // 2. Búsqueda por relación de curso y materia en asignaciones docentes
  const courseId = task.class_group_id || task.gradeId;
  const subjectId = task.subject_id || task.subjectId;
  if (courseId && subjectId && lookups.teacherAssignmentsMap) {
    const assignedTeacherId = lookups.teacherAssignmentsMap.get(`${courseId}:${subjectId}`);
    if (assignedTeacherId) {
      const teacher = lookups.teachersById?.get(assignedTeacherId);
      if (teacher?.name && teacher.name.trim() && teacher.name !== 'Docente') {
        return teacher.name.trim();
      }
      const profile = lookups.profilesById?.get(assignedTeacherId);
      const profileName = profile?.full_name || profile?.name;
      if (profileName && profileName.trim() && profileName !== 'Docente') {
        return profileName.trim();
      }
    }
  }

  return null;
}

export function mapTask(task, lookups) {
  const grade = lookups.gradesById?.get(task.class_group_id);
  const subject = lookups.subjectsById?.get(task.subject_id);
  const teacherName = resolveTeacherName(task, lookups);
  const studentGrades = {};
  for (const item of lookups.gradeRowsByTask?.get(task.id) || []) {
    const appealKey = `${task.id}:${item.student_id}`;
    const appeal = lookups.appealsByKey?.get(appealKey) || null;
    studentGrades[item.student_id] = mapGradeRow(item, appeal);
  }
  return {
    id: task.id,
    title: task.title,
    subjectId: task.subject_id,
    subjectName: subject?.name || 'Asignatura',
    gradeId: task.class_group_id,
    gradeName: grade?.name || 'Curso',
    teacherId: task.teacher_id,
    teacherName: teacherName || null,
    assignedDate: task.assigned_at?.split('T')[0],
    dueDate: task.due_date,
    description: task.description || '',
    status: taskStatusLabels[task.status] || 'Pendiente de Calificar',
    studentGrades
  };
}

/**
 * Transforma las filas crudas de Supabase en el estado que consume la UI.
 * Función pura: todas las relaciones se resuelven con índices en O(n).
 */
export function buildAppData(raw, options = {}) {
  const courseRows = raw.cursos || [];
  const studentRows = raw.estudiantes || [];
  const assignmentRows = raw.asignaciones || [];
  const guardianRoleRows = raw.acudientes || [];
  const teacherRoleRows = raw.profesores || [];

  const roleById = new Map([
    ...(raw.administradores || []).map(item => [item.id, 'admin']),
    ...teacherRoleRows.map(item => [item.id, 'teacher']),
    ...guardianRoleRows.map(item => [item.id, 'guardian'])
  ]);
  const guardianMap = indexBy(guardianRoleRows);
  const teacherMap = indexBy(teacherRoleRows);

  const profileRows = (raw.perfiles || []).map(profileRow => {
    const g = guardianMap.get(profileRow.id);
    const t = teacherMap.get(profileRow.id);
    return {
      ...profileRow,
      role: roleById.get(profileRow.id),
      document_number: g?.document_number || t?.document_number || '',
      phone: g?.phone || t?.phone || ''
    };
  });
  const profilesById = indexBy(profileRows);

  // Sincronizar y obtener perfiles cacheados (vital ante políticas RLS restrictivas en Supabase)
  const cachedProfiles = getCachedProfiles();
  if (profileRows.length > 1) {
    saveCachedProfiles(profileRows);
  }

  const studentsByCourse = countBy(studentRows, student => student.class_group_id);
  const grades = courseRows.map(course => ({ ...mapCourse(course), totalStudents: studentsByCourse.get(course.id) || 0 }));
  const gradesById = indexBy(grades);

  const subjects = (raw.asignaturas || []).map(subject => ({ id: subject.id, name: subject.name, shortName: subject.short_name, icon: subject.icon, color: subject.color, teacher: '' }));
  const subjectsById = indexBy(subjects);

  const teacherSubjectRows = raw.profesorMaterias || raw.profesor_materias || [];
  const teacherSubjectsMap = new Map();
  for (const row of teacherSubjectRows) {
    if (!teacherSubjectsMap.has(row.teacher_id)) {
      teacherSubjectsMap.set(row.teacher_id, new Set());
    }
    teacherSubjectsMap.get(row.teacher_id).add(row.subject_id);
  }
  for (const a of assignmentRows) {
    if (a.teacher_id && a.subject_id) {
      if (!teacherSubjectsMap.has(a.teacher_id)) {
        teacherSubjectsMap.set(a.teacher_id, new Set());
      }
      teacherSubjectsMap.get(a.teacher_id).add(a.subject_id);
    }
  }

  const assignmentsByTeacher = groupBy(assignmentRows, item => item.teacher_id);
  const teachers = profileRows.filter(item => item.role === 'teacher').map(teacher => {
    const assignments = assignmentsByTeacher.get(teacher.id) || [];
    const teacherSubjSet = teacherSubjectsMap.get(teacher.id) || new Set();
    const subjectIds = Array.from(teacherSubjSet);
    const teacherSubjectNames = subjectIds.map(id => subjectsById.get(id)?.name).filter(Boolean);
    return {
      id: teacher.id,
      name: teacher.full_name,
      email: teacher.email,
      phone: teacher.phone,
      documentNumber: teacher.document_number,
      subjectIds,
      subjects: teacherSubjectNames,
      subject: teacherSubjectNames.join(', ') || subjectsById.get(assignments[0]?.subject_id)?.name || 'Sin asignatura asignada',
      grades: assignments.map(item => gradesById.get(item.class_group_id)?.name).filter(Boolean),
      avatar: null
    };
  });
  const teachersById = indexBy(teachers);

  const students = studentRows.map(student => {
    const course = gradesById.get(student.class_group_id);
    const guardianId = student.guardian_id || student.guardianId || null;
    const guardian = profilesById.get(guardianId) || (guardianId ? cachedProfiles[guardianId] : null);
    const rawGuardianName = guardian?.full_name || guardian?.name || '';
    const guardianFullName = rawGuardianName ? rawGuardianName.trim() : '';
    const resolvedGuardian = guardianFullName ? {
      id: guardian?.id || guardianId,
      name: guardianFullName,
      nombre: guardianFullName,
      phone: guardian?.phone || '',
      email: guardian?.email || '',
      document_number: guardian?.document_number || ''
    } : null;

    return {
      id: student.id,
      name: student.full_name,
      documentNumber: student.document_number || '',
      studentCode: student.student_code,
      gradeId: student.class_group_id,
      gradeName: course?.name || 'Curso sin asignar',
      avatar: null,
      guardianId,
      guardianName: guardianFullName,
      guardian: resolvedGuardian,
      acudiente: resolvedGuardian,
      tutor: resolvedGuardian,
      guardianPhone: guardian?.phone || '',
      guardianEmail: guardian?.email || '',
      status: student.status === 'active' ? 'Activo' : 'Inactivo'
    };
  });

  const scheduleByDay = groupBy(raw.horarios || [], item => item.day_of_week);
  const schedule = dayNames.slice(1).map((day, index) => ({
    day,
    periods: (scheduleByDay.get(index + 1) || []).map(item => {
      const course = gradesById.get(item.class_group_id);
      const startFmt = (item.start_time || '').slice(0, 5);
      const endFmt = (item.end_time || '').slice(0, 5);
      return {
        id: item.id,
        time: `${startFmt} - ${endFmt}`,
        startTime: item.start_time,
        endTime: item.end_time,
        dayOfWeek: item.day_of_week,
        subjectId: item.subject_id,
        teacherId: item.teacher_id,
        classGroupId: item.class_group_id,
        subject: subjectsById.get(item.subject_id)?.name || (item.is_break ? item.label : 'Clase'),
        teacher: teachersById.get(item.teacher_id)?.name || '',
        courseName: course?.name || 'Curso',
        room: course?.salon || 'Aula',
        topic: item.topic,
        homeworkDue: null,
        isBreak: item.is_break,
        label: item.label
      };
    })
  })).filter(item => item.periods.length);

  const taskLookups = createTaskLookups({
    grades,
    subjects,
    teachers,
    profiles: profileRows,
    assignments: assignmentRows,
    gradeRows: raw.calificaciones || [],
    appeals: raw.appeals || []
  });

  const tasks = (raw.tareas || []).map(task => mapTask(task, taskLookups));
  const alerts = options.role === 'admin'
    ? []
    : buildAlertsList({
        rawNotifications: raw.notificaciones || [],
        tasks,
        students,
        subjects,
        readAlertIds: options.readAlertIds || new Set()
      });

  return {
    salones: raw.salones || [],
    grados: raw.grados || [],
    grades,
    subjects,
    teachers,
    guardians: profileRows.filter(item => item.role === 'guardian').length > 0
      ? profileRows.filter(item => item.role === 'guardian')
      : Object.values(cachedProfiles).filter(Boolean),
    students,
    schedule,
    rawHorarios: raw.horarios || [],
    horarios: raw.horarios || [],
    tasks,
    alerts,
    attendances: raw.asistencias || [],
    teacherAssignments: assignmentRows,
    gradingSettings: raw.configuracionCalificaciones
      ? { format: raw.configuracionCalificaciones.format, passingValue: raw.configuracionCalificaciones.passing_value }
      : null
  };
}
