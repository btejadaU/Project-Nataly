import React, { useState, useMemo, useEffect } from 'react';
import { Edit3, Save, Trash2, Check, Plus, BookOpen, AlertTriangle, Calendar, X, User, GraduationCap, Lock, Mail, Phone, CreditCard } from 'lucide-react';
import Swal from 'sweetalert2';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';
import { escapeHtml } from '../../utils/formatters';
import { generateStudentCode } from '../../utils/studentCode';
import WeeklyScheduleEditor from './WeeklyScheduleEditor';

const emptyCourse = { name: '', gradoId: '', section: '', salonId: '', directorId: '' };
const emptySalon = { name: '', building: '' };
const emptyGrado = { name: '', numericLevel: '' };
const emptySubject = { name: '', icon: 'BookOpen', color: 'purple' };
const emptyStudent = { name: '', documentNumber: '', studentCode: '', gradeId: '', guardianId: '', status: 'active' };
const emptyUserFields = {
  fullName: '',
  email: '',
  documentNumber: '',
  phone: '',
  selectedSubjectIds: []
};

export default function AdminManagement({ activeSection, onTabChange }) {
  const {
    salones,
    grados,
    grades,
    subjects,
    teachers,
    guardians,
    students,
    gradingSettings,
    saveSalon,
    removeSalon,
    saveGrado,
    removeGrado,
    saveCourse,
    removeCourse,
    saveSubject,
    removeSubject,
    saveTeacherSubjects,
    saveStudent,
    removeStudent,
    saveProfile,
    removeProfile,
    saveGradingSettings,
    loadData
  } = useApp();

  const [course, setCourse] = useState(emptyCourse);
  const [salon, setSalon] = useState(emptySalon);
  const [grado, setGrado] = useState(emptyGrado);
  const [subject, setSubject] = useState(emptySubject);
  const [student, setStudent] = useState(emptyStudent);
  const [editing, setEditing] = useState(null);

  // Estados separados para creación superior vs edición en modal (Docentes y Acudientes)
  const [createFormData, setCreateFormData] = useState(emptyUserFields);
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState(emptyUserFields);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Estados para edición de estudiantes en modal
  const [editingStudent, setEditingStudent] = useState(null);
  const [editStudentData, setEditStudentData] = useState(emptyStudent);
  const [isEditStudentModalOpen, setIsEditStudentModalOpen] = useState(false);
  const [isSubmittingStudentEdit, setIsSubmittingStudentEdit] = useState(false);

  const [message, setMessage] = useState('');
  const [prevGradingSettings, setPrevGradingSettings] = useState(gradingSettings);
  const [grading, setGrading] = useState(gradingSettings);

  if (gradingSettings !== prevGradingSettings) {
    setPrevGradingSettings(gradingSettings);
    setGrading(gradingSettings);
  }

  const [editingSections, setEditingSections] = useState({
    structure: false,
    teachers: false,
    guardians: false,
    subjects: false,
    students: false
  });

  const isEditing = editingSections[activeSection];
  const isProfileSection = activeSection === 'teachers' || activeSection === 'guardians';
  const toggleEditing = () =>
    setEditingSections(current => ({ ...current, [activeSection]: !current[activeSection] }));

  // Validación de unicidad de materia en tiempo real
  const isSubjectDuplicate = useMemo(() => {
    if (!subject.name?.trim()) return false;
    const normalized = subject.name.trim().toLowerCase();
    const editingId = editing?.type === 'subject' ? editing.id : null;
    return subjects.some(s => s.name.trim().toLowerCase() === normalized && s.id !== editingId);
  }, [subject.name, subjects, editing]);

  function formatErrorMessage(error) {
    if (!error) return 'Ocurrió un error inesperado.';
    const msg = typeof error === 'string' ? error : error.message || '';

    if (msg.includes('duplicate key') || msg.includes('unique constraint') || msg.includes('23505')) {
      if (msg.includes('document_number')) {
        return 'Usuario ya registrado (este número de documento ya existe en el sistema).';
      }
      if (msg.includes('student_code')) {
        return 'Código de estudiante ya registrado.';
      }
      if (msg.includes('email')) {
        return 'Este correo electrónico ya se encuentra registrado.';
      }
      if (msg.includes('section')) {
        return 'Ya existe este curso con la misma sección.';
      }
      if (msg.includes('salones')) {
        return 'Ya existe un salón con este nombre.';
      }
      if (msg.includes('asignaturas')) {
        return 'Ya existe una materia con este nombre.';
      }
      return 'Registro duplicado.';
    }

    if (msg.includes('violates foreign key constraint') || msg.includes('23503')) {
      return 'No se puede eliminar porque tiene datos vinculados (estudiantes, notas u horarios).';
    }

    return msg;
  }

  const run = async action => {
    setMessage('');
    try {
      await action();
      setMessage('Guardado correctamente.');
      return true;
    } catch (error) {
      setMessage(formatErrorMessage(error));
      return false;
    }
  };

  const handleSubjectSubmit = async event => {
    event.preventDefault();
    if (isSubjectDuplicate) {
      setMessage(`Ya existe una materia registrada con el nombre "${subject.name.trim()}".`);
      return;
    }
    const ok = await run(() =>
      saveSubject(
        { name: subject.name.trim() },
        editing?.type === 'subject' ? editing.id : null
      )
    );
    if (ok) {
      setSubject(emptySubject);
      setEditing(null);
    }
  };

  // Manejo de teclado (Escape) y scroll lock para los modales de edición
  useEffect(() => {
    const isAnyModalOpen = isEditModalOpen || isEditStudentModalOpen;
    if (!isAnyModalOpen) return undefined;
    const handleKeyDown = e => {
      if (e.key === 'Escape') {
        if (isEditModalOpen && !isSubmittingEdit) handleCloseEditModal();
        if (isEditStudentModalOpen && !isSubmittingStudentEdit) handleCloseEditStudentModal();
      }
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditModalOpen, isSubmittingEdit, isEditStudentModalOpen, isSubmittingStudentEdit]);

  // Apertura del modal de edición sin tocar el formulario superior de creación
  const handleOpenEditUserModal = (item, role) => {
    const userRole = role || item.role || 'guardian';
    setEditingUser({
      id: item.id,
      role: userRole,
      originalName: item.name || item.full_name || ''
    });
    setEditFormData({
      fullName: item.name || item.full_name || '',
      email: item.email || '',
      documentNumber: item.documentNumber || item.document_number || '',
      phone: item.phone || '',
      selectedSubjectIds: item.subjectIds || []
    });
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    if (isSubmittingEdit) return;
    setIsEditModalOpen(false);
    setEditingUser(null);
    setEditFormData(emptyUserFields);
  };

  // Guardar cambios desde el modal emergente
  const handleSaveEditUser = async event => {
    event.preventDefault();
    if (!editingUser) return;

    if (!editFormData.fullName?.trim()) {
      Swal.fire({
        title: 'Campo requerido',
        text: 'El nombre completo es obligatorio.',
        icon: 'warning',
        confirmButtonColor: '#9333ea'
      });
      return;
    }

    setIsSubmittingEdit(true);
    try {
      await saveProfile(
        {
          fullName: editFormData.fullName.trim(),
          email: editFormData.email?.trim() || null,
          documentNumber: editFormData.documentNumber?.trim() || null,
          phone: editFormData.phone?.trim() || null
        },
        editingUser.id,
        editingUser.role
      );

      if (editingUser.role === 'teacher') {
        await saveTeacherSubjects(editingUser.id, editFormData.selectedSubjectIds || []);
      }

      await loadData();

      const isGuardian = editingUser.role === 'guardian';
      const updatedName = editFormData.fullName.trim();

      handleCloseEditModal();

      Swal.fire({
        title: isGuardian ? '¡Acudiente actualizado!' : '¡Docente actualizado!',
        text: `Los cambios para "${updatedName}" se guardaron exitosamente.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error al actualizar usuario:', error);
      Swal.fire({
        title: 'Error al actualizar',
        text: formatErrorMessage(error),
        icon: 'error',
        confirmButtonColor: '#9333ea'
      });
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteProfile = async (item, role) => {
    const isGuardian = role === 'guardian';
    const roleLabel = isGuardian ? 'al acudiente' : 'al docente';
    const itemName = item.name || item.full_name || 'este usuario';
    const safeItemName = escapeHtml(itemName);

    if (isGuardian) {
      const linkedStudents = students.filter(s => s.guardianId === item.id);
      if (linkedStudents.length > 0) {
        Swal.fire({
          title: 'No se puede eliminar',
          html: `<div class="text-left text-sm space-y-2">
            <p>El acudiente <b>${safeItemName}</b> tiene estudiantes a su cargo: <b>${escapeHtml(linkedStudents.map(s => s.name).join(', '))}</b>.</p>
            <p class="text-xs text-rose-500 font-medium">Reasigna el acudiente a estos estudiantes antes de eliminarlo.</p>
          </div>`,
          icon: 'warning',
          confirmButtonText: 'Entendido'
        });
        return;
      }
    } else {
      const directedCourses = grades.filter(g => g.directorId === item.id || g.director_id === item.id);
      if (directedCourses.length > 0) {
        Swal.fire({
          title: 'No se puede eliminar',
          html: `<div class="text-left text-sm space-y-2">
            <p>El docente <b>${safeItemName}</b> es director de curso de: <b>${escapeHtml(directedCourses.map(d => d.name).join(', '))}</b>.</p>
            <p class="text-xs text-rose-500 font-medium">Asigna otro director al curso antes de eliminar al docente.</p>
          </div>`,
          icon: 'warning',
          confirmButtonText: 'Entendido'
        });
        return;
      }
    }

    const result = await Swal.fire({
      title: `¿Eliminar ${roleLabel}?`,
      html: `¿Estás seguro de que deseas eliminar permanentemente a <b>${safeItemName}</b>?<br/><span class="text-xs text-rose-500 font-medium">Esta acción no se puede deshacer.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#94a3b8'
    });

    if (result.isConfirmed) {
      const ok = await run(async () => {
        await removeProfile(item.id, role);
      });
      if (ok) {
        Swal.fire({
          title: `${isGuardian ? 'Acudiente' : 'Docente'} eliminado`,
          text: `El perfil de ${itemName} fue eliminado correctamente.`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      }
    }
  };

  // Creación exclusiva de nuevos usuarios desde el panel superior
  const handleCreateUser = async event => {
    event.preventDefault();
    const requestedRole = activeSection === 'guardians' ? 'guardian' : 'teacher';

    if (!createFormData.documentNumber.trim()) {
      setMessage('El número de documento (cédula) es obligatorio para asignar la contraseña inicial.');
      return;
    }

    if (createFormData.documentNumber.trim().length < 6) {
      setMessage('El número de documento debe tener al menos 6 dígitos para la contraseña.');
      return;
    }

    const generatedEmail = createFormData.email.trim()
      ? createFormData.email.trim().toLowerCase()
      : `${requestedRole}.${createFormData.documentNumber.trim()}@colegioejemplo.edu.co`;

    const ok = await run(async () => {
      const { error: rpcError } = await supabase.rpc('crear_usuario_por_admin', {
        p_full_name: createFormData.fullName.trim(),
        p_email: generatedEmail,
        p_document_number: createFormData.documentNumber.trim(),
        p_phone: createFormData.phone.trim() || null,
        p_role: requestedRole
      });

      if (rpcError) {
        if (
          rpcError.message?.includes('duplicate key') ||
          rpcError.message?.includes('unique constraint') ||
          rpcError.code === '23505'
        ) {
          throw rpcError;
        }
        if (rpcError.code === 'PGRST202' || rpcError.message?.includes('schema cache')) {
          throw new Error(
            'La función de base de datos "crear_usuario_por_admin" aún no está instalada en tu proyecto de Supabase.'
          );
        }
        throw rpcError;
      }

      await loadData();

      // Si fue profesor y se marcaron materias asignadas
      if (requestedRole === 'teacher' && createFormData.selectedSubjectIds?.length > 0) {
        const createdTeacher = teachers.find(
          t => t.documentNumber === createFormData.documentNumber.trim() || t.email === generatedEmail
        );
        if (createdTeacher) {
          await saveTeacherSubjects(createdTeacher.id, createFormData.selectedSubjectIds);
        }
      }
    });

    if (ok) {
      const createdName = createFormData.fullName.trim();
      setCreateFormData(emptyUserFields);
      Swal.fire({
        title: requestedRole === 'guardian' ? '¡Acudiente creado!' : '¡Docente creado!',
        text: `"${createdName}" ha sido registrado correctamente en el sistema.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    }
  };

  // Apertura del modal de edición de estudiante (código escolar ineditable)
  const handleOpenEditStudentModal = item => {
    setEditingStudent({
      id: item.id,
      name: item.name
    });
    setEditStudentData({
      name: item.name || '',
      documentNumber: item.documentNumber || '',
      studentCode: item.studentCode || '',
      gradeId: item.gradeId || '',
      guardianId: item.guardianId || guardians.find(g => g.full_name === item.guardianName)?.id || '',
      status: item.status === 'Inactivo' || item.status === 'inactive' ? 'inactive' : 'active'
    });
    setIsEditStudentModalOpen(true);
  };

  const handleCloseEditStudentModal = () => {
    if (isSubmittingStudentEdit) return;
    setIsEditStudentModalOpen(false);
    setEditingStudent(null);
    setEditStudentData(emptyStudent);
  };

  // Guardar cambios del estudiante desde el modal emergente
  const handleSaveEditStudent = async event => {
    event.preventDefault();
    if (!editingStudent) return;

    if (!editStudentData.name?.trim()) {
      Swal.fire({
        title: 'Campo requerido',
        text: 'El nombre completo del estudiante es obligatorio.',
        icon: 'warning',
        confirmButtonColor: '#9333ea'
      });
      return;
    }

    if (!editStudentData.gradeId) {
      Swal.fire({
        title: 'Curso requerido',
        text: 'Debes asignar un curso al estudiante.',
        icon: 'warning',
        confirmButtonColor: '#9333ea'
      });
      return;
    }

    if (!editStudentData.guardianId) {
      Swal.fire({
        title: 'Acudiente requerido',
        text: 'Debes asignar un acudiente al estudiante.',
        icon: 'warning',
        confirmButtonColor: '#9333ea'
      });
      return;
    }

    setIsSubmittingStudentEdit(true);
    try {
      await saveStudent(
        {
          name: editStudentData.name.trim(),
          studentCode: editStudentData.studentCode, // Código institucional original ineditable
          documentNumber: editStudentData.documentNumber?.trim() || null,
          gradeId: editStudentData.gradeId,
          guardianId: editStudentData.guardianId,
          status: editStudentData.status || 'active'
        },
        editingStudent.id
      );

      const updatedName = editStudentData.name.trim();
      handleCloseEditStudentModal();

      Swal.fire({
        title: '¡Estudiante actualizado!',
        text: `Los cambios para "${updatedName}" se guardaron exitosamente.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error('Error al actualizar estudiante:', error);
      Swal.fire({
        title: 'Error al actualizar',
        text: formatErrorMessage(error),
        icon: 'error',
        confirmButtonColor: '#9333ea'
      });
    } finally {
      setIsSubmittingStudentEdit(false);
    }
  };

  const handleDeleteStudent = async item => {
    const studentName = item.name || 'este estudiante';
    const result = await Swal.fire({
      title: '¿Eliminar estudiante?',
      html: `¿Estás seguro de que deseas eliminar a <b>${escapeHtml(studentName)}</b>?<br/><span class="text-xs text-rose-500 font-medium">Esta acción eliminará al alumno y sus notas vinculadas.</span>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#94a3b8'
    });

    if (result.isConfirmed) {
      const ok = await run(async () => {
        await removeStudent(item.id);
      });
      if (ok) {
        Swal.fire({
          title: 'Estudiante eliminado',
          text: `"${studentName}" fue eliminado correctamente.`,
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      }
    }
  };

  return (
    <div className="space-y-5">
      {message && (
        <div
          className={`flex items-center justify-between rounded-2xl px-4 py-3 text-xs font-semibold ${
            message.includes('correctamente')
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{message}</span>
          <button
            type="button"
            onClick={() => setMessage('')}
            className="text-slate-400 hover:text-slate-600 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 w-full min-w-0 max-w-full">
        {/* ============================================================ */}
        {/* GRADOS */}
        {/* ============================================================ */}
        {activeSection === 'grades' && (
          <section className="rounded-3xl border border-purple-100 bg-white p-4 sm:p-5 shadow-xs w-full min-w-0 max-w-full">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-slate-900">Grados</h3>
                <p className="text-xs text-slate-500">Niveles académicos como Séptimo, Octavo y Noveno.</p>
              </div>
              <button
                type="button"
                onClick={toggleEditing}
                className={`rounded-xl p-2 shrink-0 ${
                  isEditing ? 'bg-purple-100 text-purple-700' : 'text-slate-500 hover:bg-slate-100'
                }`}
                aria-label="Editar grados"
              >
                <Edit3 className="h-4 w-4" />
              </button>
            </div>
            {isEditing && (
              <form
                onSubmit={event => {
                  event.preventDefault();
                  run(() => saveGrado(grado, editing?.type === 'grado' ? editing.id : null));
                }}
                className="mb-4 grid grid-cols-1 sm:grid-cols-[1fr_150px_auto] gap-2"
              >
                <input
                  required
                  placeholder="Nombre del grado"
                  value={grado.name}
                  onChange={event => setGrado({ ...grado, name: event.target.value })}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  required
                  type="number"
                  min="1"
                  max="12"
                  placeholder="Nivel"
                  value={grado.numericLevel}
                  onChange={event => setGrado({ ...grado, numericLevel: event.target.value })}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <button className="rounded-xl bg-purple-600 px-3 py-2 text-xs font-bold text-white">
                  Guardar grado
                </button>
              </form>
            )}
            <div className="space-y-2">
              {grados.map(item => (
                <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="text-sm font-semibold text-slate-800">
                    {item.name} <small className="font-normal text-slate-500">Nivel {item.numeric_level}</small>
                  </span>
                  {isEditing && (
                    <span className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setGrado({ name: item.name, numericLevel: item.numeric_level });
                          setEditing({ type: 'grado', id: item.id });
                        }}
                        className="rounded-lg p-1.5 text-purple-700"
                        aria-label="Editar grado"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => run(() => removeGrado(item.id))}
                        className="rounded-lg p-1.5 text-rose-600"
                        aria-label="Eliminar grado"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ============================================================ */}
        {/* SALONES */}
        {/* ============================================================ */}
        {activeSection === 'salones' && (
          <section className="rounded-3xl border border-purple-100 bg-white p-4 sm:p-5 shadow-xs w-full min-w-0 max-w-full">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-slate-900">Salones</h3>
                <p className="text-xs text-slate-500">Espacios físicos, bloques y pisos.</p>
              </div>
              <button
                type="button"
                onClick={toggleEditing}
                className={`rounded-xl p-2 shrink-0 ${
                  isEditing ? 'bg-purple-100 text-purple-700' : 'text-slate-500 hover:bg-slate-100'
                }`}
                aria-label="Editar salones"
              >
                <Edit3 className="h-4 w-4" />
              </button>
            </div>
            {isEditing && (
              <form
                onSubmit={event => {
                  event.preventDefault();
                  run(() => saveSalon(salon, editing?.type === 'salon' ? editing.id : null));
                }}
                className="mb-4 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2"
              >
                <input
                  required
                  placeholder="Nombre del salón"
                  value={salon.name}
                  onChange={event => setSalon({ ...salon, name: event.target.value })}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <input
                  placeholder="Bloque / piso"
                  value={salon.building}
                  onChange={event => setSalon({ ...salon, building: event.target.value })}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
                <button className="rounded-xl bg-purple-600 px-3 py-2 text-xs font-bold text-white">
                  Guardar salón
                </button>
              </form>
            )}
            <div className="space-y-2">
              {salones.map(item => (
                <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="text-sm font-semibold text-slate-800">
                    {item.name} <small className="font-normal text-slate-500">· {item.building}</small>
                  </span>
                  {isEditing && (
                    <span className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setSalon({ name: item.name, building: item.building || '' });
                          setEditing({ type: 'salon', id: item.id });
                        }}
                        className="rounded-lg p-1.5 text-purple-700"
                        aria-label="Editar salón"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => run(() => removeSalon(item.id))}
                        className="rounded-lg p-1.5 text-rose-600"
                        aria-label="Eliminar salón"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ============================================================ */}
        {/* CURSOS */}
        {/* ============================================================ */}
        {activeSection === 'courses' && (
          <section className="rounded-3xl border border-purple-100 bg-white p-4 sm:p-5 shadow-xs w-full min-w-0 max-w-full">
            <div className="mb-4 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-slate-900">Cursos</h3>
                <p className="text-xs text-slate-500">Grado, sección, salón y director.</p>
              </div>
              <button
                type="button"
                onClick={toggleEditing}
                className={`rounded-xl p-2 shrink-0 ${
                  isEditing ? 'bg-purple-100 text-purple-700' : 'text-slate-500 hover:bg-slate-100'
                }`}
                aria-label="Editar cursos"
              >
                <Edit3 className="h-4 w-4" />
              </button>
            </div>
            {isEditing && (
              <form
                onSubmit={event => {
                  event.preventDefault();
                  run(() => saveCourse(course, editing?.type === 'course' ? editing.id : null));
                }}
                className="space-y-2"
              >
                <div className="grid grid-cols-2 gap-2">
                  <select
                    required
                    value={course.gradoId}
                    onChange={event => setCourse({ ...course, gradoId: event.target.value })}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">Grado</option>
                    {grados.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  <input
                    required
                    placeholder="Sección (A, B...)"
                    value={course.section}
                    onChange={event => setCourse({ ...course, section: event.target.value })}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <select
                  required
                  value={course.salonId}
                  onChange={event => setCourse({ ...course, salonId: event.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar salón físico</option>
                  {salones.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.name} · {item.building}
                    </option>
                  ))}
                </select>
                <button className="flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white">
                  <Save className="h-4 w-4" />
                  Guardar curso
                </button>
              </form>
            )}
            <div className="mt-4 space-y-2">
              {grades.map(item => (
                <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="text-sm font-semibold text-slate-800">
                    {item.name} <small className="font-normal text-slate-500">· {item.salon}</small>
                  </span>
                  {isEditing && (
                    <span className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCourse({
                            gradoId: item.gradoId || '',
                            section: item.section || '',
                            salonId: item.salonId || '',
                            directorId: item.directorId || ''
                          });
                          setEditing({ type: 'course', id: item.id });
                        }}
                        className="rounded-lg p-1.5 text-purple-700 hover:bg-purple-100"
                        aria-label="Editar curso"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => run(() => removeCourse(item.id))}
                        className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                        aria-label="Eliminar curso"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ============================================================ */}
        {/* MATERIAS Y ASIGNACIONES (REDISEÑADO) */}
        {/* ============================================================ */}
        {activeSection === 'subjects' && (
          <div className="space-y-6 w-full min-w-0 max-w-full">
            <section className="rounded-3xl border border-purple-100 bg-white p-4 sm:p-5 shadow-xs w-full min-w-0 max-w-full">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-black text-slate-900">Materias del Plan de Estudios</h3>
                  <p className="text-xs text-slate-500">
                    Define las asignaturas oficiales. Las materias se vinculan a profesores en la pestaña{' '}
                    <strong>Profesores</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={toggleEditing}
                  className={`rounded-xl p-2 shrink-0 ${
                    isEditing ? 'bg-purple-100 text-purple-700' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                  aria-label="Editar materias"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
              </div>

              {/* Formulario de materia: UN SOLO INPUT DE TEXTO y validación de unicidad */}
              {isEditing && (
                <form
                  onSubmit={handleSubjectSubmit}
                  className="space-y-3 p-4 rounded-2xl bg-purple-50/50 border border-purple-100 mb-4"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de la materia</label>
                    <input
                      required
                      placeholder="Ej: Matemáticas, Ciencias Naturales, Idioma Extranjero..."
                      value={subject.name}
                      onChange={event => setSubject({ ...subject, name: event.target.value })}
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500 ${
                        isSubjectDuplicate ? 'border-rose-300 ring-2 ring-rose-100' : 'border-slate-200'
                      }`}
                    />
                    {isSubjectDuplicate && (
                      <p className="mt-1.5 text-xs text-rose-600 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Ya existe una materia registrada con este nombre (insensible a mayúsculas/minúsculas).
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    {editing?.type === 'subject' && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(null);
                          setSubject(emptySubject);
                        }}
                        className="rounded-xl px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer"
                      >
                        Cancelar
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isSubjectDuplicate || !subject.name.trim()}
                      className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                    >
                      <Save className="h-4 w-4" />
                      {editing?.type === 'subject' ? 'Actualizar materia' : 'Guardar materia'}
                    </button>
                  </div>
                </form>
              )}

              {/* Lista de materias registradas */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full min-w-0">
                {subjects.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-3.5 py-2.5 border border-slate-100"
                  >
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-purple-600 shrink-0" />
                      <span className="text-sm font-bold text-slate-800">{item.name}</span>
                    </div>
                    {isEditing && (
                      <span className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSubject({ name: item.name, icon: item.icon, color: item.color });
                            setEditing({ type: 'subject', id: item.id });
                          }}
                          className="rounded-lg p-1.5 text-purple-700 hover:bg-purple-100"
                          aria-label="Editar materia"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => run(() => removeSubject(item.id))}
                          className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"
                          aria-label="Eliminar materia"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Tarjeta de navegación hacia Horarios */}
              <div className="mt-5 p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-purple-900">
                    Programación de Horarios Semanales
                  </h4>
                  <p className="text-xs text-purple-700 mt-0.5">
                    El formulario rígido de selects ha sido sustituido por la grilla interactiva semanal con
                    prevención de colisiones en tiempo real.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onTabChange?.('schedule')}
                  className="self-start sm:self-auto px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-xs cursor-pointer shrink-0"
                >
                  Abrir Horarios Semanales →
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ============================================================ */}
        {/* HORARIOS (VISTA INTERACTIVA SEMANAL) */}
        {/* ============================================================ */}
        {activeSection === 'schedule' && (
          <section className="w-full min-w-0 max-w-full overflow-hidden">
            <WeeklyScheduleEditor onNavigateToTeachers={() => onTabChange?.('teachers')} />
          </section>
        )}

        {/* ============================================================ */}
        {/* PROFESORES Y ACUDIENTES */}
        {/* ============================================================ */}
        {isProfileSection && (
          <section className="rounded-3xl border border-purple-100 bg-white p-4 sm:p-5 shadow-xs w-full min-w-0 max-w-full overflow-hidden">
            <div className="flex items-start sm:items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-slate-900 text-base sm:text-lg break-words">
                  {activeSection === 'teachers' ? 'Profesores y Materias Asignadas' : 'Acudientes'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 break-words">
                  {activeSection === 'teachers'
                    ? 'Gestiona la información del docente y selecciona mediante chips las materias que imparte.'
                    : 'Información de contacto y vinculación con estudiantes.'}
                </p>
              </div>
              <button
                type="button"
                onClick={toggleEditing}
                className={`rounded-xl p-2 transition-colors cursor-pointer shrink-0 ${
                  isEditing ? 'bg-purple-100 text-purple-700' : 'text-slate-500 hover:bg-slate-100'
                }`}
                aria-label={`Añadir ${activeSection === 'teachers' ? 'profesor' : 'acudiente'}`}
                title={`Añadir ${activeSection === 'teachers' ? 'profesor' : 'acudiente'}`}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {isEditing && (
              <form onSubmit={handleCreateUser} className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 w-full min-w-0">
                <input
                  required
                  placeholder="Nombre completo"
                  value={createFormData.fullName}
                  onChange={event => setCreateFormData(prev => ({ ...prev, fullName: event.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm w-full min-w-0 lg:col-span-2"
                />
                <input
                  placeholder="Correo (opcional)"
                  value={createFormData.email}
                  onChange={event => setCreateFormData(prev => ({ ...prev, email: event.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm w-full min-w-0"
                />
                <input
                  required
                  placeholder="CC / Cédula (obligatorio)"
                  value={createFormData.documentNumber}
                  onChange={event => setCreateFormData(prev => ({ ...prev, documentNumber: event.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm w-full min-w-0"
                />
                <input
                  placeholder="Teléfono"
                  value={createFormData.phone}
                  onChange={event => setCreateFormData(prev => ({ ...prev, phone: event.target.value }))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm w-full min-w-0"
                />

                {/* ASIGNACIÓN DE MATERIAS MEDIANTE CHIPS INTERACTIVOS (ROL PROFESOR) */}
                {activeSection === 'teachers' && (
                  <div className="sm:col-span-2 lg:col-span-5 p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100 space-y-2 w-full min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-purple-600 shrink-0" />
                        <span>Materias que imparte este profesor:</span>
                      </label>
                      <span className="text-[11px] font-bold text-purple-700">
                        {(createFormData.selectedSubjectIds || []).length} seleccionada(s)
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {subjects.length === 0 && (
                        <p className="text-xs text-slate-400 italic">No hay materias registradas en el sistema.</p>
                      )}
                      {subjects.map(s => {
                        const isSelected = (createFormData.selectedSubjectIds || []).includes(s.id);
                        return (
                          <button
                            type="button"
                            key={s.id}
                            onClick={() => {
                              const current = createFormData.selectedSubjectIds || [];
                              const next = isSelected ? current.filter(id => id !== s.id) : [...current, s.id];
                              setCreateFormData(prev => ({ ...prev, selectedSubjectIds: next }));
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 max-w-full ${
                              isSelected
                                ? 'bg-purple-600 text-white shadow-xs'
                                : 'bg-white text-slate-700 border border-slate-200 hover:border-purple-300'
                            }`}
                          >
                            {isSelected ? (
                              <Check className="w-3.5 h-3.5 shrink-0" />
                            ) : (
                              <Plus className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                            <span className="truncate">{s.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="sm:col-span-2 lg:col-span-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <p className="text-[11px] text-purple-700 font-semibold break-words">
                    ℹ️ La cédula será la contraseña inicial de acceso del usuario.
                  </p>
                  <button
                    type="submit"
                    className="rounded-xl bg-purple-600 hover:bg-purple-700 px-5 py-2 text-xs font-bold text-white shadow-xs cursor-pointer transition-colors w-full sm:w-auto shrink-0"
                  >
                    Añadir Usuario
                  </button>
                </div>
              </form>
            )}

            {/* Listado de docentes o acudientes */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full min-w-0">
              {(activeSection === 'teachers'
                ? teachers.map(item => ({ ...item, role: 'teacher' }))
                : guardians.map(item => ({ ...item, role: 'guardian' }))
              ).map(item => (
                <div
                  key={item.id}
                  className="rounded-2xl bg-slate-50 border border-slate-100 p-3.5 flex flex-col justify-between space-y-2 hover:border-purple-200 transition-colors w-full min-w-0 overflow-hidden"
                >
                  <div className="flex items-start justify-between gap-2 min-w-0 w-full">
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-bold text-slate-900 truncate">{item.name || item.full_name}</h4>
                      
                      {/* Información organizada verticalmente: Correo, Tel, CC */}
                      <div className="mt-2 space-y-1 text-xs">
                        {/* Correo */}
                        <div className="flex items-center gap-1.5 text-slate-600 min-w-0">
                          <Mail className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                          <span className="truncate" title={item.email}>{item.email || <span className="text-slate-400 italic">Sin correo</span>}</span>
                        </div>

                        {/* Tel */}
                        <div className="flex items-center gap-1.5 text-slate-600 min-w-0">
                          <Phone className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                          <span className="truncate">{item.phone ? `Tel: ${item.phone}` : <span className="text-slate-400 italic">Sin teléfono</span>}</span>
                        </div>

                        {/* CC (Reemplaza DNI) */}
                        <div className="flex items-center gap-1.5 text-slate-600 font-mono text-[11px] min-w-0">
                          <CreditCard className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                          <span className="truncate">CC: {item.documentNumber || item.document_number || <span className="text-slate-400 font-sans italic">Sin CC</span>}</span>
                        </div>
                      </div>
                    </div>

                    <span className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenEditUserModal(item, item.role)}
                        className="rounded-lg p-1.5 text-purple-700 hover:bg-purple-100 cursor-pointer transition-colors"
                        aria-label={`Editar ${item.role === 'guardian' ? 'acudiente' : 'docente'}`}
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProfile(item, item.role)}
                        className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-100 cursor-pointer transition-colors"
                        aria-label={`Eliminar ${item.role === 'guardian' ? 'acudiente' : 'docente'}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </span>
                  </div>

                  {/* Chips de materias asignadas en la tarjeta del docente */}
                  {item.role === 'teacher' && (
                    <div className="pt-2 border-t border-slate-200/60 min-w-0 w-full">
                      <div className="flex flex-wrap items-center gap-1">
                        {item.subjects && item.subjects.length > 0 ? (
                          item.subjects.map((subName, sIdx) => (
                            <span
                              key={sIdx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[11px] font-bold max-w-full min-w-0"
                            >
                              <BookOpen className="w-3 h-3 shrink-0" />
                              <span className="truncate">{subName}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 font-semibold">
                            Sin materias vinculadas
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Chips de estudiantes vinculados en la tarjeta del acudiente */}
                  {item.role === 'guardian' && (
                    <div className="pt-2 border-t border-slate-200/60 min-w-0 w-full">
                      <div className="flex flex-wrap items-center gap-1">
                        {(() => {
                          const linked = students.filter(s => s.guardianId === item.id);
                          if (linked.length === 0) {
                            return (
                              <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                                Sin estudiantes vinculados
                              </span>
                            );
                          }
                          return linked.map(s => (
                            <span
                              key={s.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 text-[11px] font-bold max-w-full min-w-0"
                            >
                              <GraduationCap className="w-3 h-3 shrink-0" />
                              <span className="truncate">{s.name}</span>
                            </span>
                          ));
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ============================================================ */}
        {/* MODAL DE EDICIÓN DE ACUDIENTE / DOCENTE */}
        {/* ============================================================ */}
        {isEditModalOpen && editingUser && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-user-modal-title"
            onClick={handleCloseEditModal}
          >
            <div
              className="relative w-full max-w-lg my-auto bg-white rounded-3xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
              onClick={e => e.stopPropagation()}
            >
              {/* Encabezado del modal */}
              <div className="px-6 py-5 border-b border-purple-100/80 bg-gradient-to-r from-purple-50/70 to-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-xs shadow-purple-600/30">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 id="edit-user-modal-title" className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                      {editingUser.role === 'guardian' ? 'Editar Acudiente' : 'Editar Profesor'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {editingUser.role === 'guardian'
                        ? 'Actualiza los datos personales y de contacto del acudiente.'
                        : 'Actualiza la información y materias impartidas del docente.'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseEditModal}
                  disabled={isSubmittingEdit}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  aria-label="Cerrar modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Formulario de edición */}
              <form onSubmit={handleSaveEditUser} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-6 space-y-4 overflow-y-auto">
                  {/* Nombre completo */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Nombre completo <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      value={editFormData.fullName}
                      onChange={e => setEditFormData(prev => ({ ...prev, fullName: e.target.value }))}
                      placeholder="Ej. Adriana Martínez"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
                    />
                  </div>

                  {/* Correo electrónico */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Correo electrónico <span className="text-slate-400 font-normal">(opcional)</span>
                    </label>
                    <input
                      type="email"
                      value={editFormData.email}
                      onChange={e => setEditFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="ejemplo@colegio.edu.co"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
                    />
                  </div>

                  {/* CC / Cédula */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      CC / Cédula <span className="text-slate-400 font-normal">(identificación)</span>
                    </label>
                    <input
                      type="text"
                      value={editFormData.documentNumber}
                      onChange={e => setEditFormData(prev => ({ ...prev, documentNumber: e.target.value }))}
                      placeholder="Número de cédula (CC)"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
                    />
                  </div>

                  {/* Teléfono */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={editFormData.phone}
                      onChange={e => setEditFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="Ej. +57 310 200 2003"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
                    />
                  </div>

                  {/* Asignación de materias si es profesor */}
                  {editingUser.role === 'teacher' && (
                    <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-100 space-y-2 mt-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-purple-600" />
                          Materias impartidas:
                        </label>
                        <span className="text-[11px] font-bold text-purple-700">
                          {(editFormData.selectedSubjectIds || []).length} seleccionada(s)
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5 pt-1 max-h-40 overflow-y-auto">
                        {subjects.length === 0 && (
                          <p className="text-xs text-slate-400 italic">No hay materias registradas en el sistema.</p>
                        )}
                        {subjects.map(s => {
                          const isSelected = (editFormData.selectedSubjectIds || []).includes(s.id);
                          return (
                            <button
                              type="button"
                              key={s.id}
                              onClick={() => {
                                const current = editFormData.selectedSubjectIds || [];
                                const next = isSelected ? current.filter(id => id !== s.id) : [...current, s.id];
                                setEditFormData(prev => ({ ...prev, selectedSubjectIds: next }));
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                isSelected
                                  ? 'bg-purple-600 text-white shadow-xs'
                                  : 'bg-white text-slate-700 border border-slate-200 hover:border-purple-300'
                              }`}
                            >
                              {isSelected ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <Plus className="w-3.5 h-3.5 text-slate-400" />
                              )}
                              {s.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Acciones en el footer del modal */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={handleCloseEditModal}
                    disabled={isSubmittingEdit}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingEdit}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-2"
                  >
                    {isSubmittingEdit ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ESTUDIANTES */}
        {/* ============================================================ */}
        {activeSection === 'students' && (
          <section className="rounded-3xl border border-purple-100 bg-white p-4 sm:p-5 shadow-xs w-full min-w-0 max-w-full overflow-hidden">
            <div className="flex items-center justify-between mb-4 gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-black text-slate-900 text-base sm:text-lg break-words">Estudiantes y acudientes</h3>
                <p className="text-xs text-slate-500 break-words">Listado de alumnos matriculados y vinculación con acudientes.</p>
              </div>
            </div>

            {/* Listado de estudiantes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full min-w-0">
              {students.map(item => (
                <div
                  key={item.id}
                  className="rounded-2xl bg-slate-50 border border-slate-100 p-3.5 flex items-center justify-between gap-2 hover:border-purple-200 transition-colors w-full min-w-0"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-slate-900 truncate">{item.name}</h4>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-slate-500 min-w-0">
                      {item.studentCode && (
                        <span className="font-mono text-slate-700 bg-slate-200/70 px-1.5 py-0.5 rounded text-[11px] font-semibold shrink-0">
                          {item.studentCode}
                        </span>
                      )}
                      {item.gradeName && <span className="truncate">· {item.gradeName}</span>}
                      {item.guardianName && item.guardianName !== 'Sin acudiente' && (
                        <span className="text-slate-400 truncate max-w-[150px]">· Acudiente: {item.guardianName}</span>
                      )}
                    </div>
                  </div>
                  <span className="flex gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenEditStudentModal(item)}
                      className="rounded-lg p-1.5 text-purple-700 hover:bg-purple-100 cursor-pointer transition-colors"
                      aria-label={`Editar ${item.name}`}
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteStudent(item)}
                      className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-100 cursor-pointer transition-colors"
                      aria-label={`Eliminar ${item.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ============================================================ */}
        {/* MODAL DE EDICIÓN DE ESTUDIANTE */}
        {/* ============================================================ */}
        {isEditStudentModalOpen && editingStudent && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-student-modal-title"
            onClick={handleCloseEditStudentModal}
          >
            <div
              className="relative w-full max-w-lg my-auto bg-white rounded-3xl shadow-2xl border border-purple-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
              onClick={e => e.stopPropagation()}
            >
              {/* Encabezado del modal */}
              <div className="px-6 py-5 border-b border-purple-100/80 bg-linear-to-r from-purple-50/70 to-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-xs shadow-purple-600/30">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 id="edit-student-modal-title" className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                      Editar Estudiante
                    </h3>
                    <p className="text-xs text-slate-500">
                      Actualiza los datos del alumno, curso asignado y acudiente vinculado.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseEditStudentModal}
                  disabled={isSubmittingStudentEdit}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  aria-label="Cerrar modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Formulario de edición */}
              <form onSubmit={handleSaveEditStudent} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-6 space-y-4 overflow-y-auto">
                  {/* Nombre completo */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Nombre completo <span className="text-rose-500">*</span>
                    </label>
                    <input
                      required
                      type="text"
                      value={editStudentData.name}
                      onChange={e => setEditStudentData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nombre del alumno"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
                    />
                  </div>

                  {/* Código escolar (INEDIBLE) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        Código escolar
                      </label>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        🔒 Ineditable
                      </span>
                    </div>
                    <input
                      readOnly
                      disabled
                      type="text"
                      value={editStudentData.studentCode}
                      className="w-full rounded-xl border border-slate-200 bg-slate-100/80 px-3.5 py-2.5 text-sm text-slate-600 font-mono cursor-not-allowed select-none focus:outline-none"
                    />
                    <p className="text-[11px] text-slate-400 mt-1">
                      El código institucional de estudiante es permanente y no se puede modificar.
                    </p>
                  </div>

                  {/* Documento de Identidad / CC */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      CC / Tarjeta de Identidad / Documento <span className="text-slate-400 font-normal">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={editStudentData.documentNumber}
                      onChange={e => setEditStudentData(prev => ({ ...prev, documentNumber: e.target.value }))}
                      placeholder="Número de documento de identidad"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
                    />
                  </div>

                  {/* Curso / Salón */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Curso asignado <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={editStudentData.gradeId}
                      onChange={e => setEditStudentData(prev => ({ ...prev, gradeId: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
                    >
                      <option value="">Selecciona un curso</option>
                      {grades.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Acudiente vinculado */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Acudiente vinculado <span className="text-rose-500">*</span>
                    </label>
                    <select
                      required
                      value={editStudentData.guardianId}
                      onChange={e => setEditStudentData(prev => ({ ...prev, guardianId: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
                    >
                      <option value="">Selecciona un acudiente</option>
                      {guardians.map(item => (
                        <option key={item.id} value={item.id}>
                          {item.full_name} {item.phone ? `(${item.phone})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Estado del estudiante */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Estado del estudiante
                    </label>
                    <select
                      value={editStudentData.status}
                      onChange={e => setEditStudentData(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 transition-all"
                    >
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                    </select>
                  </div>
                </div>

                {/* Footer del Modal */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={handleCloseEditStudentModal}
                    disabled={isSubmittingStudentEdit}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingStudentEdit}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-2"
                  >
                    {isSubmittingStudentEdit ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
