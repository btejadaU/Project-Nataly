import test from 'node:test';
import assert from 'node:assert/strict';

import { indexBy, groupBy, countBy } from '../src/utils/collections.js';
import { escapeHtml, toLocalISODate, pluralize, roleLabel, formatNotificationDate } from '../src/utils/formatters.js';
import { isUpdateRequired, CURRENT_VERSION } from '../src/utils/version.js';
import { resolveGradeCode, generateStudentCode } from '../src/utils/studentCode.js';
import { mapCourse, mapGradeRow, createTaskLookups, mapTask, buildAlertsList, buildAppData } from '../src/context/appDataMappers.js';

test('collections: indexBy handles arrays, defaults to item.id, and keeps first match', () => {
  const items = [
    { id: '1', name: 'Alpha' },
    { id: '2', name: 'Beta' },
    { id: '1', name: 'Alpha Dup' }
  ];
  const indexed = indexBy(items);
  assert.equal(indexed.size, 2);
  assert.equal(indexed.get('1')?.name, 'Alpha');
  assert.equal(indexed.get('2')?.name, 'Beta');

  // Custom key getter
  const byName = indexBy(items, x => x.name);
  assert.equal(byName.get('Beta')?.id, '2');

  // Null / empty input
  assert.equal(indexBy(null).size, 0);
  assert.equal(indexBy([]).size, 0);
});

test('collections: groupBy aggregates items into arrays', () => {
  const items = [
    { cat: 'A', val: 1 },
    { cat: 'B', val: 2 },
    { cat: 'A', val: 3 }
  ];
  const grouped = groupBy(items, x => x.cat);
  assert.deepEqual(grouped.get('A'), [
    { cat: 'A', val: 1 },
    { cat: 'A', val: 3 }
  ]);
  assert.deepEqual(grouped.get('B'), [{ cat: 'B', val: 2 }]);
  assert.equal(groupBy(null, x => x).size, 0);
});

test('collections: countBy tallies elements accurately', () => {
  const items = ['apple', 'banana', 'apple', 'orange', 'banana', 'apple'];
  const counts = countBy(items, x => x);
  assert.equal(counts.get('apple'), 3);
  assert.equal(counts.get('banana'), 2);
  assert.equal(counts.get('orange'), 1);
  assert.equal(countBy(null, x => x).size, 0);
});

test('formatters: escapeHtml escapes dangerous characters and handles edge cases', () => {
  assert.equal(escapeHtml('<script>alert("XSS & \'attack\'")</script>'), '&lt;script&gt;alert(&quot;XSS &amp; &#39;attack&#39;&quot;)&lt;/script&gt;');
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtml(123), '123');
  assert.equal(escapeHtml('Texto seguro'), 'Texto seguro');
});

test('formatters: toLocalISODate produces YYYY-MM-DD from local date components', () => {
  const specificDate = new Date(2026, 9, 8, 20, 30, 0); // Octubre 8, 2026
  assert.equal(toLocalISODate(specificDate), '2026-10-08');

  const janDate = new Date(2026, 0, 5); // Enero 5, 2026
  assert.equal(toLocalISODate(janDate), '2026-01-05');
});

test('formatters: pluralize and roleLabel work as expected', () => {
  assert.equal(pluralize(1, 'estudiante'), '1 estudiante');
  assert.equal(pluralize(5, 'estudiante'), '5 estudiantes');
  assert.equal(roleLabel('admin'), 'Coordinación');
  assert.equal(roleLabel('teacher'), 'Docente');
  assert.equal(roleLabel('guardian'), 'Acudiente');
  assert.equal(roleLabel('unknown'), 'unknown');
});

test('version: isUpdateRequired compares SemVer versions correctly', () => {
  assert.equal(isUpdateRequired('0.0.4', '0.0.3'), true);
  assert.equal(isUpdateRequired('0.0.2', '0.0.3'), false);
  assert.equal(isUpdateRequired('0.0.3', '0.0.3'), false);
  assert.equal(isUpdateRequired('0.1.10', '0.1.9'), true);
  assert.equal(isUpdateRequired('0.1.9', '0.1.10'), false);
  assert.equal(isUpdateRequired('v1.0.0', '0.9.9'), true);
  assert.equal(isUpdateRequired(null, CURRENT_VERSION), false);
  assert.equal(isUpdateRequired('', CURRENT_VERSION), false);
});

test('studentCode: resolveGradeCode avoids collisions between undécimo and décimo', () => {
  assert.equal(resolveGradeCode('Séptimo A'), '07');
  assert.equal(resolveGradeCode('Octavo B'), '08');
  assert.equal(resolveGradeCode('Décimo 1'), '10');
  assert.equal(resolveGradeCode('Undécimo A'), '11');
  assert.equal(resolveGradeCode({ name: 'Grado Undécimo' }), '11');
  assert.equal(resolveGradeCode({ numeric_level: 6 }), '06');
  assert.equal(resolveGradeCode({ gradeNum: '10' }), '10');
  assert.equal(resolveGradeCode(null), '01');
});

test('studentCode: generateStudentCode creates correct code and increments sequence', () => {
  const fixedDate = new Date(2026, 5, 1); // 2026 -> prefix 26
  const existing = [
    { studentCode: '2607001' },
    { studentCode: '2607002' }
  ];
  const nextCode = generateStudentCode('Séptimo A', existing, fixedDate);
  assert.equal(nextCode, '2607003');

  // When no students exist yet
  const firstCode = generateStudentCode('Undécimo B', [], fixedDate);
  assert.equal(firstCode, '2611001');
});

