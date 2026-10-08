// Versión actual instalada en el dispositivo
export const CURRENT_VERSION = '0.0.5';

function parseVersion(version) {
  return String(version)
    .trim()
    .replace(/^v/i, '')
    .split('.')
    .map(part => parseInt(part, 10) || 0);
}

/**
 * Compara versiones semánticamente segmento por segmento (SemVer: x.y.z)
 * Evita fallos como evaluar '0.1.10' menor que '0.1.9'.
 * Retorna true si versionMinima es estrictamente mayor que currentVersion.
 * @param {string | null | undefined} versionMinima
 * @param {string} [currentVersion]
 * @returns {boolean}
 */
export function isUpdateRequired(versionMinima, currentVersion = CURRENT_VERSION) {
  if (!versionMinima) return false;

  const minParts = parseVersion(versionMinima);
  const curParts = parseVersion(currentVersion);
  const length = Math.max(minParts.length, curParts.length);

  for (let i = 0; i < length; i++) {
    const min = minParts[i] || 0;
    const cur = curParts[i] || 0;
    if (min > cur) return true;
    if (min < cur) return false;
  }

  return false;
}
