import { test } from 'node:test';
import assert from 'node:assert/strict';
import { APPEAL_STATUS } from '../src/utils/appealsStorage.js';
import { formatOneFiveGrade } from '../src/utils/gradeMask.js';

// Replicar lógica pura de evaluación y reglas de TeacherGradingModal
function evaluateGrade(scoreVal, format = 'one_five', passingValue = 3.0, minNumeric = 0) {
  const isLetterScale = format === 'a_f';
  const isZeroHundred = format === 'zero_hundred';
  const maxNumeric = isZeroHundred ? 100 : 5.0;

  if (scoreVal === '' || scoreVal === null || scoreVal === undefined) {
    return { isGraded: false, isValid: false, isApproved: false, displayVal: '' };
  }

  if (isLetterScale) {
    const letter = String(scoreVal).trim().toUpperCase();
    const validLetters = ['A', 'B', 'C', 'D', 'F'];
    if (validLetters.includes(letter)) {
      const isApproved = ['A', 'B', 'C'].includes(letter);
      return { isGraded: true, isValid: true, isApproved, displayVal: letter };
    }
    const num = parseFloat(scoreVal);
    if (!isNaN(num)) {
      let mapped = 'F';
      if (num >= 4.5) mapped = 'A';
      else if (num >= 3.5) mapped = 'B';
      else if (num >= 3.0) mapped = 'C';
      else if (num >= 2.0) mapped = 'D';
      const isApproved = ['A', 'B', 'C'].includes(mapped);
      return { isGraded: true, isValid: true, isApproved, displayVal: mapped };
    }
    return { isGraded: true, isValid: false, isApproved: false, displayVal: String(scoreVal) };
  }

  const num = parseFloat(scoreVal);
  if (isNaN(num)) {
    return { isGraded: true, isValid: false, isApproved: false, displayVal: String(scoreVal) };
  }

  const inRange = num >= minNumeric && num <= maxNumeric;
  const isApproved = inRange && num >= passingValue;

  return {
    isGraded: true,
    isValid: inRange,
    isApproved,
    displayVal: isZeroHundred ? String(Math.round(num)) : num.toFixed(1)
  };
}

function checkBatchSaveButtonEnabled({ courseStudents, draftGrades, format, passingValue, isTaskBatchSaved, isSavingBatch }) {
  if (isSavingBatch || isTaskBatchSaved || !courseStudents || courseStudents.length === 0) {
    return false;
  }
  return courseStudents.every((student) => {
    const draft = draftGrades[student.id];
    const evalRes = evaluateGrade(draft?.score, format, passingValue);
    return evalRes.isGraded && evalRes.isValid;
  });
}

function resolveStudentLockAndResend({ studentId, taskStatus, studentGrades, appealStatus, reSubmittedStudents = {} }) {
  const isTaskBatchSaved =
    taskStatus === 'Calificada y Notificada' ||
    taskStatus === 'notified';

  const isAppealAccepted = appealStatus === APPEAL_STATUS.REVISION_ACEPTADA;
  const wasResent = Boolean(reSubmittedStudents[studentId]);

  const isLocked = isTaskBatchSaved && (!isAppealAccepted || wasResent);
  const canResend = isTaskBatchSaved && isAppealAccepted && !wasResent;

  return { isLocked, canResend };
}

function formatGuardianDisplay(student) {
  const guardianDisplayName =
    student?.acudiente?.nombre ||
    student?.tutor?.nombre ||
    student?.guardian?.nombre ||
    student?.guardian?.name ||
    (student?.guardianName &&
    student?.guardianName !== 'Sin acudiente' &&
    student?.guardianName !== 'Sin asignar'
      ? student.guardianName
      : null);

  return guardianDisplayName ? `Acudiente: ${guardianDisplayName}` : 'Acudiente: Sin registrar';
}

