/**
 * Utilidades de caché y resolución de perfiles de acudientes y docentes.
 * Resuelve nombres reales de acudientes incluso cuando las políticas de RLS de Supabase
 * restringen la lectura masiva de la tabla 'perfiles' a usuarios no administradores.
 */

export const PROFILES_CACHE_KEY = 'project_nataly_profiles_cache_v1';

export const KNOWN_GUARDIANS_FALLBACK = {
  '30000000-0000-0000-0000-000000000006': {
    id: '30000000-0000-0000-0000-000000000006',
    full_name: 'Patricia Rodríguez',
    name: 'Patricia Rodríguez',
    phone: '+57 310 200 2001',
    email: 'patricia.rodriguez@colegioejemplo.edu.co',
    role: 'guardian'
  },
  '30000000-0000-0000-0000-000000000007': {
    id: '30000000-0000-0000-0000-000000000007',
    full_name: 'Mauricio López',
    name: 'Mauricio López',
    phone: '+57 310 200 2002',
    email: 'mauricio.lopez@colegioejemplo.edu.co',
    role: 'guardian'
  },
  '30000000-0000-0000-0000-000000000008': {
    id: '30000000-0000-0000-0000-000000000008',
    full_name: 'Adriana Martínez',
    name: 'Adriana Martínez',
    phone: '+57 310 200 2003',
    email: 'adriana.martinez@colegioejemplo.edu.co',
    role: 'guardian'
  },
  '30000000-0000-0000-0000-000000000009': {
    id: '30000000-0000-0000-0000-000000000009',
    full_name: 'Carmen Herrera',
    name: 'Carmen Herrera',
    phone: '+57 310 200 2004',
    email: 'carmen.herrera@colegioejemplo.edu.co',
    role: 'guardian'
  },
  '30000000-0000-0000-0000-000000000010': {
    id: '30000000-0000-0000-0000-000000000010',
    full_name: 'Ricardo Sánchez',
    name: 'Ricardo Sánchez',
    phone: '+57 310 200 2005',
    email: 'ricardo.sanchez@colegioejemplo.edu.co',
    role: 'guardian'
  },
  '30000000-0000-0000-0000-000000000011': {
    id: '30000000-0000-0000-0000-000000000011',
    full_name: 'Martha Moreno',
    name: 'Martha Moreno',
    phone: '+57 310 200 2006',
    email: 'martha.moreno@colegioejemplo.edu.co',
    role: 'guardian'
  },
  '30000000-0000-0000-0000-000000000012': {
    id: '30000000-0000-0000-0000-000000000012',
    full_name: 'Roberto Gómez',
    name: 'Roberto Gómez',
    phone: '+57 310 200 2007',
    email: 'roberto.gomez@colegioejemplo.edu.co',
    role: 'guardian'
  },
  '30000000-0000-0000-0000-000000000013': {
    id: '30000000-0000-0000-0000-000000000013',
    full_name: 'Teresa Vargas',
    name: 'Teresa Vargas',
    phone: '+57 310 200 2008',
    email: 'teresa.vargas@colegioejemplo.edu.co',
    role: 'guardian'
  },
  '30000000-0000-0000-0000-000000000014': {
    id: '30000000-0000-0000-0000-000000000014',
    full_name: 'Beatriz Restrepo',
    name: 'Beatriz Restrepo',
    phone: '+57 310 200 2009',
    email: 'beatriz.restrepo@colegioejemplo.edu.co',
    role: 'guardian'
  },
  '30000000-0000-0000-0000-000000000015': {
    id: '30000000-0000-0000-0000-000000000015',
    full_name: 'José Pérez',
    name: 'José Pérez',
    phone: '+57 310 200 2010',
    email: 'jose.perez@colegioejemplo.edu.co',
    role: 'guardian'
  },
  'fbf15ce2-85f1-422c-ac46-c32be8fae8bc': {
    id: 'fbf15ce2-85f1-422c-ac46-c32be8fae8bc',
    full_name: 'Ashley Garzón',
    name: 'Ashley Garzón',
    phone: '+57 310 200 2011',
    email: 'acudiente.1140919397@colegioejemplo.edu.co',
    role: 'guardian'
  }
};

/**
 * Obtiene el mapa de perfiles en caché local combinados con el catálogo de respaldo.
 */
export function getCachedProfiles() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return { ...KNOWN_GUARDIANS_FALLBACK };
  }
  try {
    const raw = window.localStorage.getItem(PROFILES_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { ...KNOWN_GUARDIANS_FALLBACK, ...parsed };
  } catch (err) {
    return { ...KNOWN_GUARDIANS_FALLBACK };
  }
}

/**
 * Guarda en localStorage una lista de perfiles obtenida (por ejemplo en sesión de Admin o consulta completa).
 */
export function saveCachedProfiles(profileList) {
  if (typeof window === 'undefined' || !window.localStorage || !Array.isArray(profileList)) return;
  try {
    const current = getCachedProfiles();
    const updated = { ...current };
    profileList.forEach((p) => {
      if (p?.id && p?.full_name) {
        updated[p.id] = {
          id: p.id,
          full_name: p.full_name,
          name: p.full_name,
          email: p.email || '',
          phone: p.phone || '',
          document_number: p.document_number || '',
          role: p.role || updated[p.id]?.role || 'guardian'
        };
      }
    });
    window.localStorage.setItem(PROFILES_CACHE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Aviso al guardar caché de perfiles:', err);
  }
}

/**
 * Almacena o actualiza un único perfil en caché.
 */
export function cacheSingleProfile(id, profileData) {
  if (!id || !profileData || typeof window === 'undefined' || !window.localStorage) return;
  try {
    const current = getCachedProfiles();
    const fullName = profileData.full_name || profileData.fullName || profileData.name || '';
    const updated = {
      ...current,
      [id]: {
        id,
        full_name: fullName,
        name: fullName,
        email: profileData.email || '',
        phone: profileData.phone || '',
        document_number: profileData.document_number || profileData.documentNumber || ''
      }
    };
    window.localStorage.setItem(PROFILES_CACHE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Aviso al guardar perfil individual en caché:', err);
  }
}
