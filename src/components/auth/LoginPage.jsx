import React, { useState } from 'react';
import {
  GraduationCap,
  HeartHandshake,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  ArrowLeft,
  ChevronRight,
  Info,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const SAVED_ROLE_KEY = 'nataly_selected_role';
const HAS_LOGGED_IN_KEY = 'nataly_has_logged_in';
const FIRST_LOGIN_NOTICE_DISMISSED_KEY = 'nataly_notice_dismissed';

const roles = [
  {
    id: 'admin',
    label: 'Administrador',
    description: 'Coordinación y gestión escolar',
    icon: ShieldCheck,
    lightColor: 'bg-purple-50 text-purple-700 border-purple-200'
  },
  {
    id: 'teacher',
    label: 'Docente',
    description: 'Calificaciones y asistencia',
    icon: GraduationCap,
    lightColor: 'bg-indigo-50 text-indigo-700 border-indigo-200'
  },
  {
    id: 'guardian',
    label: 'Acudiente',
    description: 'Seguimiento de estudiantes',
    icon: HeartHandshake,
    lightColor: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200'
  }
];

export default function LoginPage() {
  const { signIn, isSupabaseConfigured, authError } = useAuth();

  const [role, setRole] = useState(() => {
    const saved = localStorage.getItem(SAVED_ROLE_KEY);
    return roles.some(r => r.id === saved) ? saved : null;
  });

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [hasLoggedInBefore, setHasLoggedInBefore] = useState(() => {
    return localStorage.getItem(HAS_LOGGED_IN_KEY) === 'true';
  });
  const [isNoticeDismissed, setIsNoticeDismissed] = useState(() => {
    return localStorage.getItem(FIRST_LOGIN_NOTICE_DISMISSED_KEY) === 'true';
  });

  const handleDismissNotice = () => {
    setIsNoticeDismissed(true);
    localStorage.setItem(FIRST_LOGIN_NOTICE_DISMISSED_KEY, 'true');
  };

  const selectedRole = roles.find(item => item.id === role);
  const IdentifierIcon = role === 'guardian' && !identifier.includes('@') ? LockKeyhole : Mail;

  const handleSelectRole = (roleId) => {
    setRole(roleId);
    localStorage.setItem(SAVED_ROLE_KEY, roleId);
    setError('');
  };

  const handleResetRole = () => {
    setRole(null);
    localStorage.removeItem(SAVED_ROLE_KEY);
    setIdentifier('');
    setPassword('');
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    const { error: signInError } = await signIn({ role, identifier, password });
    if (signInError) {
      if (signInError.message?.includes('No encontramos una cuenta')) {
        setError(signInError.message);
      } else if (signInError.message?.includes('El rol elegido no coincide')) {
        setError(signInError.message);
      } else {
        setError('Credenciales incorrectas o tu cuenta no pertenece al rol seleccionado.');
      }
    } else {
      localStorage.setItem(HAS_LOGGED_IN_KEY, 'true');
      setHasLoggedInBefore(true);
    }
    setIsSubmitting(false);
  };

  return (
    <main className="min-h-screen bg-[var(--color-canvas)] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-sm sm:max-w-md">

        {/* Tarjeta Central */}
        <section className="bg-white rounded-3xl border border-purple-100/90 shadow-xl shadow-purple-900/5 p-6 sm:p-8 animate-in fade-in duration-200">

          {/* Encabezado */}
          <div className="text-center mb-6">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
              Project <span className="text-purple-600">Nataly</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              Gestión Académica Escolar
            </p>
          </div>

          {!isSupabaseConfigured && (
            <div className="mb-4 rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              Falta configurar la conexión a Supabase.
            </div>
          )}

          {(error || authError) && (
            <div className="mb-4 rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700 animate-in fade-in duration-150">
              {error || authError}
            </div>
          )}

          {/* PASO 1: Selector de Rol (única cosa mostrada si no hay rol elegido) */}
          {!role ? (
            <div className="space-y-4">
              <div className="text-center pb-1">
                <p className="text-xs font-bold uppercase tracking-wider text-purple-700 bg-purple-50 inline-block px-3 py-1 rounded-full border border-purple-100">
                  Selecciona tu rol para ingresar
                </p>
              </div>

              <div className="space-y-2.5">
                {roles.map(({ id, label, description, icon: Icon, lightColor }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleSelectRole(id)}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-200/90 hover:border-purple-300 hover:bg-purple-50/50 transition-all cursor-pointer group text-left shadow-xs hover:shadow-md hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${lightColor} group-hover:bg-purple-600 group-hover:text-white group-hover:border-purple-600 transition-colors`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-black text-slate-800 group-hover:text-purple-900 transition-colors">
                          {label}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {description}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* PASO 2: Formulario de credenciales para el rol elegido */
            <div className="space-y-5 animate-in fade-in zoom-in-95 duration-150">

              {/* Barra superior con rol actual y opción para volver al selector */}
              <div className="flex items-center justify-between bg-purple-50/70 border border-purple-100 p-2.5 rounded-2xl">
                <div className="flex items-center gap-2 min-w-0">
                  {selectedRole?.icon && (
                    <selectedRole.icon className="w-4 h-4 text-purple-700 shrink-0" />
                  )}
                  <span className="text-xs font-bold text-purple-950 truncate">
                    Rol: {selectedRole?.label}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleResetRole}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-900 bg-white hover:bg-purple-100/60 px-2.5 py-1 rounded-xl border border-purple-200 transition-colors cursor-pointer"
                  title="Cambiar de rol"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Cambiar
                </button>
              </div>

              {/* Aviso para primer ingreso con Cédula (solo si nunca ha iniciado sesión) */}
              {!hasLoggedInBefore && !isNoticeDismissed && (
                <div className="flex items-start justify-between gap-2.5 p-3 rounded-2xl bg-amber-50/90 border border-amber-200/90 text-amber-950 text-xs animate-in fade-in">
                  <div className="flex items-start gap-2 min-w-0">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="leading-snug">
                      <strong className="font-bold">¿Primer ingreso?</strong> Si es tu primera vez ingresando, tu usuario y contraseña son tu <strong>número de documento (CC)</strong>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleDismissNotice}
                    className="text-amber-800/60 hover:text-amber-900 p-0.5 rounded-lg hover:bg-amber-200/40 transition-colors shrink-0 cursor-pointer"
                    title="Ocultar aviso"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Formulario */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    {role === 'guardian'
                      ? 'Correo, Cédula o código de estudiante'
                      : role === 'teacher'
                        ? 'Correo electrónico o Cédula (CC)'
                        : 'Correo electrónico institucional'}
                  </label>
                  <div className="relative">
                    <IdentifierIcon className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                    <input
                      required
                      value={identifier}
                      onChange={(event) => setIdentifier(event.target.value)}
                      placeholder={
                        role === 'guardian'
                          ? 'correo@ejemplo.com o documento'
                          : role === 'teacher'
                            ? 'correo@colegio.edu.co o cédula'
                            : 'admin@colegio.edu.co'
                      }
                      className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100 bg-slate-50/50 focus:bg-white"
                      autoComplete="username"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Contraseña
                  </label>
                  <input
                    required
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100 bg-slate-50/50 focus:bg-white"
                    autoComplete="current-password"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !isSupabaseConfigured}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-[0.99] py-3.5 px-4 text-sm font-bold text-white shadow-md shadow-purple-600/20 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  Entrar como {selectedRole?.label}
                </button>
              </form>

            </div>
          )}

        </section>

      </div>
    </main>
  );
}