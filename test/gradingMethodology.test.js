import { test } from 'node:test';
import assert from 'node:assert/strict';

test('grading methodology: format rules and passing threshold checks', () => {
  const formats = {
    one_five: { min: 0, max: 5, step: 0.1, defaultPassing: 3.0 },
    zero_hundred: { min: 0, max: 100, step: 1, defaultPassing: 60 },
    a_f: { min: 1, max: 5, step: 0.1, defaultPassing: 3.0 }
  };

  // Validaciones de rangos y valores por defecto
  assert.equal(formats.one_five.defaultPassing, 3.0);
  assert.equal(formats.zero_hundred.defaultPassing, 60);
  assert.equal(formats.a_f.defaultPassing, 3.0);

  // Comportamiento del predicado isApproved
  function isGradeApproved(score, format, passingValue) {
    if (score === null || score === undefined || score === '') return false;
    const num = parseFloat(score);
    if (Number.isNaN(num)) return false;
    return num >= passingValue;
  }

  // Escala 0 a 5
  assert.equal(isGradeApproved(3.0, 'one_five', 3.0), true);
  assert.equal(isGradeApproved(2.9, 'one_five', 3.0), false);
  assert.equal(isGradeApproved(4.8, 'one_five', 3.0), true);
  assert.equal(isGradeApproved(0.0, 'one_five', 3.0), false);

  // Escala 0 a 100
  assert.equal(isGradeApproved(60, 'zero_hundred', 60), true);
  assert.equal(isGradeApproved(59, 'zero_hundred', 60), false);
  assert.equal(isGradeApproved(85, 'zero_hundred', 70), true);
  assert.equal(isGradeApproved(65, 'zero_hundred', 70), false);
});

test('grading methodology: display labels match active format', () => {
  function getMethodologyCardDisplay(gradingSettings) {
    const format = gradingSettings?.format;
    const passing = gradingSettings?.passingValue ?? (format === 'zero_hundred' ? 60 : 3.0);

    const label = format === 'zero_hundred'
      ? '0 a 100'
      : format === 'a_f'
      ? 'A a F'
      : '0 a 5';

    return { label, passing };
  }

  assert.deepEqual(getMethodologyCardDisplay({ format: 'one_five', passingValue: 3.0 }), {
    label: '0 a 5',
    passing: 3.0
  });

  assert.deepEqual(getMethodologyCardDisplay({ format: 'zero_hundred', passingValue: 70 }), {
    label: '0 a 100',
    passing: 70
  });

  assert.deepEqual(getMethodologyCardDisplay({ format: 'a_f', passingValue: 3.0 }), {
    label: 'A a F',
    passing: 3.0
  });

  assert.deepEqual(getMethodologyCardDisplay(null), {
    label: '0 a 5',
    passing: 3.0
  });
});
