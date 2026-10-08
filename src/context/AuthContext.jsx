import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const AuthContext = createContext(null);
const roleTables = {
  admin: 'perfiles_administradores',
  teacher: 'perfiles_profesores',
  guardian: 'perfiles_acudientes'
};

const INACTIVITY_TIME = 5 * 60 * 1000; // 5 minutos
const INACTIVITY_CHECK_INTERVAL = 15 * 1000;
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove'];
const ACTIVITY_LISTENER_OPTIONS = { passive: true, capture: true };
const PROFILE_MISSING_MESSAGE = 'La cuenta no tiene un perfil institucional asignado.';
const PROFILE_LOAD_ERROR_MESSAGE = 'No se pudo cargar tu perfil institucional. Verifica tu conexión e intenta de nuevo.';
const notConfiguredError = () => ({ error: new Error('Supabase no está configurado.') });

async function getRoleProfile(userId) {
  const { data: baseProfile, error: baseError } = await supabase
    .from('perfiles')
    .select('id, full_name, email, avatar_url, must_change_password')
    .eq('id', userId)
    .single();
  if (baseError) return { error: baseError };

  const roleResults = await Promise.all(Object.entries(roleTables).map(async ([role, table]) => {
    const { data, error } = await supabase.from(table).select('*').eq('id', userId).maybeSingle();
    return { role, data, error };
  }));
  const failed = roleResults.find(result => result.error);
  if (failed) return { error: failed.error };
  const roleEntry = roleResults.find(result => result.data);
  return { data: roleEntry ? { ...baseProfile, ...roleEntry.data, role: roleEntry.role } : null };
}

