import test from 'node:test';
import assert from 'node:assert/strict';

import {
  APPEAL_STATUS,
  normalizeAppealRow,
  APPEALS_STORAGE_KEY,
  loadLocalAppeals,
  saveLocalAppeals,
  isValidUUID,
  toUUIDOrNull,
  persistAppealToSupabase
} from '../src/utils/appealsStorage.js';
import {
  inferNotificationType,
  mapNotification,
  createTaskLookups,
  mapTask
} from '../src/context/appDataMappers.js';

test('gradeAppeals: APPEAL_STATUS defines all expected lifecycle states', () => {
  assert.equal(APPEAL_STATUS.CALIFICADA, 'CALIFICADA');
  assert.equal(APPEAL_STATUS.EN_REVISION, 'EN_REVISION');
  assert.equal(APPEAL_STATUS.REVISION_ACEPTADA, 'REVISION_ACEPTADA');
  assert.equal(APPEAL_STATUS.REVISION_RECHAZADA, 'REVISION_RECHAZADA');
});

test('gradeAppeals: normalizeAppealRow handles snake_case and camelCase attributes', () => {
  const rawSnake = {
    id: 'appeal-1',
    assignment_id: 'task-101',
    student_id: 'stud-1',
    guardian_id: 'guard-1',
    teacher_id: 'teach-1',
    subject_id: 'subj-1',
    class_group_id: 'class-1',
    estado: 'EN_REVISION',
    motivo_acudiente: 'Considero que mi ensayo cumplió con todos los puntos.',
    respuesta_docente: null,
    created_at: '2026-10-13T10:00:00Z',
    updated_at: '2026-10-13T10:00:00Z'
  };

  const normalized = normalizeAppealRow(rawSnake);
  assert.equal(normalized.id, 'appeal-1');
  assert.equal(normalized.taskId, 'task-101');
  assert.equal(normalized.studentId, 'stud-1');
  assert.equal(normalized.guardianId, 'guard-1');
  assert.equal(normalized.teacherId, 'teach-1');
  assert.equal(normalized.subjectId, 'subj-1');
  assert.equal(normalized.classGroupId, 'class-1');
  assert.equal(normalized.estado, 'EN_REVISION');
  assert.equal(normalized.motivo_acudiente, 'Considero que mi ensayo cumplió con todos los puntos.');
  assert.equal(normalized.respuesta_docente, '');

  // camelCase input compatibility
  const rawCamel = {
    id: 'appeal-2',
    taskId: 'task-202',
    studentId: 'stud-2',
    status: 'REVISION_ACEPTADA',
    motivo_acudiente: 'Revisión pedida',
    respuesta_docente: 'Se revisará en clase.'
  };

  const normalizedCamel = normalizeAppealRow(rawCamel);
  assert.equal(normalizedCamel.assignment_id, 'task-202');
  assert.equal(normalizedCamel.student_id, 'stud-2');
  assert.equal(normalizedCamel.estado, 'REVISION_ACEPTADA');
  assert.equal(normalizedCamel.status, 'REVISION_ACEPTADA');
  assert.equal(normalizedCamel.respuesta_docente, 'Se revisará en clase.');
});

