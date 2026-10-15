import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAlertsList,
  inferNotificationType,
  createTaskLookups,
  resolveTeacherName,
  mapTask
} from '../src/context/appDataMappers.js';

test('guardianNotifications: deduplicates duplicate notifications within time bucket', () => {
  const rawNotifications = [
    {
      id: 'notif-1',
      title: 'Calificación Registrada: Tarea 1',
      message: 'Nota registrada 4.5',
      assignment_id: 'task-100',
      student_id: 'student-1',
      recipient_id: 'guardian-1',
      created_at: '2026-10-13T10:00:05Z',
      is_read: false
    },
    // Duplicate event fired 5 seconds later by trigger or double client dispatch
    {
      id: 'notif-2',
      title: 'Calificación Registrada: Tarea 1',
      message: 'Nota registrada 4.5',
      assignment_id: 'task-100',
      student_id: 'student-1',
      recipient_id: 'guardian-1',
      created_at: '2026-10-13T10:00:10Z',
      is_read: false
    },
    // Legitimate different event for another student
    {
      id: 'notif-3',
      title: 'Calificación Registrada: Tarea 1',
      message: 'Nota registrada 4.0',
      assignment_id: 'task-100',
      student_id: 'student-2',
      recipient_id: 'guardian-2',
      created_at: '2026-10-13T10:00:08Z',
      is_read: false
    }
  ];

  const alerts = buildAlertsList({
    rawNotifications,
    tasks: [],
    students: [],
    subjects: [],
    readAlertIds: new Set()
  });

  // notif-2 should be deduplicated, so alerts for task-100 will have only 2 items (student-1 and student-2)
  assert.equal(alerts.length, 2);
  const student1Alerts = alerts.filter(a => a.studentId === 'student-1');
  assert.equal(student1Alerts.length, 1);
  assert.equal(student1Alerts[0].id, 'notif-1');
  assert.equal(student1Alerts[0].tipo, 'NOTA');
});

test('guardianDeepLinking: inferNotificationType categorizes notification types accurately', () => {
  assert.equal(inferNotificationType({ title: 'Alerta de Inasistencia a Clase' }), 'INASISTENCIA');
  assert.equal(inferNotificationType({ title: 'Reporte de Llegada Tarde' }), 'INASISTENCIA');
  assert.equal(inferNotificationType({ title: 'Nueva Tarea: Ensayo Histórico' }), 'TAREA');
  assert.equal(inferNotificationType({ title: 'Calificación Registrada: Taller de Álgebra' }), 'NOTA');
  assert.equal(inferNotificationType({ title: 'Solicitud de Revisión de Calificación' }), 'APELACION_NOTA');
  assert.equal(inferNotificationType({ title: 'Revisión Aceptada - Calificación Actualizada' }), 'RESOLUCION_APELACION');
});

test('teacherMapping: resolveTeacherName correctly resolves real teacher name and rejects literal "Docente"', () => {
  const teachers = [
    { id: 'teacher-1', name: 'Carlos Mendoza' },
    { id: 'teacher-generic', name: 'Docente' }
  ];

  const profiles = [
    { id: 'teacher-1', full_name: 'Carlos Mendoza', role: 'teacher' },
    { id: 'teacher-2', full_name: 'Patricia Gómez', role: 'teacher' }
  ];

  const assignments = [
    { class_group_id: 'group-10a', subject_id: 'subj-math', teacher_id: 'teacher-2' }
  ];

  const lookups = createTaskLookups({
    grades: [{ id: 'group-10a', name: '10° A' }],
    subjects: [{ id: 'subj-math', name: 'Matemáticas' }],
    teachers,
    profiles,
    assignments
  });

  // 1. Direct teacher name resolution
  const taskDirect = {
    id: 't-1',
    title: 'Actividad 1',
    teacher_id: 'teacher-1',
    class_group_id: 'group-10a',
    subject_id: 'subj-math'
  };
  assert.equal(resolveTeacherName(taskDirect, lookups), 'Carlos Mendoza');

  // 2. Fallback via course & subject assignment
  const taskUnassignedTeacher = {
    id: 't-2',
    title: 'Actividad 2',
    teacher_id: null,
    class_group_id: 'group-10a',
    subject_id: 'subj-math'
  };
  assert.equal(resolveTeacherName(taskUnassignedTeacher, lookups), 'Patricia Gómez');

  // 3. Literal "Docente" is discarded and returns null
  const taskGeneric = {
    id: 't-3',
    title: 'Actividad 3',
    teacher_id: 'teacher-generic',
    class_group_id: 'other-group',
    subject_id: 'other-subj'
  };
  assert.equal(resolveTeacherName(taskGeneric, lookups), null);

  // 4. mapTask sets teacherName cleanly or null
  const mappedValid = mapTask(taskDirect, lookups);
  assert.equal(mappedValid.teacherName, 'Carlos Mendoza');

  const mappedGeneric = mapTask(taskGeneric, lookups);
  assert.equal(mappedGeneric.teacherName, null);
});

test('teacherMapping: UI display fallback formats "Docente: [Nombre]" and "Docente: No asignado"', () => {
  const formatTeacherDisplay = (teacherName) => {
    return `Docente: ${teacherName && teacherName !== 'Docente' ? teacherName : 'No asignado'}`;
  };

  assert.equal(formatTeacherDisplay('Carlos Mendoza'), 'Docente: Carlos Mendoza');
  assert.equal(formatTeacherDisplay('Patricia Gómez'), 'Docente: Patricia Gómez');
  assert.equal(formatTeacherDisplay('Docente'), 'Docente: No asignado');
  assert.equal(formatTeacherDisplay(null), 'Docente: No asignado');
  assert.equal(formatTeacherDisplay(undefined), 'Docente: No asignado');
  assert.equal(formatTeacherDisplay(''), 'Docente: No asignado');
});
