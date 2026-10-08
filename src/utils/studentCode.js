// Orden importante: los nombres más largos primero para que "undécimo" no coincida con "décimo".
const TEXT_GRADES = [
  ['transición', '00'], ['transicion', '00'], ['jardín', '00'], ['jardin', '00'],
  ['undécimo', '11'], ['undecimo', '11'], ['duodécimo', '12'], ['duodecimo', '12'],
  ['primero', '01'], ['segundo', '02'], ['tercero', '03'], ['cuarto', '04'], ['quinto', '05'],
  ['sexto', '06'], ['séptimo', '07'], ['septimo', '07'], ['octavo', '08'], ['noveno', '09'],
  ['décimo', '10'], ['decimo', '10'], ['once', '11'], ['doce', '12']
];

/**
 * Obtiene el código de grado a 2 dígitos (ej. Séptimo -> "07", Undécimo -> "11").
 * @param {object | string | null | undefined} course
 * @returns {string}
 */
export function resolveGradeCode(course) {
  if (!course) return '01';

  const numericLevel = typeof course === 'object'
    ? (course.numericLevel ?? course.numeric_level ?? course.gradeNum)
    : null;
  if (numericLevel !== null && numericLevel !== undefined && /^\d+$/.test(String(numericLevel))) {
    return String(parseInt(numericLevel, 10)).padStart(2, '0');
  }

  const name = (typeof course === 'string' ? course : course.name || '').toLowerCase();
  const textMatch = TEXT_GRADES.find(([key]) => name.includes(key));
  if (textMatch) return textMatch[1];

  const numMatch = name.match(/\d+/);
  if (numMatch) return String(parseInt(numMatch[0], 10)).padStart(2, '0');

  return '01';
}

/**
 * Genera el siguiente código estudiantil disponible: AA (año) + GG (grado) + NNN (consecutivo).
 * @param {object | string | null | undefined} course
 * @param {Array<{ studentCode?: string, student_code?: string }>} [existingStudents]
 * @param {Date} [now]
 * @returns {string}
 */
export function generateStudentCode(course, existingStudents = [], now = new Date()) {
  // Año actual en 2 dígitos, ej. 2026 -> "26"
  const currentYear = now.getFullYear().toString().slice(-2);
  // Prefijo: año (2 dígitos) + curso (2 dígitos), ej. "2607"
  const prefix = `${currentYear}${resolveGradeCode(course)}`;

  const existingCodes = new Set(
    (existingStudents || [])
      .map(student => String(student.studentCode || student.student_code || '').trim())
      .filter(Boolean)
  );

  // Buscar el mayor consecutivo usado con este prefijo
  let maxNum = 0;
  for (const code of existingCodes) {
    if (!code.startsWith(prefix) || code.length < prefix.length + 3) continue;
    const parsed = parseInt(code.slice(prefix.length, prefix.length + 3), 10);
    if (!Number.isNaN(parsed) && parsed > maxNum) maxNum = parsed;
  }

  let nextNum = maxNum + 1;
  let candidate = `${prefix}${String(nextNum).padStart(3, '0')}`;
  for (let attempts = 0; existingCodes.has(candidate) && attempts < 1000; attempts++) {
    nextNum++;
    candidate = `${prefix}${String(nextNum).padStart(3, '0')}`;
  }

  return candidate;
}
