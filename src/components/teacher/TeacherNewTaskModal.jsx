import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, BookOpen, Plus, Calendar, FileText, LoaderCircle } from 'lucide-react';
import { toLocalISODate } from '../../utils/formatters';

export default function TeacherNewTaskModal({
  isOpen,
  onClose,
  currentClass,
  onCreateTask
}) {
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDueDate('');
      setDescription('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Manejar bloqueo de scroll del fondo y tecla Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !currentClass) return null;

  const todayStr = toLocalISODate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !dueDate || dueDate < todayStr) return;

    setIsSubmitting(true);
    try {
      await onCreateTask({
        title: title.trim(),
        subjectId: currentClass.subjectId,
        gradeId: currentClass.gradeId,
        dueDate,
        description: description.trim()
      });
      onClose();
    } catch (err) {
      console.error('Error al crear tarea:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200 select-none touch-none"
      onClick={onClose}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchEnd={(e) => {
        if (e.target === e.currentTarget) {
          if (e.cancelable) e.preventDefault();
          e.stopPropagation();
          onClose();
        }
      }}
      role="presentation"
      aria-hidden="true"
    >
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150 select-text touch-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-task-modal-title"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-purple-100 flex items-center justify-between bg-gradient-to-r from-purple-50/80 via-indigo-50/40 to-white">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 shadow-2xs">
              <Plus className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 id="new-task-modal-title" className="text-base font-black text-slate-900 truncate">
                Nueva Tarea Escolar
              </h3>
              <p className="text-xs text-slate-600 mt-0.5 truncate">
                Para: <strong className="text-purple-700">{currentClass.subjectName} ({currentClass.gradeName})</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            aria-label="Cerrar modal de creación"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          <div>
            <label htmlFor="task-title-input" className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-purple-600" />
              Nombre de la Tarea / Actividad
            </label>
            <input
              id="task-title-input"
              type="text"
              required
              placeholder="Ej: Taller Práctico de Funciones Lineales"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-sm text-slate-900 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500 shadow-2xs transition-all"
            />
          </div>

          <div>
            <label htmlFor="task-due-date-input" className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-purple-600" />
              Fecha Límite de Entrega
            </label>
            <input
              id="task-due-date-input"
              type="date"
              required
              min={todayStr}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-sm text-slate-900 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500 shadow-2xs transition-all"
            />
          </div>

          <div>
            <label htmlFor="task-desc-input" className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-purple-600" />
              Descripción e Instrucciones (opcional)
            </label>
            <textarea
              id="task-desc-input"
              rows="3"
              placeholder="Puntos a resolver, rúbrica o criterios de presentación..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-sm text-slate-900 bg-slate-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500 shadow-2xs transition-all resize-none"
            ></textarea>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !dueDate}
              className="px-5 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-md hover:bg-purple-700 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2 active:scale-[0.99]"
            >
              {isSubmitting && <LoaderCircle className="w-4 h-4 animate-spin" />}
              <span>{isSubmitting ? 'Creando...' : 'Crear Tarea'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