test('gradeAppeals: inferNotificationType identifies grade appeals, resolutions, attendance, and regular grades', () => {
  // With explicit metadata
  assert.equal(
    inferNotificationType({ metadata: { tipo: 'APELACION_NOTA' } }),
    'APELACION_NOTA'
  );
  assert.equal(
    inferNotificationType({ metadata: { tipo: 'RESOLUCION_APELACION' } }),
    'RESOLUCION_APELACION'
  );
  assert.equal(
    inferNotificationType({ metadata: { tipo: 'INASISTENCIA' } }),
    'INASISTENCIA'
  );
  assert.equal(
    inferNotificationType({ metadata: { tipo: 'NOTA' } }),
    'NOTA'
  );

  // Inferred from message or title text
  assert.equal(
    inferNotificationType({
      title: 'Solicitud de revisión',
      message: 'El acudiente ha solicitado revisión de la nota.'
    }),
    'APELACION_NOTA'
  );

  assert.equal(
    inferNotificationType({
      title: 'Revisión rechazada',
      message: 'La calificación se mantiene tras la revisión.'
    }),
    'RESOLUCION_APELACION'
  );

  assert.equal(
    inferNotificationType({
      title: 'Falta registrada',
      message: 'Se registró inasistencia en Matemáticas.'
    }),
    'INASISTENCIA'
  );

  assert.equal(
    inferNotificationType({
      title: 'Nueva calificación',
      message: 'Se ha publicado una calificación de Biología.'
    }),
    'NOTA'
  );
});

test('gradeAppeals: createTaskLookups attaches appeal and appealStatus to studentGrades', () => {
  const grades = [
    {
      id: 'grade-1',
      assignment_id: 'task-100',
      student_id: 'student-A',
      score: 2.8,
      feedback: 'Buen esfuerzo pero faltó desarrollo.',
      is_notified: true,
      is_read: true
    }
  ];

  const appeals = [
    {
      id: 'appeal-100',
      assignment_id: 'task-100',
      student_id: 'student-A',
      estado: APPEAL_STATUS.EN_REVISION,
      motivo_acudiente: 'Revisé la rúbrica y considero que amerita 3.5'
    }
  ];

  const lookups = createTaskLookups({ gradeRows: grades, appeals });
  const rawTask = {
    id: 'task-100',
    title: 'Ensayo de Filosofía',
    class_group_id: 'class-1',
    subject_id: 'subj-1',
    teacher_id: 'teach-1'
  };
  const mapped = mapTask(rawTask, lookups);

  assert.ok(mapped.studentGrades['student-A']);
  assert.equal(mapped.studentGrades['student-A'].score, 2.8);
  assert.equal(mapped.studentGrades['student-A'].appealStatus, APPEAL_STATUS.EN_REVISION);
  assert.equal(mapped.studentGrades['student-A'].appeal.motivo_acudiente, 'Revisé la rúbrica y considero que amerita 3.5');
});

test('gradeAppeals: storage helpers fall back gracefully when window/localStorage is simulated', () => {
  const mockStorage = new Map();
  globalThis.window = {
    localStorage: {
      getItem: (key) => mockStorage.get(key) || null,
      setItem: (key, val) => mockStorage.set(key, String(val)),
      removeItem: (key) => mockStorage.delete(key)
    }
  };

  const initial = loadLocalAppeals();
  assert.ok(Array.isArray(initial));

  const sampleAppeal = {
    id: 'test-appeal-1',
    taskId: 't-1',
    studentId: 's-1',
    estado: APPEAL_STATUS.EN_REVISION,
    motivo_acudiente: 'Prueba de almacenamiento'
  };

  saveLocalAppeals([sampleAppeal]);
  const loaded = loadLocalAppeals();
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].id, 'test-appeal-1');
  assert.equal(loaded[0].estado, APPEAL_STATUS.EN_REVISION);

  // Clean up
  delete globalThis.window;
});

test('gradeAppeals: isValidUUID and toUUIDOrNull validate postgres UUIDs', () => {
  const validUUID = 'ec263d82-5031-4652-860e-a08504b2d7e8';
  const syntheticId = 'appeal-ec263d82-5031-4652-860e-a08504b2d7e8-6ad854d1-3720-4e6a-9a11-af1ef5b4997c';

  assert.equal(isValidUUID(validUUID), true);
  assert.equal(isValidUUID(syntheticId), false);
  assert.equal(isValidUUID('not-a-uuid'), false);
  assert.equal(isValidUUID(null), false);
  assert.equal(isValidUUID(undefined), false);

  assert.equal(toUUIDOrNull(validUUID), validUUID);
  assert.equal(toUUIDOrNull(syntheticId), null);
  assert.equal(toUUIDOrNull('mock-teacher'), null);
});