test('TeacherGradingModal: batch button is disabled until ALL students have valid grades', () => {
  const students = [{ id: 's1' }, { id: 's2' }, { id: 's3' }];

  // 1. Inicia deshabilitado cuando los borradores están vacíos
  assert.equal(
    checkBatchSaveButtonEnabled({
      courseStudents: students,
      draftGrades: { s1: { score: '' }, s2: { score: '' }, s3: { score: '' } },
      format: 'one_five',
      passingValue: 3.0,
      isTaskBatchSaved: false,
      isSavingBatch: false
    }),
    false
  );

  // 2. Deshabilitado si solo 2 de 3 tienen nota
  assert.equal(
    checkBatchSaveButtonEnabled({
      courseStudents: students,
      draftGrades: { s1: { score: '4.5' }, s2: { score: '3.0' }, s3: { score: '' } },
      format: 'one_five',
      passingValue: 3.0,
      isTaskBatchSaved: false,
      isSavingBatch: false
    }),
    false
  );

  // 3. Deshabilitado si uno tiene nota fuera de rango (ej: 6.0 en escala 0.0-5.0)
  assert.equal(
    checkBatchSaveButtonEnabled({
      courseStudents: students,
      draftGrades: { s1: { score: '4.5' }, s2: { score: '3.0' }, s3: { score: '6.0' } },
      format: 'one_five',
      passingValue: 3.0,
      isTaskBatchSaved: false,
      isSavingBatch: false
    }),
    false
  );

  // 4. Se habilita cuando todos los 3 alumnos tienen notas válidas
  assert.equal(
    checkBatchSaveButtonEnabled({
      courseStudents: students,
      draftGrades: { s1: { score: '4.5' }, s2: { score: '3.0' }, s3: { score: '2.5' } },
      format: 'one_five',
      passingValue: 3.0,
      isTaskBatchSaved: false,
      isSavingBatch: false
    }),
    true
  );

  // 5. Permanece deshabilitado si la tarea ya fue guardada en lote
  assert.equal(
    checkBatchSaveButtonEnabled({
      courseStudents: students,
      draftGrades: { s1: { score: '4.5' }, s2: { score: '3.0' }, s3: { score: '2.5' } },
      format: 'one_five',
      passingValue: 3.0,
      isTaskBatchSaved: true,
      isSavingBatch: false
    }),
    false
  );
});

test('TeacherGradingModal: dynamic scale evaluation (0.0-5.0, 0-100, A-F)', () => {
  // Escala 0.0 a 5.0
  const eval1 = evaluateGrade('4.2', 'one_five', 3.0);
  assert.equal(eval1.isValid, true);
  assert.equal(eval1.isApproved, true);
  assert.equal(eval1.displayVal, '4.2');

  const eval2 = evaluateGrade('2.8', 'one_five', 3.0);
  assert.equal(eval2.isValid, true);
  assert.equal(eval2.isApproved, false);

  const evalOutOfRange = evaluateGrade('7.5', 'one_five', 3.0);
  assert.equal(evalOutOfRange.isValid, false);

  // Escala 0 a 100
  const eval100App = evaluateGrade('85', 'zero_hundred', 60);
  assert.equal(eval100App.isValid, true);
  assert.equal(eval100App.isApproved, true);
  assert.equal(eval100App.displayVal, '85');

  const eval100Fail = evaluateGrade('50', 'zero_hundred', 60);
  assert.equal(eval100Fail.isValid, true);
  assert.equal(eval100Fail.isApproved, false);

  const eval100Over = evaluateGrade('120', 'zero_hundred', 60);
  assert.equal(eval100Over.isValid, false);

  // Escala Cualitativa A-F
  const evalA = evaluateGrade('A', 'a_f', 3.0);
  assert.equal(evalA.isValid, true);
  assert.equal(evalA.isApproved, true);
  assert.equal(evalA.displayVal, 'A');

  const evalC = evaluateGrade('C', 'a_f', 3.0);
  assert.equal(evalC.isValid, true);
  assert.equal(evalC.isApproved, true);

  const evalD = evaluateGrade('D', 'a_f', 3.0);
  assert.equal(evalD.isValid, true);
  assert.equal(evalD.isApproved, false);

  const evalF = evaluateGrade('F', 'a_f', 3.0);
  assert.equal(evalF.isValid, true);
  assert.equal(evalF.isApproved, false);

  const evalInvalidLetter = evaluateGrade('Z', 'a_f', 3.0);
  assert.equal(evalInvalidLetter.isValid, false);
});

test('TeacherGradingModal: locking and conditional unlock by accepted appeal', () => {
  const studentId = 's_student_1';

  // 1. Tarea pendiente ordinaria: no bloqueada, no botón reenviar
  const pendingState = resolveStudentLockAndResend({
    studentId,
    taskStatus: 'Pendiente de Calificar',
    appealStatus: APPEAL_STATUS.CALIFICADA
  });
  assert.equal(pendingState.isLocked, false);
  assert.equal(pendingState.canResend, false);

  // 2. Tarea guardada y emitida en lote: bloqueada para alumnos normales
  const lockedState = resolveStudentLockAndResend({
    studentId,
    taskStatus: 'Calificada y Notificada',
    appealStatus: APPEAL_STATUS.CALIFICADA
  });
  assert.equal(lockedState.isLocked, true);
  assert.equal(lockedState.canResend, false);

  // 3. Alumno con apelación aceptada (REVISION_ACEPTADA): DESBLOQUEADO y botón reenviar activo
  const appealAcceptedState = resolveStudentLockAndResend({
    studentId,
    taskStatus: 'Calificada y Notificada',
    appealStatus: APPEAL_STATUS.REVISION_ACEPTADA
  });
  assert.equal(appealAcceptedState.isLocked, false);
  assert.equal(appealAcceptedState.canResend, true);

  // 4. Tras hacer clic en reenviar: se vuelve a bloquear inmediatamente y oculta botón
  const afterResendState = resolveStudentLockAndResend({
    studentId,
    taskStatus: 'Calificada y Notificada',
    appealStatus: APPEAL_STATUS.REVISION_ACEPTADA,
    reSubmittedStudents: { [studentId]: true }
  });
  assert.equal(afterResendState.isLocked, true);
  assert.equal(afterResendState.canResend, false);
});

