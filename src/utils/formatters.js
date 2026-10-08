export function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function roleLabel(role) {
  return {
    admin: 'Coordinación',
    teacher: 'Docente',
    guardian: 'Acudiente'
  }[role] || role;
}

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/**
 * Escapa texto para interpolarlo de forma segura dentro de HTML
 * (por ejemplo, en la opción `html` de SweetAlert2) y evitar XSS.
 * @param {unknown} value
 * @returns {string}
 */
export function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, char => HTML_ESCAPES[char]);
}

/**
 * Devuelve la fecha en formato YYYY-MM-DD según la zona horaria local.
 * `toISOString()` usa UTC: en Colombia (UTC-5) después de las 7 p. m.
 * devolvería el día siguiente.
 * @param {Date} [date]
 * @returns {string}
 */
export function toLocalISODate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formatea una marca de tiempo de notificación para visualización amigable.
 * @param {string|Date|null|undefined} timestamp
 * @returns {string}
 */
export function formatNotificationDate(timestamp) {
  if (!timestamp) return '';
  if (timestamp === 'Justo ahora') return 'Justo ahora';

  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  if (isNaN(date.getTime())) {
    return String(timestamp);
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins >= 0 && diffMins < 2) {
    return 'Hace un momento';
  }
  if (diffMins >= 2 && diffMins < 60) {
    return `Hace ${diffMins} min`;
  }

  const isToday = toLocalISODate(date) === toLocalISODate(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = toLocalISODate(date) === toLocalISODate(yesterday);

  const timeStr = date.toLocaleTimeString('es-CO', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).toLowerCase();

  if (isToday) {
    return `Hoy, ${timeStr}`;
  }
  if (isYesterday) {
    return `Ayer, ${timeStr}`;
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}, ${timeStr}`;
}