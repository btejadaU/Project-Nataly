const STORAGE_KEY = 'project_nataly_read_alerts';

/**
 * Obtiene los IDs de notificaciones marcadas como leídas localmente.
 * @returns {Set<string>}
 */
export function getReadAlertIds() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return new Set();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set();
  }
}

/**
 * Guarda un ID de notificación como leída en localStorage.
 * @param {string|number} alertId
 */
export function saveReadAlertId(alertId) {
  if (typeof window === 'undefined' || !window.localStorage || !alertId) return;
  try {
    const current = getReadAlertIds();
    current.add(String(alertId));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...current]));
  } catch (e) {
    console.warn('Error al guardar notificación leída en localStorage:', e);
  }
}

/**
 * Guarda múltiples IDs de notificaciones como leídas en localStorage.
 * @param {Array<string|number>} alertIds
 */
export function saveMultipleReadAlertIds(alertIds) {
  if (typeof window === 'undefined' || !window.localStorage || !Array.isArray(alertIds)) return;
  try {
    const current = getReadAlertIds();
    for (const id of alertIds) {
      if (id) current.add(String(id));
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...current]));
  } catch (e) {
    console.warn('Error al guardar notificaciones leídas en localStorage:', e);
  }
}
