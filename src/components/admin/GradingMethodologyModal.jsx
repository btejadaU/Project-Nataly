import React, { useState, useEffect, useId } from 'react';
import {
  SlidersHorizontal,
  X,
  CheckCircle2,
  Calculator,
  Percent,
  GraduationCap,
  Sparkles,
  Info,
  Save,
  Check
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import Swal from 'sweetalert2';

const METHODOLOGIES = [
  {
    id: 'one_five',
    title: 'Escala 0.0 a 5.0',
    badge: 'Estándar Nacional',
    description: 'Calificación decimal tradicional de Colombia y Latinoamérica. Permite evaluar con precisión decimal.',
    icon: Calculator,
    defaultPassing: 3.0,
    min: 0,
    max: 5,
    step: 0.1,
    samplePassing: '4.5',
    sampleFailing: '2.5',
    passingLabel: 'Aprobado (≥ {val})',
    failingLabel: 'Reprobado (< {val})'
  },
  {
    id: 'zero_hundred',
    title: 'Escala 0 a 100',
    badge: 'Porcentual / Puntos',
    description: 'Escala en base a 100 puntos comúnmente utilizada en bachillerato internacional y áreas técnicas.',
    icon: Percent,
    defaultPassing: 60,
    min: 0,
    max: 100,
    step: 1,
    samplePassing: '85',
    sampleFailing: '50',
    passingLabel: 'Aprobado (≥ {val} pts)',
    failingLabel: 'Reprobado (< {val} pts)'
  },
  {
    id: 'a_f',
    title: 'Letras (A a F)',
    badge: 'Cualitativa / Anglo',
    description: 'Evaluación formativa por escalas de letras: A (Excelente), B (Bueno), C (Aceptable), D y F.',
    icon: GraduationCap,
    defaultPassing: 3.0,
    min: 1,
    max: 5,
    step: 0.1,
    samplePassing: 'A (Excelente)',
    sampleFailing: 'D (Insuficiente)',
    passingLabel: 'Aceptable o superior (A, B, C)',
    failingLabel: 'Insuficiente (D, F)'
  }
];

export default function GradingMethodologyModal({ isOpen, onClose }) {
  const { gradingSettings, saveGradingSettings } = useApp();
  const modalTitleId = useId();

  const [selectedFormat, setSelectedFormat] = useState('one_five');
  const [passingValue, setPassingValue] = useState(3.0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Sincronizar estado cuando el modal se abre
  useEffect(() => {
    if (isOpen) {
      const currentFormat = gradingSettings?.format || 'one_five';
      const currentPassing = gradingSettings?.passingValue ?? (currentFormat === 'zero_hundred' ? 60 : 3.0);
      setSelectedFormat(currentFormat);
      setPassingValue(currentPassing);
      setErrorMessage('');
    }
  }, [isOpen, gradingSettings]);

  // Manejo de tecla Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentMethodology = METHODOLOGIES.find(m => m.id === selectedFormat) || METHODOLOGIES[0];

  const handleSelectFormat = (formatId) => {
    setSelectedFormat(formatId);
    setErrorMessage('');
    const target = METHODOLOGIES.find(m => m.id === formatId);
    if (!target) return;

    // Ajustar valor aprobatorio si está fuera del nuevo rango
    if (formatId === 'zero_hundred' && passingValue <= 5) {
      setPassingValue(target.defaultPassing);
    } else if (formatId === 'one_five' && passingValue > 5) {
      setPassingValue(target.defaultPassing);
    } else if (formatId === 'a_f' && passingValue > 5) {
      setPassingValue(target.defaultPassing);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const numericPassing = Number(passingValue);
    if (isNaN(numericPassing)) {
      setErrorMessage('Por favor ingresa un valor numérico válido.');
      return;
    }

    if (numericPassing < currentMethodology.min || numericPassing > currentMethodology.max) {
      setErrorMessage(
        `Para la ${currentMethodology.title}, la nota aprobatoria debe estar entre ${currentMethodology.min} y ${currentMethodology.max}.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await saveGradingSettings({
        format: selectedFormat,
        passingValue: numericPassing
      });

      Swal.fire({
        title: '¡Metodología actualizada!',
        html: `Se configuró la institución con <b>${currentMethodology.title}</b> y nota mínima aprobatoria de <b>${numericPassing}</b>.`,
        icon: 'success',
        confirmButtonText: 'Aceptar',
        customClass: {
          popup: 'dark-swal',
          title: 'dark-swal-title',
          htmlContainer: 'dark-swal-content',
          confirmButton: 'primary-btn dark-swal-confirm'
        },
        buttonsStyling: false
      });

      onClose();
    } catch (err) {
      console.error('Error al guardar metodología:', err);
      setErrorMessage(err?.message || 'No se pudo guardar la metodología de calificación.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalTitleId}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl my-auto bg-white rounded-3xl shadow-2xl border border-purple-100/90 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Encabezado del Modal */}
        <div className="px-5 sm:px-7 py-4 sm:py-5 border-b border-purple-100/80 bg-gradient-to-r from-purple-50/80 via-indigo-50/40 to-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-xs shadow-purple-600/30">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 id={modalTitleId} className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Metodología de Calificación
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Configura la escala de evaluación institucional y la nota mínima aprobatoria.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido / Formulario */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-7 overflow-y-auto space-y-6 flex-1">
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <Info className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Selector de Escalas */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-3">
              Selecciona la escala institucional
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {METHODOLOGIES.map((methodology) => {
                const Icon = methodology.icon;
                const isSelected = selectedFormat === methodology.id;
                return (
                  <button
                    key={methodology.id}
                    type="button"
                    onClick={() => handleSelectFormat(methodology.id)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-purple-600 bg-purple-50/40 shadow-xs ring-2 ring-purple-500/20'
                        : 'border-slate-200/80 bg-white hover:border-purple-200 hover:bg-slate-50/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                            isSelected ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        {isSelected && (
                          <span className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-black text-slate-900">{methodology.title}</h4>
                      <span className="inline-block px-2 py-0.5 mt-1 rounded-md text-[10px] font-bold bg-purple-100/80 text-purple-800">
                        {methodology.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2.5 leading-snug">
                      {methodology.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Configuración de Nota Mínima Aprobatoria */}
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label
                  htmlFor="passing-value-input"
                  className="block text-xs font-black text-slate-800 tracking-tight"
                >
                  Nota Mínima Aprobatoria
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Calificación mínima requerida para aprobar actividades y periodos.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="passing-value-input"
                  type="number"
                  min={currentMethodology.min}
                  max={currentMethodology.max}
                  step={currentMethodology.step}
                  value={passingValue}
                  onChange={(e) => setPassingValue(e.target.value)}
                  required
                  className="w-24 px-3 py-2 text-center text-lg font-black text-slate-900 bg-white rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600"
                />
                <span className="text-xs font-bold text-slate-500">
                  / {currentMethodology.max}
                </span>
              </div>
            </div>
          </div>

          {/* Vista Previa en Tiempo Real */}
          <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50/30 to-indigo-50/20 p-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span>Vista previa de visualización en la plataforma</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Ejemplo Aprobado */}
              <div className="p-3 bg-white rounded-xl border border-emerald-200/80 shadow-2xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {currentMethodology.passingLabel.replace('{val}', String(passingValue))}
                </span>
                <div className="text-xl font-black text-emerald-700 mt-1">
                  {currentMethodology.samplePassing}
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Desempeño satisfactorio</p>
              </div>

              {/* Ejemplo Reprobado */}
              <div className="p-3 bg-white rounded-xl border border-rose-200/80 shadow-2xs">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  {currentMethodology.failingLabel.replace('{val}', String(passingValue))}
                </span>
                <div className="text-xl font-black text-rose-700 mt-1">
                  {currentMethodology.sampleFailing}
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Requiere refuerzo pedagógico</p>
              </div>
            </div>
          </div>

          {/* Acciones del pie de página */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 active:scale-95 transition-all shadow-xs shadow-purple-600/30 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar Metodología</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