test('appDataMappers: mapCourse and mapTask with lookups', () => {
  const rawCourse = {
    id: 'c1',
    section: 'A',
    salon_id: 's1',
    director_id: 't1',
    grado_id: 'g1',
    grados: { name: 'Séptimo' },
    salones: { name: 'Aula 201', building: 'Bloque A' }
  };
  const course = mapCourse(rawCourse);
  assert.equal(course.name, 'Séptimo A');
  assert.equal(course.directorId, 't1');
  assert.equal(course.salon, 'Aula 201');

  const mappedRow = mapGradeRow({ score: 5.0, teacher_note: 'Genial', is_notified: true, is_read: false });
  assert.equal(mappedRow.score, 5.0);
  assert.equal(mappedRow.teacherNote, 'Genial');
  assert.equal(mappedRow.isNotified, true);

  const lookups = createTaskLookups({
    grades: [course],
    subjects: [{ id: 'sub1', name: 'Matemáticas' }],
    teachers: [{ id: 't1', name: 'Prof. Carlos' }],
    gradeRows: [
      { assignment_id: 'task1', student_id: 'stu1', score: 4.5, teacher_note: 'Excelente', is_notified: true }
    ]
  });

  const rawTask = {
    id: 'task1',
    title: 'Taller Álgebra',
    subject_id: 'sub1',
    class_group_id: 'c1',
    teacher_id: 't1',
    assigned_at: '2026-03-10T10:00:00Z',
    due_date: '2026-03-15',
    status: 'graded'
  };

  const task = mapTask(rawTask, lookups);
  assert.equal(task.title, 'Taller Álgebra');
  assert.equal(task.subjectName, 'Matemáticas');
  assert.equal(task.gradeName, 'Séptimo A');
  assert.equal(task.teacherName, 'Prof. Carlos');
  assert.equal(task.status, 'Calificada');
  assert.equal(task.studentGrades['stu1']?.score, 4.5);
  assert.equal(task.studentGrades['stu1']?.isNotified, true);
});

test('formatters: formatNotificationDate formats dates, today, yesterday, and fallbacks', () => {
  assert.equal(formatNotificationDate('Justo ahora'), 'Justo ahora');
  assert.equal(formatNotificationDate(null), '');
  assert.equal(formatNotificationDate(undefined), '');

  const now = new Date();
  assert.equal(formatNotificationDate(now), 'Hace un momento');

  const oldDate = new Date(2025, 0, 15, 10, 30);
  const formatted = formatNotificationDate(oldDate);
  assert.match(formatted, /15\/01\/2025/);
});

test('appDataMappers: buildAlertsList combines DB notifications and synthesizes task notifications', () => {
  const rawNotifications = [
    {
      id: 'notif-1',
      title: 'Alerta de Inasistencia',
      message: 'Inasistencia a Estadística',
      assignment_id: null,
      student_id: 'stu1',
      recipient_id: 'guard1',
      created_at: '2026-10-08T09:00:00Z',
      is_read: false
    }
  ];

  const tasks = [
    {
      id: 'task-1',
      title: 'Hacer un cuadro con datos',
      gradeId: 'course1',
      subjectId: 'sub1',
      subjectName: 'Estadística',
      dueDate: '2026-10-09',
      assignedDate: '2026-10-08'
    }
  ];

  const students = [
    {
      id: 'stu1',
      name: 'Julia',
      gradeId: 'course1',
      guardianId: 'guard1'
    }
  ];

  const alerts = buildAlertsList({
    rawNotifications,
    tasks,
    students,
    subjects: [{ id: 'sub1', name: 'Estadística' }],
    readAlertIds: new Set()
  });

  assert.equal(alerts.length, 2);
  const absenceAlert = alerts.find(a => a.id === 'notif-1');
  const taskAlert = alerts.find(a => a.taskId === 'task-1');

  assert.ok(absenceAlert);
  assert.equal(absenceAlert.title, 'Alerta de Inasistencia');
  assert.equal(absenceAlert.read, false);

  assert.ok(taskAlert);
  assert.equal(taskAlert.title, 'Nueva Tarea: Hacer un cuadro con datos');
  assert.equal(taskAlert.studentId, 'stu1');
  assert.equal(taskAlert.recipientId, 'guard1');
  assert.equal(taskAlert.read, false);

  // If readAlertIds has taskAlert id, it should be marked read
  const alertsWithRead = buildAlertsList({
    rawNotifications,
    tasks,
    students,
    subjects: [{ id: 'sub1', name: 'Estadística' }],
    readAlertIds: new Set([taskAlert.id])
  });
  const taskAlertRead = alertsWithRead.find(a => a.taskId === 'task-1');
  assert.equal(taskAlertRead.read, true);
});

test('appDataMappers: buildAppData returns empty alerts for admin role', () => {
  const raw = {
    notificaciones: [
      { id: 'n1', title: 'Aviso', message: 'Mensaje', is_read: false }
    ],
    tareas: [],
    estudiantes: [],
    cursos: [],
    asignaturas: []
  };
  const appData = buildAppData(raw, { role: 'admin' });
  assert.deepEqual(appData.alerts, []);
});
