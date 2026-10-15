export const APPEAL_STATUS = {
  CALIFICADA: 'CALIFICADA',
  EN_REVISION: 'EN_REVISION',
  REVISION_ACEPTADA: 'REVISION_ACEPTADA',
  REVISION_RECHAZADA: 'REVISION_RECHAZADA'
};

export const STORAGE_KEY = 'project_nataly_grade_appeals_v1';
export const APPEALS_STORAGE_KEY = STORAGE_KEY;

/**
 * Carga las apelaciones guardadas en localStorage
 */
export function loadLocalAppeals() {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Error leyendo apelaciones de localStorage:', err);
    return [];
  }
}

/**
 * Guarda el array de apelaciones en localStorage
 */
export function saveLocalAppeals(appeals) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appeals || []));
  } catch (err) {
    console.warn('Error guardando apelaciones en localStorage:', err);
  }
}

/**
 * Genera clave única para indexar apelaciones por tarea y estudiante
 */
export function getAppealKey(taskId, studentId) {
  return `${taskId}:${studentId}`;
}

/**
 * Normaliza los campos de una apelación para garantizar consistencia
 */
export function normalizeAppeal(row) {
  if (!row) return null;
  const taskId = row.task_id || row.assignment_id || row.assignmentId || row.taskId;
  const studentId = row.estudiante_id || row.student_id || row.studentId;
  const id = row.id || `appeal-${taskId}-${studentId}`;

  return {
    id,
    nota_id: row.nota_id || `${taskId}:${studentId}`,
    assignment_id: taskId,
    task_id: taskId,
    taskId,
    estudiante_id: studentId,
    student_id: studentId,
    studentId,
    acudiente_id: row.acudiente_id || row.guardian_id || row.guardianId || null,
    guardian_id: row.acudiente_id || row.guardian_id || row.guardianId || null,
    guardianId: row.acudiente_id || row.guardian_id || row.guardianId || null,
    docente_id: row.docente_id || row.teacher_id || row.teacherId || null,
    teacher_id: row.docente_id || row.teacher_id || row.teacherId || null,
    teacherId: row.docente_id || row.teacher_id || row.teacherId || null,
    materia_id: row.materia_id || row.subject_id || row.subjectId || null,
    subject_id: row.materia_id || row.subject_id || row.subjectId || null,
    subjectId: row.materia_id || row.subject_id || row.subjectId || null,
    curso_id: row.curso_id || row.class_group_id || row.gradeId || null,
    class_group_id: row.curso_id || row.class_group_id || row.gradeId || null,
    classGroupId: row.curso_id || row.class_group_id || row.gradeId || null,
    gradeId: row.curso_id || row.class_group_id || row.gradeId || null,
    motivo_acudiente: row.motivo_acudiente || row.reason || '',
    reason: row.motivo_acudiente || row.reason || '',
    estado: row.estado || row.status || APPEAL_STATUS.CALIFICADA,
    status: row.estado || row.status || APPEAL_STATUS.CALIFICADA,
    respuesta_docente: row.respuesta_docente || row.teacher_response || '',
    teacher_response: row.respuesta_docente || row.teacher_response || '',
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString()
  };
}

export const normalizeAppealRow = normalizeAppeal;

/**
 * Consulta Supabase para obtener apelaciones reales con fallback silencioso a local
 */
export async function fetchAppealsFromSupabase(supabaseClient) {
  if (!supabaseClient) return null;
  try {
    const { data, error } = await supabaseClient
      .from('apelaciones_calificaciones')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      // Tabla puede no existir aún en base de datos remota
      return null;
    }
    return (data || []).map(normalizeAppeal);
  } catch (err) {
    console.warn('Advertencia al consultar tabla apelaciones_calificaciones en Supabase:', err);
    return null;
  }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Verifica si un valor es un UUID válido de PostgreSQL
 */
export function isValidUUID(str) {
  return typeof str === 'string' && UUID_REGEX.test(str.trim());
}

/**
 * Convierte a UUID o null si no cumple con la sintaxis de UUID
 */
export function toUUIDOrNull(val) {
  return isValidUUID(val) ? val.trim() : null;
}

/**
 * Persiste o actualiza una apelación en Supabase con fallback silencioso
 */
export async function persistAppealToSupabase(supabaseClient, appeal) {
  if (!supabaseClient || !appeal) return null;

  const assignmentId = appeal.assignment_id || appeal.taskId;
  const studentId = appeal.student_id || appeal.studentId;

  // Supabase requiere UUIDs válidos para las llaves foráneas principales
  const safeAssignmentId = toUUIDOrNull(assignmentId);
  const safeStudentId = toUUIDOrNull(studentId);

  if (!safeAssignmentId || !safeStudentId) {
    return null;
  }

  let safeGuardianId = toUUIDOrNull(appeal.guardian_id || appeal.guardianId);
  if (!safeGuardianId && supabaseClient.auth?.getUser) {
    try {
      const { data: userData } = await supabaseClient.auth.getUser();
      if (userData?.user?.id && isValidUUID(userData.user.id)) {
        safeGuardianId = userData.user.id;
      }
    } catch {
      // Fallback silencioso si no se puede leer la sesión
    }
  }

  const payload = {
    assignment_id: safeAssignmentId,
    student_id: safeStudentId,
    guardian_id: safeGuardianId,
    teacher_id: toUUIDOrNull(appeal.teacher_id || appeal.teacherId),
    subject_id: toUUIDOrNull(appeal.subject_id || appeal.subjectId),
    class_group_id: toUUIDOrNull(appeal.class_group_id || appeal.gradeId),
    reason: appeal.motivo_acudiente || appeal.reason || '',
    status: appeal.estado || appeal.status || APPEAL_STATUS.EN_REVISION,
    teacher_response: appeal.respuesta_docente || appeal.teacher_response || null,
    updated_at: new Date().toISOString()
  };

  // Solo incluir `id` en el payload si es un UUID estricto. Si es un ID sintético (ej. "appeal-..."),
  // se omite para permitir que PostgreSQL genere un UUID nativo (gen_random_uuid()) o mantenga el existente.
  if (isValidUUID(appeal.id)) {
    payload.id = appeal.id;
  }

  try {
    const { data, error } = await supabaseClient
      .from('apelaciones_calificaciones')
      .upsert(payload, { onConflict: 'assignment_id,student_id' })
      .select()
      .maybeSingle();

    if (error) {
      console.warn('Aviso: no se pudo persistir apelación en Supabase (usando almacenamiento local):', error.message);
      return null;
    }
    return normalizeAppeal(data || payload);
  } catch (err) {
    console.warn('Aviso al guardar apelación en Supabase:', err);
    return null;
  }
}
