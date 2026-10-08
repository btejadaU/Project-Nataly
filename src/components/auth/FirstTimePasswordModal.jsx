import React, { useState } from 'react';
import { KeyRound, ShieldAlert, CheckCircle2, Eye, EyeOff, LoaderCircle, LogOut } from 'lucide-react';
import Swal from 'sweetalert2';
import { useAuth } from '../../context/AuthContext';

export default function FirstTimePasswordModal() {
  const { profile, completePasswordChange, signOut } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (newPassword.length < 6) {
      setErrorMessage('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden. Por favor verifica.');
      return;
    }

    // Evitar que coloquen nuevamente su número de cédula como contraseña
    const docNumber = profile?.document_number?.trim();
    if (docNumber && newPassword.trim() === docNumber) {
      setErrorMessage('Por seguridad, la nueva contraseña no puede ser igual a tu número de documento.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await completePasswordChange(newPassword);
      if (result?.error) {
        setErrorMessage(result.error.message || 'No se pudo actualizar la contraseña.');
        setIsSubmitting(false);
        return;
      }

      Swal.fire({
        title: '¡Contraseña actualizada!',
        text: 'Tu contraseña personal ha sido establecida correctamente. ¡Bienvenido a Project Nataly!',
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
      setErrorMessage(err.message || 'Ocurrió un error inesperado al actualizar.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-purple-100 p-6 sm:p-8 relative overflow-hidden">
        
        {/* Adorno superior de color */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-fuchsia-600" />

        {/* Encabezado */}
        <div className="text-center mb-6 pt-2">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mb-3 shadow-inner">
            <KeyRound className="w-7 h-7" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
            Actualización requerida
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 font-medium leading-relaxed">
            Hola, <strong className="text-slate-800">{profile?.full_name || 'Usuario'}</strong>. Al ser tu primer ingreso con tu documento de identidad, debes crear una contraseña segura para tu cuenta.
          </p>
        </div>

        {errorMessage && (
          <div className="mb-4 flex items-start gap-2 rounded-2xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700 animate-in fade-in">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
                className="w-full rounded-xl border border-slate-200 py-3 pl-3.5 pr-10 text-sm outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100 bg-slate-50/50 focus:bg-white"
                minLength={6}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
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
              placeholder="Repite la contraseña"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none transition focus:border-purple-500 focus:ring-4 focus:ring-purple-100 bg-slate-50/50 focus:bg-white"
              minLength={6}
            />
          </div>

          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-[0.99] py-3.5 px-4 text-sm font-bold text-white shadow-md shadow-purple-600/20 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <LoaderCircle className="w-4 h-4 animate-spin" />
                  Guardando contraseña...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Actualizar y continuar
                </>
              )}
            </button>

            <button
              type="button"
              onClick={signOut}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Cerrar sesión por ahora
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
