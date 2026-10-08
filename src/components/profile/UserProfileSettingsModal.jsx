import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  User,
  Shield,
  KeyRound,
  Mail,
  IdCard,
  Phone,
  GraduationCap,
  HeartHandshake,
  ShieldCheck,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  BookOpen,
  Users
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import { escapeHtml } from '../../utils/formatters';

export default function UserProfileSettingsModal({ isOpen, onClose }) {
  const { profile, role, updatePassword, updateEmail, updatePhone } = useAuth();
  const { activeTeacher, students } = useApp();

  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security'
  
  // Estados para cambio de contraseña
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const resetPasswordForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowPassword(false);
    setErrorMessage('');
  };

  const isPlaceholderEmail =
    !profile?.email || profile?.email?.toLowerCase().includes('@colegioejemplo.edu.co');

  // Estados para agregar / editar correo electrónico
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [customEmail, setCustomEmail] = useState(() => (isPlaceholderEmail ? '' : (profile?.email || '')));
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [emailError, setEmailError] = useState('');

  // Estados para agregar / editar teléfono
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [customPhone, setCustomPhone] = useState(() => (profile?.phone || ''));
  const [isSavingPhone, setIsSavingPhone] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  // Sincronizar correo y teléfono si cambia el perfil o estado del modal sin disparo en cascada
  const [prevSyncKey, setPrevSyncKey] = useState(() => `${profile?.id}-${profile?.email}-${profile?.phone}-${isOpen}`);
  const syncKey = `${profile?.id}-${profile?.email}-${profile?.phone}-${isOpen}`;
  if (prevSyncKey !== syncKey) {
    setPrevSyncKey(syncKey);
    setCustomEmail(isPlaceholderEmail ? '' : (profile?.email || ''));
    setCustomPhone(profile?.phone || '');
    setIsEditingEmail(false);
    setIsEditingPhone(false);
    setEmailError('');
    setPhoneError('');
    resetPasswordForm();
  }

  // Manejar tecla Escape y bloqueo de scroll de fondo
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const roleName =
    role === 'admin'
      ? 'Administrador General'
      : role === 'teacher'
      ? 'Docente Titular'
      : 'Acudiente de Familia';

  const roleIcon =
    role === 'admin' ? ShieldCheck : role === 'teacher' ? GraduationCap : HeartHandshake;
  const RoleIconComponent = roleIcon;

  const userInitials = (profile?.full_name || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase();

  // Estudiantes a cargo si es acudiente
  const guardianStudents = role === 'guardian' ? students : [];

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!currentPassword) {
      setErrorMessage('Por favor ingresa tu contraseña actual.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('La nueva contraseña debe contener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden. Por favor revisa.');
      return;
    }

    if (newPassword === currentPassword) {
      setErrorMessage('La nueva contraseña debe ser diferente a la contraseña actual.');
      return;
    }

    const docNumber = profile?.document_number?.trim();
    if (docNumber && newPassword.trim() === docNumber) {
      setErrorMessage('Por seguridad, la nueva contraseña no puede ser igual a tu número de documento.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await updatePassword(newPassword, currentPassword);
      if (result?.error) {
        setErrorMessage(result.error.message || 'Error al actualizar la contraseña.');
        setIsSubmitting(false);
        return;
      }

      resetPasswordForm();

      Swal.fire({
        title: '¡Contraseña actualizada!',
        text: 'Tu contraseña se ha modificado exitosamente.',
        icon: 'success',
        timer: 2500,
        showConfirmButton: false,
        customClass: {
          popup: 'dark-swal',
          title: 'dark-swal-title',
          htmlContainer: 'dark-swal-content'
        },
        buttonsStyling: false
      });

      setActiveTab('profile');
    } catch (err) {
      setErrorMessage(err.message || 'Error inesperado.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveEmail = async (e) => {
    e.preventDefault();
    setEmailError('');

    const clean = customEmail.trim().toLowerCase();
    if (!clean || !clean.includes('@') || clean.length < 5) {
      setEmailError('Por favor ingresa un correo electrónico válido (ej. usuario@gmail.com).');
      return;
    }

    if (clean === profile?.email?.toLowerCase()) {
      setIsEditingEmail(false);
      return;
    }

    setIsSavingEmail(true);
    try {
      const result = await updateEmail(clean);
      if (result?.error) {
        setEmailError(result.error.message || 'No se pudo actualizar el correo electrónico.');
        setIsSavingEmail(false);
        return;
      }

      setIsEditingEmail(false);
      Swal.fire({
        title: '¡Correo guardado!',
        html: `Tu correo electrónico ha sido actualizado a <b>${escapeHtml(clean)}</b>. Ahora también podrás usarlo para iniciar sesión.`,
        icon: 'success',
        timer: 3000,
        showConfirmButton: false,
        customClass: {
          popup: 'dark-swal',
          title: 'dark-swal-title',
          htmlContainer: 'dark-swal-content'
        },
        buttonsStyling: false
      });
    } catch (err) {
      setEmailError(err.message || 'Error inesperado al guardar el correo.');
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleSavePhone = async (e) => {
    e.preventDefault();
    setPhoneError('');

    const clean = customPhone.trim();
    if (clean && clean.length < 7) {
      setPhoneError('Por favor ingresa un número de teléfono válido (mínimo 7 dígitos).');
      return;
    }

    if (clean === (profile?.phone || '').trim()) {
      setIsEditingPhone(false);
      return;
    }

    setIsSavingPhone(true);
    try {
      const result = await updatePhone(clean);
      if (result?.error) {
        setPhoneError(result.error.message || 'No se pudo actualizar el teléfono.');
        setIsSavingPhone(false);
        return;
      }

      setIsEditingPhone(false);
      Swal.fire({
        title: '¡Teléfono guardado!',
        text: clean ? `Tu teléfono de contacto se actualizó a ${clean}.` : 'Tu teléfono ha sido actualizado.',
        icon: 'success',
        timer: 2500,
        showConfirmButton: false,
        customClass: {
          popup: 'dark-swal',
          title: 'dark-swal-title',
          htmlContainer: 'dark-swal-content'
        },
        buttonsStyling: false
      });
    } catch (err) {
      setPhoneError(err.message || 'Error inesperado al guardar el teléfono.');
    } finally {
      setIsSavingPhone(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col my-auto max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera de la Ventana */}
        <div className="p-5 sm:p-6 bg-linear-to-r from-purple-700 via-indigo-700 to-purple-800 text-white relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-all cursor-pointer shadow-xs active:scale-95"
            title="Cerrar ventana"
            aria-label="Cerrar ventana"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-4">
            <div className="relative">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-white/40 shadow-md"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-white/20 border border-white/30 text-white flex items-center justify-center font-black text-lg shadow-md">
                  {userInitials}
                </div>
              )}
              <span className="absolute -bottom-1 -right-1 p-1 rounded-lg bg-emerald-500 border border-white" title="Activo">
                <RoleIconComponent className="w-3 h-3 text-white" />
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <span className="inline-block text-[10px] font-extrabold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full border border-white/20">
                {roleName}
              </span>
              <h3 className="text-lg font-black text-white truncate mt-1">
                {profile?.full_name || 'Mi Perfil'}
              </h3>
              <p className="text-xs text-purple-100 truncate opacity-90">
                {isPlaceholderEmail ? 'Sin correo personal vinculado' : profile?.email}
              </p>
            </div>
          </div>

          {/* Selector de Pestañas */}
          <div className="flex gap-2 mt-5 bg-black/15 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-white text-purple-900 shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Datos del Usuario
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'security'
                  ? 'bg-white text-purple-900 shadow-sm'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              Seguridad y Contraseña
            </button>
          </div>
        </div>

        {/* Contenido según pestaña */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          
          {/* PESTAÑA 1: DATOS DEL USUARIO */}
          {activeTab === 'profile' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              <div className="space-y-2.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-1 px-1">
                  Información Personal
                </h4>

                {/* 1. Tarjeta: Nombre completo (Solo lectura) */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-slate-500">Nombre completo</p>
                      <p className="text-sm font-bold text-slate-800 truncate">{profile?.full_name || 'No especificado'}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg shrink-0">
                    Institucional
                  </span>
                </div>

                {/* 2. Tarjeta: Documento / Cédula (Solo lectura) */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 flex items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-fuchsia-100 text-fuchsia-700 flex items-center justify-center shrink-0">
                      <IdCard className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-slate-500">Documento / Cédula (CC)</p>
                      <p className="text-sm font-bold text-slate-800 truncate">
                        {profile?.document_number || 'No registrado'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg shrink-0">
                    Identificación
                  </span>
                </div>

                {/* 3. Tarjeta: Teléfono (Editable) */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-slate-500">Teléfono de contacto</p>
                        <p className="text-sm font-bold text-slate-800 truncate">
                          {profile?.phone || (
                            <span className="text-slate-400 font-normal italic text-xs">
                              Sin teléfono registrado
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {!isEditingPhone && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingPhone(true);
                          setIsEditingEmail(false);
                          setCustomPhone(profile?.phone || '');
                          setPhoneError('');
                        }}
                        className="text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-all shrink-0 cursor-pointer"
                      >
                        {profile?.phone ? 'Cambiar teléfono' : '+ Agregar teléfono'}
                      </button>
                    )}
                  </div>

                  {/* Formulario para editar teléfono */}
                  {isEditingPhone && (
                    <form onSubmit={handleSavePhone} className="pt-2 border-t border-slate-100 space-y-2.5 animate-in fade-in">
                      {phoneError && (
                        <div className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-xl flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{phoneError}</span>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Número de teléfono celular o fijo:
                        </label>
                        <input
                          type="tel"
                          value={customPhone}
                          onChange={(e) => setCustomPhone(e.target.value)}
                          placeholder="Ej: 3127031796"
                          className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 bg-slate-50 focus:bg-white"
                          autoFocus
                        />
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingPhone(false);
                            setPhoneError('');
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingPhone}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                        >
                          {isSavingPhone ? (
                            <>
                              <LoaderCircle className="w-3 h-3 animate-spin" />
                              Guardando...
                            </>
                          ) : (
                            'Guardar teléfono'
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* 4. Tarjeta: Correo Electrónico (Editable) */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold text-slate-500">Correo electrónico personal</p>
                        <p className="text-sm font-bold text-slate-800 truncate">
                          {isPlaceholderEmail ? (
                            <span className="text-amber-800 font-semibold italic text-xs">
                              Sin correo personal vinculado
                            </span>
                          ) : (
                            profile?.email
                          )}
                        </p>
                      </div>
                    </div>

                    {!isEditingEmail && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingEmail(true);
                          setIsEditingPhone(false);
                          setCustomEmail(isPlaceholderEmail ? '' : (profile?.email || ''));
                          setEmailError('');
                        }}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all shrink-0 cursor-pointer ${
                          isPlaceholderEmail
                            ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-xs'
                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        {isPlaceholderEmail ? '+ Agregar correo' : 'Cambiar correo'}
                      </button>
                    )}
                  </div>

                  {/* Mensaje informativo si no tiene correo personal configurado */}
                  {isPlaceholderEmail && !isEditingEmail && (
                    <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/70 text-amber-950 text-xs">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="leading-snug">
                        El administrador registró tu cuenta usando únicamente tu cédula. Vincula tu correo electrónico personal para recibir notificaciones y tener un método de acceso alternativo.
                      </p>
                    </div>
                  )}

                  {/* Formulario para agregar o cambiar correo */}
                  {isEditingEmail && (
                    <form onSubmit={handleSaveEmail} className="pt-2 border-t border-slate-100 space-y-2.5 animate-in fade-in">
                      {emailError && (
                        <div className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-xl flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{emailError}</span>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          {isPlaceholderEmail ? 'Ingresa tu correo electrónico personal:' : 'Nuevo correo electrónico:'}
                        </label>
                        <input
                          type="email"
                          required
                          value={customEmail}
                          onChange={(e) => setCustomEmail(e.target.value)}
                          placeholder="ejemplo@gmail.com"
                          className="w-full rounded-xl border border-slate-200 py-2 px-3 text-xs outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100 bg-slate-50 focus:bg-white"
                          autoFocus
                        />
                      </div>

                      <p className="text-[11px] text-slate-500">
                        Una vez guardado, también podrás utilizar este correo para iniciar sesión o recuperar tu cuenta.
                      </p>

                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingEmail(false);
                            setEmailError('');
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingEmail}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-60"
                        >
                          {isSavingEmail ? (
                            <>
                              <LoaderCircle className="w-3 h-3 animate-spin" />
                              Guardando...
                            </>
                          ) : (
                            'Guardar correo'
                          )}
                        </button>
                      </div>
                    </form>
                  )}
                </div>

              </div>

              {/* Información contextual por rol */}
              {role === 'teacher' && activeTeacher && (
                <div className="bg-indigo-50/70 rounded-2xl p-4 border border-indigo-100">
                  <h4 className="text-xs font-black uppercase tracking-wider text-indigo-900 mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-700" />
                    Detalles Académicos del Docente
                  </h4>
                  <p className="text-xs text-indigo-950 font-medium">
                    Materia principal: <strong>{activeTeacher.subject || 'Sin asignar'}</strong>
                  </p>
                  {activeTeacher.grades?.length > 0 && (
                    <p className="text-xs text-indigo-900 mt-1">
                      Cursos asignados: <strong>{activeTeacher.grades.join(', ')}</strong>
                    </p>
                  )}
                </div>
              )}

              {role === 'guardian' && guardianStudents.length > 0 && (
                <div className="bg-fuchsia-50/70 rounded-2xl p-4 border border-fuchsia-100">
                  <h4 className="text-xs font-black uppercase tracking-wider text-fuchsia-900 mb-2 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-fuchsia-700" />
                    Estudiantes a Cargo ({guardianStudents.length})
                  </h4>
                  <div className="space-y-1.5">
                    {guardianStudents.map(st => (
                      <div key={st.id} className="flex items-center justify-between text-xs bg-white/80 p-2.5 rounded-xl border border-fuchsia-200">
                        <span className="font-bold text-slate-800">{st.name}</span>
                        <span className="text-[11px] font-semibold text-fuchsia-700 bg-fuchsia-100/60 px-2 py-0.5 rounded-lg">
                          Grado {st.gradeName}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PESTAÑA 2: SEGURIDAD Y CAMBIO DE CONTRASEÑA */}
          {activeTab === 'security' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="bg-purple-50/60 rounded-2xl p-4 border border-purple-100 flex items-start gap-3">
                <Shield className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                <p className="text-xs text-purple-900 leading-relaxed font-medium">
                  Para proteger tu cuenta, asegúrate de utilizar una contraseña con al menos 6 caracteres que recuerdes con facilidad.
                </p>
              </div>

              {errorMessage && (
                <div className="flex items-start gap-2 rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handlePasswordChange} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Contraseña Actual
                  </label>
                  <div className="relative">
                    <input
                      required
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Ingresa tu contraseña actual"
                      className="w-full rounded-xl border border-slate-200 py-2.5 pl-3.5 pr-10 text-sm outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100 bg-slate-50/50 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      tabIndex={-1}
                      aria-label={showCurrentPassword ? 'Ocultar contraseña actual' : 'Ver contraseña actual'}
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Nueva Contraseña
                  </label>
                  <div className="relative">
                    <input
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full rounded-xl border border-slate-200 py-2.5 pl-3.5 pr-10 text-sm outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100 bg-slate-50/50 focus:bg-white"
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Ocultar nueva contraseña' : 'Ver nueva contraseña'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Confirmar Nueva Contraseña
                  </label>
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la nueva contraseña"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100 bg-slate-50/50 focus:bg-white"
                    minLength={6}
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      resetPasswordForm();
                      setActiveTab('profile');
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-[0.99] text-xs font-bold text-white shadow-md shadow-purple-600/20 transition-all cursor-pointer disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Guardar Contraseña
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>

        {/* Pie del modal con botón de cierre limpio */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Cerrar ventana
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
