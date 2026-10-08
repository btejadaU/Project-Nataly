import { countBy, groupBy, indexBy } from '../utils/collections.js';

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

export function mapGradeRow(item) {
  return {
    score: item.score,
    teacherNote: item.teacher_note || '',
    aiMessage: item.ai_message || '',
    isNotified: item.is_notified,
    notifiedAt: item.notified_at,
    isRead: item.is_read,
    readAt: item.read_at
  };
}

export function mapNotification(notification) {
  return {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    taskId: notification.assignment_id,
    studentId: notification.student_id,
    recipientId: notification.recipient_id,
    timestamp: notification.created_at,
    read: Boolean(notification.is_read)
  };
}

export function buildAlertsList({ rawNotifications = [], tasks = [], students = [], subjects = [], readAlertIds = new Set() } = {}) {
  const subjectsById = indexBy(subjects);

  // 1. Notificaciones reales desde BD
  const dbAlerts = (rawNotifications || []).map(item => {
    const isLocallyRead = readAlertIds.has(String(item.id));
    return {
      ...mapNotification(item),
      read: Boolean(item.is_read || isLocallyRead)
    };
  });

  // 2. Mapear claves existentes de tareas para no generar duplicados
  const existingTaskNotifKeys = new Set();
  for (const item of rawNotifications || []) {
    if (item.assignment_id && item.student_id) {
      existingTaskNotifKeys.add(`${item.assignment_id}:${item.student_id}`);
    }
  }

  // 3. Notificaciones sintetizadas para tareas del curso del estudiante sin notificación previa en BD
  const taskAlerts = [];
  for (const task of tasks || []) {
    const studentsInGrade = (students || []).filter(s => s.gradeId === task.gradeId);
    for (const student of studentsInGrade) {
      const key = `${task.id}:${student.id}`;
      if (!existingTaskNotifKeys.has(key)) {
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
          isVirtual: true
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
export function createTaskLookups({ grades = [], subjects = [], teachers = [], gradeRows = [] } = {}) {
  return {
    gradesById: indexBy(grades),
    subjectsById: indexBy(subjects),
    teachersById: indexBy(teachers),
    gradeRowsByTask: groupBy(gradeRows, item => item.assignment_id)
  };
}

export function mapTask(task, lookups) {
  const grade = lookups.gradesById.get(task.class_group_id);
  const subject = lookups.subjectsById.get(task.subject_id);
  const teacher = lookups.teachersById.get(task.teacher_id);
  const studentGrades = {};
  for (const item of lookups.gradeRowsByTask.get(task.id) || []) {
    studentGrades[item.student_id] = mapGradeRow(item);
  }
  return {
    id: task.id,
    title: task.title,
    subjectId: task.subject_id,
    subjectName: subject?.name || 'Asignatura',
    gradeId: task.class_group_id,
    gradeName: grade?.name || 'Curso',
    teacherId: task.teacher_id,
    teacherName: teacher?.name || 'Docente',
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

  const studentsByCourse = countBy(studentRows, student => student.class_group_id);
  const grades = courseRows.map(course => ({ ...mapCourse(course), totalStudents: studentsByCourse.get(course.id) || 0 }));
  const gradesById = indexBy(grades);

  const subjects = (raw.asignaturas || []).map(subject => ({ id: subject.id, name: subject.name, shortName: subject.short_name, icon: subject.icon, color: subject.color, teacher: '' }));
  const subjectsById = indexBy(subjects);

  const assignmentsByTeacher = groupBy(assignmentRows, item => item.teacher_id);
  const teachers = profileRows.filter(item => item.role === 'teacher').map(teacher => {
    const assignments = assignmentsByTeacher.get(teacher.id) || [];
    return {
      id: teacher.id,
      name: teacher.full_name,
      email: teacher.email,
      phone: teacher.phone,
      subject: subjectsById.get(assignments[0]?.subject_id)?.name || 'Sin asignatura asignada',
      grades: assignments.map(item => gradesById.get(item.class_group_id)?.name).filter(Boolean),
      avatar: teacher.avatar_url
    };
  });
  const teachersById = indexBy(teachers);

  const students = studentRows.map(student => {
    const course = gradesById.get(student.class_group_id);
    const guardian = profilesById.get(student.guardian_id);
    return {
      id: student.id,
      name: student.full_name,
      documentNumber: student.document_number || '',
      studentCode: student.student_code,
      gradeId: student.class_group_id,
      gradeName: course?.name || 'Curso sin asignar',
      avatar: student.avatar_url || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(student.full_name)}`,
      guardianId: student.guardian_id,
      guardianName: guardian?.full_name || 'Sin acudiente',
      guardianKinship: 'Acudiente',
      guardianPhone: guardian?.phone || '',
      guardianEmail: guardian?.email || '',
      status: student.status === 'active' ? 'Activo' : 'Inactivo'
    };
  });

  const scheduleByDay = groupBy(raw.horarios || [], item => item.day_of_week);
  const schedule = dayNames.slice(1).map((day, index) => ({
    day,
    periods: (scheduleByDay.get(index + 1) || []).map(item => ({
      time: `${item.start_time} - ${item.end_time}`,
      subject: subjectsById.get(item.subject_id)?.name || (item.is_break ? item.label : 'Clase'),
      teacher: teachersById.get(item.teacher_id)?.name || '',
      topic: item.topic,
      homeworkDue: null,
      isBreak: item.is_break,
      label: item.label
    }))
  })).filter(item => item.periods.length);

  const taskLookups = {
    gradesById,
    subjectsById,
    teachersById,
    gradeRowsByTask: groupBy(raw.calificaciones || [], item => item.assignment_id)
  };

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
    guardians: profileRows.filter(item => item.role === 'guardian'),
    students,
    schedule,
    tasks,
    alerts,
    attendances: raw.asistencias || [],
    teacherAssignments: assignmentRows,
    gradingSettings: raw.configuracionCalificaciones
      ? { format: raw.configuracionCalificaciones.format, passingValue: raw.configuracionCalificaciones.passing_value }
      : null
  };
}