test('TeacherGradingModal: clean guardian info formatting without redundant parenthesis', () => {
  // Alumno con acudiente vinculado
  const studentWithGuardian = {
    name: 'Carlos Ruiz',
    guardianName: 'Marta Gómez',
    acudiente: { nombre: 'Marta Gómez' }
  };
  assert.equal(formatGuardianDisplay(studentWithGuardian), 'Acudiente: Marta Gómez');

  // Alumno con tutor vinculado
  const studentWithTutor = {
    name: 'Lucía Pérez',
    tutor: { nombre: 'Roberto Pérez' }
  };
  assert.equal(formatGuardianDisplay(studentWithTutor), 'Acudiente: Roberto Pérez');

  // Alumno sin acudiente
  const studentWithoutGuardian = {
    name: 'Pedro Torres',
    guardianName: '',
    acudiente: null
  };
  assert.equal(formatGuardianDisplay(studentWithoutGuardian), 'Acudiente: Sin registrar');

  // Alumno con valor legado "Sin acudiente"
  const studentWithLegacyText = {
    name: 'Ana Martínez',
    guardianName: 'Sin acudiente'
  };
  assert.equal(formatGuardianDisplay(studentWithLegacyText), 'Acudiente: Sin registrar');
});

test('TeacherGradingModal: formatOneFiveGrade smart mask, comma normalization and range validation (0.0 - 5.0)', () => {
  // 1. Valores vacíos
  assert.deepEqual(formatOneFiveGrade(''), { valid: true, value: '' });
  assert.deepEqual(formatOneFiveGrade(null), { valid: true, value: '' });
  assert.deepEqual(formatOneFiveGrade(undefined), { valid: true, value: '' });

  // 2. Normalización de coma a punto en tiempo real
  assert.deepEqual(formatOneFiveGrade('3,8'), { valid: true, value: '3.8' });
  assert.deepEqual(formatOneFiveGrade('4,0'), { valid: true, value: '4.0' });
  assert.deepEqual(formatOneFiveGrade('0,5'), { valid: true, value: '0.5' });

  // 3. Inserción automática de punto decimal con dos dígitos continuos
  // E.g. teclear 2 y 5 (o "25") -> "2.5"
  assert.deepEqual(formatOneFiveGrade('25'), { valid: true, value: '2.5' });
  assert.deepEqual(formatOneFiveGrade('38'), { valid: true, value: '3.8' });
  assert.deepEqual(formatOneFiveGrade('42'), { valid: true, value: '4.2' });
  assert.deepEqual(formatOneFiveGrade('05'), { valid: true, value: '0.5' });
  assert.deepEqual(formatOneFiveGrade('50'), { valid: true, value: '5.0' });

  // 4. Rechazo estricto de valores fuera de rango o dos dígitos > 5.0
  // '60' -> primer dígito 6 > 5 -> rechazado
  assert.deepEqual(formatOneFiveGrade('60'), { valid: false, value: '' });
  // '55' -> 5.5 > 5.0 -> rechazado
  assert.deepEqual(formatOneFiveGrade('55'), { valid: false, value: '' });
  // '6' -> dígito 6 > 5 -> rechazado
  assert.deepEqual(formatOneFiveGrade('6'), { valid: false, value: '' });
  // '9' -> rechazado
  assert.deepEqual(formatOneFiveGrade('9'), { valid: false, value: '' });
  // '250' -> > 2 dígitos sin punto -> rechazado
  assert.deepEqual(formatOneFiveGrade('250'), { valid: false, value: '' });
  // '5.5' -> > 5.0 -> rechazado
  assert.deepEqual(formatOneFiveGrade('5.5'), { valid: false, value: '' });

  // 5. Un solo dígito válido en progreso
  assert.deepEqual(formatOneFiveGrade('0'), { valid: true, value: '0' });
  assert.deepEqual(formatOneFiveGrade('3'), { valid: true, value: '3' });
  assert.deepEqual(formatOneFiveGrade('5'), { valid: true, value: '5' });

  // 6. Punto decimal en progreso
  assert.deepEqual(formatOneFiveGrade('4.'), { valid: true, value: '4.' });
  assert.deepEqual(formatOneFiveGrade('5.'), { valid: true, value: '5.' });
  assert.deepEqual(formatOneFiveGrade('.5'), { valid: true, value: '0.5' });

  // 7. Precisión máxima de 1 decimal (trunca decimales extras)
  assert.deepEqual(formatOneFiveGrade('4.75'), { valid: true, value: '4.7' });
});
