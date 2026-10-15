/**
 * Utilidades de validación y máscara inteligente para calificaciones escolares.
 * Escala estándar de 0.0 a 5.0 con precisión máxima de un decimal.
 */

/**
 * Aplica máscara inteligente para la escala 0.0 - 5.0:
 * 1. Normaliza comas ',' a puntos '.' en tiempo real.
 * 2. Inserción automática de punto decimal: si se escriben 2 dígitos continuos (ej. '25'),
 *    se formatea a '2.5' (siempre que esté dentro del rango 0.0 a 5.0).
 * 3. Restringe estrictamente al rango [0.0, 5.0] con máximo un decimal.
 * 4. Rechaza valores fuera de rango (como '60', '6', '55', etc.).
 *
 * @param {string|number} rawValue
 * @returns {{ valid: boolean, value: string }}
 */
export function formatOneFiveGrade(rawValue) {
  if (rawValue === '' || rawValue === null || rawValue === undefined) {
    return { valid: true, value: '' };
  }

  // Normalizar comas a puntos en tiempo real y filtrar caracteres no permitidos
  let val = String(rawValue).replace(',', '.');
  val = val.replace(/[^0-9.]/g, '');

  if (val === '') {
    return { valid: true, value: '' };
  }

  // Mantener solo el primer punto decimal si existen múltiples
  const parts = val.split('.');
  if (parts.length > 2) {
    val = parts[0] + '.' + parts.slice(1).join('');
  }

  // Inserción automática de punto decimal si se ingresan dos dígitos sin separador (ej. 25 -> 2.5)
  if (!val.includes('.') && val.length === 2) {
    const firstDigit = parseInt(val[0], 10);
    const secondDigit = parseInt(val[1], 10);
    if (firstDigit >= 0 && firstDigit <= 5) {
      const formatted = `${firstDigit}.${secondDigit}`;
      const num = parseFloat(formatted);
      if (num <= 5.0) {
        return { valid: true, value: formatted };
      }
      return { valid: false, value: '' };
    }
    return { valid: false, value: '' };
  }

  // Un solo dígito sin punto (ej. '0', '1', '2', '3', '4', '5')
  if (!val.includes('.')) {
    if (val.length === 1) {
      const d = parseInt(val, 10);
      if (d >= 0 && d <= 5) {
        return { valid: true, value: val };
      }
      return { valid: false, value: '' };
    }
    return { valid: false, value: '' };
  }

  // Con punto decimal (ej. '2.', '3.5', '.5')
  const [intPart, decPart] = val.split('.');
  const integerVal = intPart === '' ? 0 : parseInt(intPart, 10);
  if (isNaN(integerVal) || integerVal < 0 || integerVal > 5) {
    return { valid: false, value: '' };
  }

  if (decPart === undefined || decPart === '') {
    return { valid: true, value: `${integerVal}.` };
  }

  // Máximo un decimal de precisión
  const singleDec = decPart.slice(0, 1);
  const formatted = `${integerVal}.${singleDec}`;
  const num = parseFloat(formatted);
  if (isNaN(num) || num < 0 || num > 5.0) {
    return { valid: false, value: '' };
  }

  return { valid: true, value: formatted };
}
