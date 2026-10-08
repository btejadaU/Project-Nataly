import React, { useState, useId } from 'react';
import {
  UserPlus,
  X,
  User,
  CreditCard,
  Hash,
  School,
  Search,
  BookOpen,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import Swal from 'sweetalert2';
import { generateStudentCode } from '../../utils/studentCode';
import { escapeHtml } from '../../utils/formatters';

export default function StudentEnrollmentModal({ isOpen, onClose, onEnrolled }) {
  const { grades, subjects, teachers, guardians, students, teacherAssignments, saveStudent } = useApp();

  // Estados del Estudiante
  const [studentName, setStudentName] = useState('');
  const [studentDoc, setStudentDoc] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState(() => grades[0]?.id || '');
  const [studentCode, setStudentCode] = useState('');

  // Estados del Acudiente
  const [guardianMode, setGuardianMode] = useState('existing'); // 'existing' | 'new'
  const [selectedGuardianId, setSelectedGuardianId] = useState('');
  const [guardianSearch, setGuardianSearch] = useState('');
  const [newGuardian, setNewGuardian] = useState({
    fullName: '',
    documentNumber: '',
    phone: '',
    email: '',
    kinship: 'Madre'
  });

  // Estados de control
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const modalTitleId = useId();

  // Si cambia grades y no hay curso seleccionado, sincronizar curso por defecto
  const activeCourseId = selectedCourseId || grades[0]?.id || '';

  // Asignar código estudiantil automáticamente según el curso seleccionado
  const [prevCourseKey, setPrevCourseKey] = useState(() => `${isOpen}-${activeCourseId}`);
  const courseKey = `${isOpen}-${activeCourseId}`;
  if (prevCourseKey !== courseKey) {
    setPrevCourseKey(courseKey);
    if (isOpen) {
      const course = grades.find(g => g.id === activeCourseId) || grades[0];
      setStudentCode(generateStudentCode(course, students));
    }
  }

  if (!isOpen) return null;

  // Curso seleccionado y sus materias asignadas
  const currentCourse = grades.find(g => g.id === activeCourseId);
  const courseAssignments = teacherAssignments.filter(a => a.class_group_id === activeCourseId);
  const courseSubjects = courseAssignments.map(a => {
    const sub = subjects.find(s => s.id === a.subject_id);
    const tea = teachers.find(t => t.id === a.teacher_id);
    return {
      id: a.id,
      subjectName: sub?.name || 'Materia asignada',
      icon: sub?.icon,
      color: sub?.color || 'purple',
      teacherName: tea?.name || 'Por asignar'
    };
  });

  // Filtrado de acudientes existentes
  const filteredGuardians = guardians.filter(g => {
    const term = guardianSearch.toLowerCase().trim();
    if (!term) return true;
    return (
      (g.full_name && g.full_name.toLowerCase().includes(term)) ||
      (g.document_number && g.document_number.includes(term)) ||
      (g.email && g.email.toLowerCase().includes(term))
    );
  });

  function formatErrorMessage(error) {
    if (!error) return 'Ocurrió un error inesperado al procesar la inscripción.';
    const msg = typeof error === 'string' ? error : error.message || '';

    if (msg.includes('duplicate key') || msg.includes('unique constraint') || msg.includes('23505') || msg.includes('users_email_key')) {
      if (msg.includes('users_email_key') || msg.includes('email')) {
        return 'Ya existe una cuenta con este número de documento o correo en el sistema. Si el acudiente ya fue creado previamente, búscalo y selecciónalo en la pestaña "Acudiente Registrado".';
      }
      if (msg.includes('estudiantes_document_number') || msg.includes('perfiles_acudientes_document_number') || msg.includes('document_number')) {
        return 'Usuario ya registrado: este número de documento ya pertenece a un estudiante o acudiente en el sistema.';
      }
      if (msg.includes('student_code')) {
        return 'El código de estudiante generado ya está en uso. Por favor ingresa otro código.';
      }
      return 'Este usuario o documento ya se encuentra registrado en el sistema.';
    }

    return msg;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!studentName.trim()) {
      setErrorMessage('Por favor ingresa el nombre completo del estudiante.');
      return;
    }
    if (!studentDoc.trim()) {
      setErrorMessage('Por favor ingresa el número de documento del estudiante.');
      return;
    }
    if (!activeCourseId) {
      setErrorMessage('Por favor selecciona el curso al que ingresar el estudiante.');
      return;
    }

    let finalGuardianId = selectedGuardianId;

    setIsSubmitting(true);

    try {
      // 1. Si se eligió registrar un nuevo acudiente:
      if (guardianMode === 'new') {
        const cleanGuardianDoc = newGuardian.documentNumber.trim();
        const cleanGuardianName = newGuardian.fullName.trim();

        if (!cleanGuardianName || !cleanGuardianDoc) {
          throw new Error('Por favor completa el nombre y documento del nuevo acudiente.');
        }

        if (cleanGuardianDoc.length < 6) {
          throw new Error('El número de documento del acudiente debe tener al menos 6 dígitos para que el sistema pueda asignarlo como contraseña inicial segura.');
        }

        // Verificar si ya existe en la lista de acudientes
        const existingGuardian = (guardians || []).find(
          g => String(g.document_number || '').trim() === cleanGuardianDoc
        );
        if (existingGuardian) {
          throw new Error(`El acudiente con cédula ${cleanGuardianDoc} (${existingGuardian.full_name}) ya está registrado. Por favor selecciónalo en la pestaña "Acudiente Registrado".`);
        }

        const generatedEmail = newGuardian.email.trim()
          ? newGuardian.email.trim().toLowerCase()
          : `acudiente.${cleanGuardianDoc}@colegioejemplo.edu.co`;

        // Registrar el acudiente vía función RPC de PostgreSQL (evita fallos de Edge Functions)
        const { data: rpcUserId, error: rpcError } = await supabase.rpc('crear_usuario_por_admin', {
          p_full_name: cleanGuardianName,
          p_email: generatedEmail,
          p_document_number: cleanGuardianDoc,
          p_phone: newGuardian.phone.trim() || null,
          p_role: 'guardian'
        });

        if (!rpcError && rpcUserId) {
          finalGuardianId = rpcUserId;
        } else if (rpcError) {
          console.warn('Detalle error RPC Supabase:', rpcError);
          // Si el error fue por duplicado, propagarlo directamente
          if (rpcError.message?.includes('duplicate key') || rpcError.message?.includes('unique constraint') || rpcError.code === '23505') {
            throw rpcError;
          }

          // Si el RPC falla específicamente porque el endpoint no está expuesto en el catálogo
          if (rpcError.code === 'PGRST202' || rpcError.message?.includes('schema cache')) {
            throw new Error('Supabase no encuentra la función en su caché aún. Por favor ejecuta el comando NOTIFY en el SQL Editor para recargar el caché de la API.');
          }

          throw rpcError;
        } else {
          throw new Error('No se pudo generar la cuenta para el acudiente.');
        }
      } else {
        // Validación acudiente existente
        if (!finalGuardianId) {
          throw new Error('Por favor selecciona un acudiente de la lista para vincular al estudiante.');
        }
      }

      // 2. Guardar estudiante en la base de datos
      await saveStudent({
        name: studentName.trim(),
        documentNumber: studentDoc.trim(),
        studentCode: studentCode.trim() || generateStudentCode(currentCourse, students),
        gradeId: activeCourseId,
        guardianId: finalGuardianId,
        status: 'active'
      });

      // Notificación de éxito
      Swal.fire({
        title: '¡Estudiante Inscrito!',
        html: `El estudiante <b>${escapeHtml(studentName.trim())}</b> ha sido matriculado satisfactoriamente en <b>${escapeHtml(currentCourse?.name || 'su curso')}</b>.`,
        icon: 'success',
        confirmButtonText: 'Continuar',
        customClass: {
          popup: 'dark-swal',
          title: 'dark-swal-title',
          htmlContainer: 'dark-swal-content',
          confirmButton: 'primary-btn dark-swal-confirm'
        },
        buttonsStyling: false
      });

      if (onEnrolled) onEnrolled();
      onClose();
    } catch (err) {
      console.error('Error en inscripción:', err);
      setErrorMessage(formatErrorMessage(err));
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
    >
      <div className="relative w-full max-w-3xl my-auto bg-white rounded-3xl shadow-2xl border border-purple-100/90 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Encabezado */}
        <div className="px-5 sm:px-7 py-4 sm:py-5 border-b border-purple-100/80 bg-gradient-to-r from-purple-50/70 to-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-xs shadow-purple-600/30">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 id={modalTitleId} className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Inscribir Nuevo Estudiante
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Matrícula académica, vinculación de acudiente y plan de asignaturas.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido desplazable */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-7 overflow-y-auto space-y-6 flex-1">
          
          {/* Alerta de Error */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs sm:text-sm animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-semibold">{errorMessage}</div>
              <button
                type="button"
                onClick={() => setErrorMessage('')}
                className="text-rose-500 hover:text-rose-700 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* PASO 1: DATOS DEL ESTUDIANTE */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
              <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-black text-xs flex items-center justify-center">1</span>
              <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-purple-900">
                Información del Estudiante
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nombre Completo *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Ej. Carlos Mario Gómez"
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/50 text-xs sm:text-sm text-slate-800 focus:bg-white focus:border-purple-500 focus:outline-hidden transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Documento de Identidad (T.I / Registro) *
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Ej. 1101001015"
                    value={studentDoc}
                    onChange={(e) => setStudentDoc(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/50 text-xs sm:text-sm text-slate-800 focus:bg-white focus:border-purple-500 focus:outline-hidden transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Curso y Salón a Matricular *
                </label>
                <div className="relative">
                  <School className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    required
                    value={activeCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full pl-10 pr-8 py-2.5 rounded-2xl border border-slate-200 bg-slate-50/50 text-xs sm:text-sm text-slate-800 focus:bg-white focus:border-purple-500 focus:outline-hidden transition-all appearance-none cursor-pointer"
                  >
                    {grades.map(course => (
                      <option key={course.id} value={course.id}>
                        {course.name} ({course.salon} - {course.building || 'Sede'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Código Estudiantil (Automático)
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 text-purple-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    readOnly
                    value={studentCode}
                    className="w-full pl-10 pr-3 py-2.5 rounded-2xl border border-purple-200 bg-purple-50/60 text-xs sm:text-sm text-purple-950 font-bold focus:outline-hidden transition-all font-mono select-all cursor-default"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* PASO 2: VINCULACIÓN DEL ACUDIENTE */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-black text-xs flex items-center justify-center">2</span>
                <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-purple-900">
                  Acudiente Responsable
                </h4>
              </div>

              {/* Selector de Modo */}
              <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setGuardianMode('existing')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    guardianMode === 'existing'
                      ? 'bg-white text-purple-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Acudiente Registrado
                </button>
                <button
                  type="button"
                  onClick={() => setGuardianMode('new')}
                  className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                    guardianMode === 'new'
                      ? 'bg-white text-purple-700 shadow-xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  + Nuevo Acudiente
                </button>
              </div>
            </div>

            {guardianMode === 'existing' ? (
              <div className="space-y-3">
                {/* Buscador de acudientes */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, documento o correo del acudiente..."
                    value={guardianSearch}
                    onChange={(e) => setGuardianSearch(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 text-xs sm:text-sm text-slate-800 focus:bg-white focus:border-purple-500 focus:outline-hidden"
                  />
                </div>

                {/* Lista de acudientes */}
                <div className="max-h-44 overflow-y-auto space-y-2 border border-slate-100 rounded-2xl p-1 bg-slate-50/40">
                  {filteredGuardians.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-500">
                      No se encontraron acudientes con ese criterio.
                      <button
                        type="button"
                        onClick={() => setGuardianMode('new')}
                        className="block mx-auto mt-2 text-purple-600 font-bold hover:underline"
                      >
                        Crear nuevo acudiente ahora
                      </button>
                    </div>
                  ) : (
                    filteredGuardians.map(g => (
                      <label
                        key={g.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                          selectedGuardianId === g.id
                            ? 'bg-purple-50/90 border-purple-300 text-purple-900 shadow-xs'
                            : 'bg-white border-slate-100 hover:border-purple-200 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="guardianRadio"
                            checked={selectedGuardianId === g.id}
                            onChange={() => setSelectedGuardianId(g.id)}
                            className="text-purple-600 focus:ring-purple-500"
                          />
                          <div>
                            <p className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                              {g.full_name || 'Acudiente registrado'}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              Doc: {g.document_number || 'N/A'} • {g.phone || g.email || 'Sin contacto'}
                            </p>
                          </div>
                        </div>
                        {selectedGuardianId === g.id && (
                          <CheckCircle2 className="w-4 h-4 text-purple-600" />
                        )}
                      </label>
                    ))
                  )}
                </div>
              </div>
            ) : (
              /* Formulario para crear nuevo acudiente */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-2xl bg-purple-50/40 border border-purple-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nombre Completo del Acudiente *
                  </label>
                  <input
                    type="text"
                    required={guardianMode === 'new'}
                    placeholder="Ej. Patricia Rodríguez"
                    value={newGuardian.fullName}
                    onChange={(e) => setNewGuardian({ ...newGuardian, fullName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-800 focus:border-purple-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Documento de Identidad (Cédula) *
                  </label>
                  <input
                    type="text"
                    required={guardianMode === 'new'}
                    placeholder="Ej. 1002002001"
                    value={newGuardian.documentNumber}
                    onChange={(e) => setNewGuardian({ ...newGuardian, documentNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-800 focus:border-purple-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Teléfono / Celular de Contacto
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      placeholder="+57 310 000 0000"
                      value={newGuardian.phone}
                      onChange={(e) => setNewGuardian({ ...newGuardian, phone: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-800 focus:border-purple-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Correo Electrónico (Opcional)
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      placeholder="acudiente@ejemplo.com"
                      value={newGuardian.email}
                      onChange={(e) => setNewGuardian({ ...newGuardian, email: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs sm:text-sm text-slate-800 focus:border-purple-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-100/70 border border-purple-200 text-purple-900 text-xs font-semibold">
                  <span>ℹ️</span>
                  <span>La cédula del acudiente será su contraseña temporal para el primer ingreso al sistema.</span>
                </div>
              </div>
            )}
          </div>

          {/* PASO 3: PLAN DE ASIGNATURAS Y CURSO */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 pb-1 border-b border-slate-100">
              <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 font-black text-xs flex items-center justify-center">3</span>
              <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-purple-900">
                Plan Académico ({currentCourse?.name || 'Curso seleccionado'})
              </h4>
            </div>

            <div className="rounded-2xl border border-purple-100/90 bg-purple-50/30 p-3.5 sm:p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-purple-600" />
                  Materias vinculadas a este grado ({courseSubjects.length}):
                </span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                  Salón: {currentCourse?.salon || 'Aula 102'}
                </span>
              </div>

              {courseSubjects.length === 0 ? (
                <p className="text-xs text-slate-500 italic">
                  Este curso aún no tiene materias asociadas con docentes en la sección de asignaciones. El estudiante podrá vincularse y las materias se reflejarán cuando se le asignen docentes.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {courseSubjects.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-purple-100/70 shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full bg-purple-600"></div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 leading-tight">
                            {sub.subjectName}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            Docente: {sub.teacherName}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
                        Activa
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Botones de acción */}
          <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-2.5 rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs sm:text-sm font-bold transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-purple-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                  <span>Inscribiendo estudiante...</span>
                </>
              ) : (
                <>
                  <span>Completar Inscripción</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