async function showInactivityNotice() {
  // Carga diferida: SweetAlert2 no forma parte del bundle inicial.
  const { default: Swal } = await import('sweetalert2');
  Swal.fire({
    title: 'Sesión cerrada',
    text: 'La sesión se cerró automáticamente por inactividad.',
    icon: 'warning',
    timer: 4000,
    showConfirmButton: false,
    customClass: {
      popup: 'dark-swal',
      title: 'dark-swal-title',
      htmlContainer: 'dark-swal-content'
    },
    buttonsStyling: false,
  });
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(() => Boolean(supabase));
  const [authError, setAuthError] = useState('');
  const profileRequestRef = useRef(0);
  const loadedUserIdRef = useRef(null);
  const sessionUserId = session?.user?.id;

  useEffect(() => {
    if (!supabase) return undefined;

    let isMounted = true;
    const loadProfile = async nextSession => {
      // Solo la carga más reciente aplica estado: evita que un perfil viejo reaparezca tras cerrar sesión.
      const requestId = ++profileRequestRef.current;
      const isStale = () => !isMounted || requestId !== profileRequestRef.current;

      if (!nextSession?.user) {
        loadedUserIdRef.current = null;
        setProfile(null);
        setIsLoading(false);
        return;
      }
      try {
        localStorage.setItem('nataly_has_logged_in', 'true');
      } catch {
        // Ignorar si el almacenamiento local está restringido
      }

      try {
        const { data, error } = await getRoleProfile(nextSession.user.id);
        if (isStale()) return;
        if (error) {
          console.warn('Error al cargar el perfil:', error.message);
          setProfile(null);
          setAuthError(PROFILE_LOAD_ERROR_MESSAGE);
        } else if (!data) {
          setProfile(null);
          setAuthError(PROFILE_MISSING_MESSAGE);
          // Una sesión sin perfil no sirve: se cierra para no dejarla activa detrás del login.
          supabase.auth.signOut().catch(() => undefined);
        } else {
          loadedUserIdRef.current = nextSession.user.id;
          setProfile(data);
          setAuthError('');
        }
      } catch (err) {
        if (isStale()) return;
        console.warn('Error al cargar el perfil:', err);
        setProfile(null);
        setAuthError(PROFILE_LOAD_ERROR_MESSAGE);
      } finally {
        if (!isStale()) setIsLoading(false);
      }
    };

    // onAuthStateChange emite INITIAL_SESSION al suscribirse, por lo que no hace falta getSession().
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      // Refrescos de token del mismo usuario no requieren volver a consultar el perfil.
      const sameUser = nextSession?.user && nextSession.user.id === loadedUserIdRef.current;
      if (sameUser && event !== 'USER_UPDATED') return;
      // Diferido: hacer await de otros métodos de Supabase dentro de este callback puede causar un deadlock.
      setTimeout(() => { loadProfile(nextSession); }, 0);
    });
    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Lógica de inactividad: Cierre de sesión automático tras 5 minutos sin interacción.
  // Se registra solo la marca de tiempo por evento (barato incluso con mousemove/scroll)
  // y se verifica periódicamente y al volver la app a primer plano.
  useEffect(() => {
    if (!sessionUserId) return undefined;

    let lastActivity = Date.now();
    let isSigningOut = false;
    const markActivity = () => {
      lastActivity = Date.now();
    };
    const checkInactivity = async () => {
      if (isSigningOut || Date.now() - lastActivity < INACTIVITY_TIME) return;
      isSigningOut = true;
      try {
        await supabase?.auth.signOut();
      } catch (err) {
        console.error('Error al cerrar sesión por inactividad:', err);
      }
      showInactivityNotice().catch(() => undefined);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') checkInactivity();
    };

    ACTIVITY_EVENTS.forEach(event => window.addEventListener(event, markActivity, ACTIVITY_LISTENER_OPTIONS));
    document.addEventListener('visibilitychange', handleVisibilityChange);
    const intervalId = setInterval(checkInactivity, INACTIVITY_CHECK_INTERVAL);

    return () => {
      ACTIVITY_EVENTS.forEach(event => window.removeEventListener(event, markActivity, ACTIVITY_LISTENER_OPTIONS));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(intervalId);
    };
  }, [sessionUserId]);

  const reloadProfile = async () => {
    if (session?.user) {
      const { data } = await getRoleProfile(session.user.id);
      if (data) setProfile(data);
    }
  };

  const signIn = async ({ role, identifier, password }) => {
    if (!supabase) return notConfiguredError();
    setAuthError('');
    let email = (identifier || '').trim();

    if (!email.includes('@')) {
      // 1. Intentar resolver con la función unificada (docente, acudiente o admin)
      const { data: universalData, error: universalError } = await supabase.rpc('resolver_identificador_login', {
        login_identifier: email,
        login_role: role
      });

      if (!universalError && universalData?.[0]?.email) {
        email = universalData[0].email;
      } else if (role === 'guardian') {
        // Fallback a función de acudiente previa si la función universal aún no estuviera desplegada
        const { data: guardianData, error: guardianError } = await supabase.rpc('resolver_inicio_acudiente', { login_identifier: email });
        if (guardianError) return { error: guardianError };
        email = guardianData?.email || '';
      } else if (universalError) {
        return { error: universalError };
      }
    }
    if (!email) return { error: new Error('No encontramos una cuenta asociada a ese número de documento o correo.') };

    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.error) return result;
    const roleResult = await getRoleProfile(result.data.user.id);
    if (roleResult.error || roleResult.data?.role !== role) {
      await supabase.auth.signOut();
      return { error: new Error('El rol elegido no coincide con el perfil de la cuenta.') };
    }
    return result;
  };

  // Marca en BD que el usuario ya cambió su contraseña temporal.
  const markPasswordUpdated = async () => {
    const { error: rpcError } = await supabase.rpc('marcar_clave_actualizada');
    if (rpcError) {
      const { error: fallbackError } = await supabase.from('perfiles').update({ must_change_password: false }).eq('id', session?.user?.id);
      if (fallbackError) console.warn('No se pudo marcar la contraseña como actualizada:', fallbackError.message);
    }
    setProfile(prev => prev ? { ...prev, must_change_password: false } : prev);
  };

  const completePasswordChange = async (newPassword) => {
    if (!supabase) return notConfiguredError();
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) return { error: updateError };

    // Marcar como actualizado en la base de datos
    await markPasswordUpdated();
    return { success: true };
  };

  const updatePassword = async (newPassword, currentPassword = null) => {
    if (!supabase) return notConfiguredError();

    if (currentPassword) {
      const email = session?.user?.email || profile?.email;
      if (!email) {
        return { error: new Error('No se pudo identificar la cuenta para validar la contraseña actual.') };
      }

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword
      });

      if (verifyError) {
        return { error: new Error('La contraseña actual es incorrecta. Por favor verifícala e intenta de nuevo.') };
      }
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) return { error: updateError };

    if (profile?.must_change_password) {
      await markPasswordUpdated();
    }
    return { success: true };
  };

  const updateEmail = async (newEmail) => {
    if (!supabase) return notConfiguredError();
    const cleanEmail = newEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      return { error: new Error('Por favor ingresa un correo electrónico válido.') };
    }

    // 1. Actualizar en Supabase Auth
    const { data: authData, error: updateError } = await supabase.auth.updateUser({ email: cleanEmail });
    if (updateError) return { error: updateError };

    // 2. Actualizar en la tabla pública perfiles
    const { error: profileError } = await supabase
      .from('perfiles')
      .update({ email: cleanEmail })
      .eq('id', session?.user?.id);

    if (profileError) {
      console.warn('Advertencia al sincronizar perfiles:', profileError);
    }

    setProfile(prev => prev ? { ...prev, email: cleanEmail } : prev);
    return { success: true, user: authData?.user };
  };

  const updatePhone = async (newPhone) => {
    if (!supabase) return notConfiguredError();
    const cleanPhone = newPhone.trim();

    // 1. Intentar actualizar vía RPC
    const { error: rpcError } = await supabase.rpc('actualizar_telefono_usuario', { p_phone: cleanPhone });

    // 2. Fallback: intentar actualizar en la tabla de rol del usuario
    if (rpcError) {
      const table = roleTables[profile?.role];
      if (table && session?.user?.id) {
        const { error: directError } = await supabase
          .from(table)
          .update({ phone: cleanPhone })
          .eq('id', session.user.id);
        if (directError) return { error: directError };
      }
    }

    setProfile(prev => prev ? { ...prev, phone: cleanPhone } : prev);
    return { success: true };
  };

  const signOut = () => supabase?.auth.signOut();

  return <AuthContext.Provider value={{ session, profile, role: profile?.role || null, isLoading, authError, isSupabaseConfigured, signIn, signOut, completePasswordChange, updatePassword, updateEmail, updatePhone, reloadProfile }}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
