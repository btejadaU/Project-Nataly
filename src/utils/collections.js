/**
 * Utilidades de indexación para evitar búsquedas O(n·m) con `find`/`filter` anidados.
 */

/**
 * Crea un Map clave → elemento. Si hay claves repetidas gana el primero (igual que `Array#find`).
 * @template T
 * @param {T[] | null | undefined} items
 * @param {(item: T) => unknown} [getKey]
 * @returns {Map<unknown, T>}
 */
export function indexBy(items, getKey = item => item.id) {
  const map = new Map();
  for (const item of items || []) {
    const key = getKey(item);
    if (!map.has(key)) map.set(key, item);
  }
  return map;
}

/**
 * Agrupa elementos por clave conservando el orden original.
 * @template T
 * @param {T[] | null | undefined} items
 * @param {(item: T) => unknown} getKey
 * @returns {Map<unknown, T[]>}
 */
export function groupBy(items, getKey) {
  const map = new Map();
  for (const item of items || []) {
    const key = getKey(item);
    const bucket = map.get(key);
    if (bucket) bucket.push(item);
    else map.set(key, [item]);
  }
  return map;
}

/**
 * Cuenta elementos por clave en O(n).
 * @template T
 * @param {T[] | null | undefined} items
 * @param {(item: T) => unknown} getKey
 * @returns {Map<unknown, number>}
 */
export function countBy(items, getKey) {
  const map = new Map();
  for (const item of items || []) {
    const key = getKey(item);
    map.set(key, (map.get(key) || 0) + 1);
  }
  return map;
}