test('gradeAppeals: persistAppealToSupabase omits synthetic non-UUID id from upsert payload', async () => {
  let capturedPayload = null;
  const mockSupabase = {
    from: (table) => {
      assert.equal(table, 'apelaciones_calificaciones');
      return {
        upsert: (payload, options) => {
          capturedPayload = payload;
          assert.equal(options.onConflict, 'assignment_id,student_id');
          return {
            select: () => ({
              maybeSingle: async () => ({
                data: {
                  ...payload,
                  id: '00000000-0000-0000-0000-000000000001'
                },
                error: null
              })
            })
          };
        }
      };
    }
  };

  const syntheticAppeal = {
    id: 'appeal-ec263d82-5031-4652-860e-a08504b2d7e8-6ad854d1-3720-4e6a-9a11-af1ef5b4997c',
    assignment_id: 'ec263d82-5031-4652-860e-a08504b2d7e8',
    student_id: '6ad854d1-3720-4e6a-9a11-af1ef5b4997c',
    motivo_acudiente: 'Revisión por favor'
  };

  const result = await persistAppealToSupabase(mockSupabase, syntheticAppeal);

  assert.ok(result);
  assert.equal(result.id, '00000000-0000-0000-0000-000000000001');
  assert.equal(capturedPayload.id, undefined);
  assert.equal(capturedPayload.assignment_id, 'ec263d82-5031-4652-860e-a08504b2d7e8');
  assert.equal(capturedPayload.student_id, '6ad854d1-3720-4e6a-9a11-af1ef5b4997c');
});

test('gradeAppeals: resolution titles infer correctly as RESOLUCION_APELACION', () => {
  assert.equal(
    inferNotificationType({
      title: 'Revisión Aceptada y Calificada: María José - Matemáticas'
    }),
    'RESOLUCION_APELACION'
  );

  assert.equal(
    inferNotificationType({
      title: 'Revisión Aceptada: Juan - Español'
    }),
    'RESOLUCION_APELACION'
  );

  assert.equal(
    inferNotificationType({
      title: 'Revisión Rechazada: Juan - Español'
    }),
    'RESOLUCION_APELACION'
  );
});

test('gradeAppeals: an existing appeal in any state (including CALIFICADA) marks task as already appealed', () => {
  const grades = [
    {
      id: 'grade-1',
      assignment_id: 'task-100',
      student_id: 'student-A',
      score: 3.5,
      is_notified: true,
      is_read: false
    }
  ];

  // Caso 1: Apelación que ya fue resuelta y re-calificada a CALIFICADA
  const appealsResolved = [
    {
      id: 'appeal-100',
      assignment_id: 'task-100',
      student_id: 'student-A',
      estado: APPEAL_STATUS.CALIFICADA,
      status: APPEAL_STATUS.CALIFICADA,
      respuesta_docente: 'Calificación actualizada tras revisión.'
    }
  ];

  const lookups = createTaskLookups({ gradeRows: grades, appeals: appealsResolved });
  const rawTask = {
    id: 'task-100',
    title: 'Hacer 20 hojas de taller',
    class_group_id: 'class-1',
    subject_id: 'subj-1',
    teacher_id: 'teach-1'
  };
  const mapped = mapTask(rawTask, lookups);
  const studentGrade = mapped.studentGrades['student-A'];

  // Debe tener el objeto de apelación vinculado
  assert.ok(studentGrade.appeal);
  assert.equal(studentGrade.appeal.status, APPEAL_STATUS.CALIFICADA);

  // La condición para inhabilitar "No estoy de acuerdo" es que ya exista una apelación
  const hasExistingAppeal = Boolean(
    studentGrade.appeal || appealsResolved.some(a => a.assignment_id === rawTask.id && a.student_id === 'student-A')
  );
  assert.equal(hasExistingAppeal, true);
});
