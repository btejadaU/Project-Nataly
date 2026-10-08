import React, { useState } from 'react';
import { Edit3, Save, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';
import { escapeHtml } from '../../utils/formatters';

const emptyCourse = { name: '', gradoId: '', section: '', salonId: '', directorId: '' };
const emptySalon = { name: '', building: '' };
const emptyGrado = { name: '', numericLevel: '' };
const emptySubject = { name: '', shortName: '', icon: 'BookOpen', color: 'purple' };
const emptyStudent = { name: '', documentNumber: '', studentCode: '', gradeId: '', guardianId: '', status: 'active' };

export default function AdminManagement({ activeSection }) {
  const { salones, grados, grades, subjects, teachers, guardians, students, gradingSettings, saveSalon, removeSalon, saveGrado, removeGrado, saveCourse, removeCourse, saveSubject, removeSubject, saveStudent, removeStudent, saveProfile, removeProfile, saveGradingSettings, assignTeacherToCourse, loadData } = useApp();
  const [course, setCourse] = useState(emptyCourse);
  const [salon, setSalon] = useState(emptySalon);
  const [grado, setGrado] = useState(emptyGrado);
  const [subject, setSubject] = useState(emptySubject);
  const [student, setStudent] = useState(emptyStudent);
  const [editing, setEditing] = useState(null);
  const [userForm, setUserForm] = useState({ fullName: '', email: '', documentNumber: '', phone: '', role: 'teacher' });
  const [assignment, setAssignment] = useState({ teacherId: '', subjectId: '', courseId: '', dayOfWeek: 1, startTime: '07:00', endTime: '08:30' });
  const [message, setMessage] = useState('');
  const [prevGradingSettings, setPrevGradingSettings] = useState(gradingSettings);
  const [grading, setGrading] = useState(gradingSettings);
  if (gradingSettings !== prevGradingSettings) {
    setPrevGradingSettings(gradingSettings);
    setGrading(gradingSettings);
  }
  const [editingSections, setEditingSections] = useState({ structure: false, teachers: false, guardians: false, subjects: false, students: false });
  const isEditing = editingSections[activeSection];
  const isProfileSection = activeSection === 'teachers' || activeSection === 'guardians';
  const toggleEditing = () => setEditingSections(current => ({ ...current, [activeSection]: !current[activeSection] }));

  function formatErrorMessage(error) {
    if (!error) return 'Ocurrió un error inesperado.';
    const msg = typeof error === 'string' ? error : error.message || '';

    // Llaves duplicadas (violaciones de restricción UNIQUE en Postgres / Supabase)
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
      return 'Usuario ya registrado.';
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

  const editProfile = (profile, role) => {
    setEditing({ type: 'profile', id: profile.id, role });
    setUserForm({
      fullName: profile.full_name || profile.name || '',
      email: profile.email || '',
      documentNumber: profile.document_number || '',
      phone: profile.phone || '',
      role
    });
    setEditingSections(current => ({ ...current, [role === 'teacher' ? 'teachers' : 'guardians']: true }));
  };

  const cancelProfileEdit = () => {
    setEditing(null);
    setUserForm({ fullName: '', email: '', documentNumber: '', phone: '', role: 'teacher' });
  };

  const handleDeleteProfile = async (item, role) => {
    const isGuardian = role === 'guardian';
    const roleLabel = isGuardian ? 'acudiente' : 'profesor';
    const itemName = item.full_name || item.name || 'Usuario';
    const safeItemName = escapeHtml(itemName);

    if (isGuardian) {
      const linkedStudents = students.filter(s => s.guardianId === item.id || s.guardian_id === item.id);
      if (linkedStudents.length > 0) {
        Swal.fire({
          title: 'No se puede eliminar',
          html: `<div class="text-left text-sm space-y-2">
            <p>El acudiente <b>${safeItemName}</b> no se puede eliminar porque tiene <b>${linkedStudents.length} estudiante(s)</b> a su cargo:</p>
            <div class="space-y-1 my-2 max-h-36 overflow-y-auto">
              ${linkedStudents.map(s => `<div class="px-3 py-1.5 rounded-xl bg-purple-50 border border-purple-100 text-purple-900 font-semibold text-xs flex justify-between"><span>${escapeHtml(s.name)}</span><span class="text-purple-600 font-normal">${escapeHtml(s.gradeName || 'Sin curso')}</span></div>`).join('')}
            </div>
            <p class="text-xs text-rose-500 font-medium">Debes reasignar o retirar los estudiantes vinculados antes de eliminar este perfil.</p>
          </div>`,
          icon: 'warning',
          confirmButtonText: 'Entendido',
          customClass: {
            popup: 'dark-swal',
            title: 'dark-swal-title',
            htmlContainer: 'dark-swal-content',
            confirmButton: 'primary-btn dark-swal-confirm'
          },
          buttonsStyling: false
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
          confirmButtonText: 'Entendido',
          customClass: {
            popup: 'dark-swal',
            title: 'dark-swal-title',
            htmlContainer: 'dark-swal-content',
            confirmButton: 'primary-btn dark-swal-confirm'
          },
          buttonsStyling: false
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
      customClass: {
        popup: 'dark-swal',
        title: 'dark-swal-title',
        htmlContainer: 'dark-swal-content',
        confirmButton: 'danger-btn dark-swal-confirm',
        cancelButton: 'secondary-btn dark-swal-cancel'
      },
      buttonsStyling: false
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
          showConfirmButton: false,
          customClass: {
            popup: 'dark-swal',
            title: 'dark-swal-title',
            htmlContainer: 'dark-swal-content'
          },
          buttonsStyling: false
        });
      }
    }
  };

  const submitUser = async event => {
    event.preventDefault();
    const requestedRole = activeSection === 'guardians' ? 'guardian' : 'teacher';
    if (editing?.type === 'profile') {
      await run(async () => saveProfile(userForm, editing.id, editing.role));
      cancelProfileEdit();
      return;
    }

    if (!userForm.documentNumber.trim()) {
      setMessage('El número de documento (cédula) es obligatorio para asignar la contraseña inicial.');
      return;
    }

    if (userForm.documentNumber.trim().length < 6) {
      setMessage('El número de documento debe tener al menos 6 dígitos para la contraseña.');
      return;
    }

    const generatedEmail = userForm.email.trim()
      ? userForm.email.trim().toLowerCase()
      : `${requestedRole}.${userForm.documentNumber.trim()}@colegioejemplo.edu.co`;

    await run(async () => {
      const { error: rpcError } = await supabase.rpc('crear_usuario_por_admin', {
        p_full_name: userForm.fullName.trim(),
        p_email: generatedEmail,
        p_document_number: userForm.documentNumber.trim(),
        p_phone: userForm.phone.trim() || null,
        p_role: requestedRole
      });

      if (rpcError) {
        if (rpcError.message?.includes('duplicate key') || rpcError.message?.includes('unique constraint') || rpcError.code === '23505') {
          throw rpcError;
        }
        if (rpcError.code === 'PGRST202' || rpcError.message?.includes('schema cache')) {
          throw new Error('La función de base de datos "crear_usuario_por_admin" aún no está instalada en tu proyecto de Supabase. Por favor ejecuta el script SQL en el editor de Supabase.');
        }
        throw rpcError;
      }

      await loadData();
    });
    cancelProfileEdit();
  };

  return (
    <div className="space-y-5">
      {message && (
        <div className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
          message.includes('correctamente')
            ? 'bg-slate-900 text-emerald-400 border border-emerald-500/30 shadow-xs'
            : 'bg-slate-900 text-rose-300 border border-rose-500/30 shadow-xs'
        }`}>
          <span>{message}</span>
          <button
            type="button"
            onClick={() => setMessage('')}
            className="ml-3 text-xs opacity-70 hover:opacity-100 cursor-pointer"
            aria-label="Cerrar mensaje"
          >
            ✕
          </button>
        </div>
      )}
      <div className="grid gap-5">
        {activeSection === 'grades' && <section className="rounded-3xl border border-purple-100 bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between"><div><h3 className="font-black text-slate-900">Grados</h3><p className="text-xs text-slate-500">Niveles académicos como Séptimo, Octavo y Noveno.</p></div><button type="button" onClick={toggleEditing} className={`rounded-xl p-2 ${isEditing ? 'bg-purple-100 text-purple-700' : 'text-slate-500 hover:bg-slate-100'}`} aria-label="Editar grados"><Edit3 className="h-4 w-4" /></button></div>
          {isEditing && <form onSubmit={event => { event.preventDefault(); run(() => saveGrado(grado, editing?.type === 'grado' ? editing.id : null)); }} className="mb-4 grid grid-cols-[1fr_150px_auto] gap-2"><input required placeholder="Nombre del grado" value={grado.name} onChange={event => setGrado({ ...grado, name: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" /><input required type="number" min="1" max="12" placeholder="Nivel" value={grado.numericLevel} onChange={event => setGrado({ ...grado, numericLevel: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" /><button className="rounded-xl bg-purple-600 px-3 py-2 text-xs font-bold text-white">Guardar grado</button></form>}
          <div className="space-y-2">{grados.map(item => <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span className="text-sm font-semibold text-slate-800">{item.name} <small className="font-normal text-slate-500">Nivel {item.numeric_level}</small></span>{isEditing && <span className="flex gap-1"><button type="button" onClick={() => { setGrado({ name: item.name, numericLevel: item.numeric_level }); setEditing({ type: 'grado', id: item.id }); }} className="rounded-lg p-1.5 text-purple-700" aria-label="Editar grado"><Edit3 className="h-4 w-4" /></button><button type="button" onClick={() => run(() => removeGrado(item.id))} className="rounded-lg p-1.5 text-rose-600" aria-label="Eliminar grado"><Trash2 className="h-4 w-4" /></button></span>}</div>)}</div>
        </section>}

        {activeSection === 'salones' && <section className="rounded-3xl border border-purple-100 bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between"><div><h3 className="font-black text-slate-900">Salones</h3><p className="text-xs text-slate-500">Espacios físicos, bloques y pisos.</p></div><button type="button" onClick={toggleEditing} className={`rounded-xl p-2 ${isEditing ? 'bg-purple-100 text-purple-700' : 'text-slate-500 hover:bg-slate-100'}`} aria-label="Editar salones"><Edit3 className="h-4 w-4" /></button></div>
          {isEditing && <form onSubmit={event => { event.preventDefault(); run(() => saveSalon(salon, editing?.type === 'salon' ? editing.id : null)); }} className="mb-4 grid grid-cols-[1fr_1fr_auto] gap-2"><input required placeholder="Nombre del salón" value={salon.name} onChange={event => setSalon({ ...salon, name: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" /><input placeholder="Bloque / piso" value={salon.building} onChange={event => setSalon({ ...salon, building: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" /><button className="rounded-xl bg-purple-600 px-3 py-2 text-xs font-bold text-white">Guardar salón</button></form>}
          <div className="space-y-2">{salones.map(item => <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span className="text-sm font-semibold text-slate-800">{item.name} <small className="font-normal text-slate-500">· {item.building}</small></span>{isEditing && <span className="flex gap-1"><button type="button" onClick={() => { setSalon({ name: item.name, building: item.building || '' }); setEditing({ type: 'salon', id: item.id }); }} className="rounded-lg p-1.5 text-purple-700" aria-label="Editar salón"><Edit3 className="h-4 w-4" /></button><button type="button" onClick={() => run(() => removeSalon(item.id))} className="rounded-lg p-1.5 text-rose-600" aria-label="Eliminar salón"><Trash2 className="h-4 w-4" /></button></span>}</div>)}</div>
        </section>}

        {activeSection === 'subjects' && <section className="rounded-3xl border border-purple-100 bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between"><div><h3 className="font-black text-slate-900">Escala de calificaciones</h3><p className="text-xs text-slate-500">Configuración global para toda la institución.</p></div><button type="button" onClick={toggleEditing} className={`rounded-xl p-2 ${isEditing ? 'bg-purple-100 text-purple-700' : 'text-slate-500 hover:bg-slate-100'}`} aria-label="Editar escala"><Edit3 className="h-4 w-4" /></button></div>
          {isEditing && <form onSubmit={event => { event.preventDefault(); run(() => saveGradingSettings({ ...grading, passingValue: Number(grading.passingValue) })); }} className="space-y-3">
            <select value={grading.format} onChange={event => setGrading({ ...grading, format: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="one_five">Numérica: 1 a 5</option><option value="zero_hundred">Numérica: 0 a 100</option><option value="a_f">Letras: A a F</option></select>
            <input type="number" step="0.1" value={grading.passingValue} onChange={event => setGrading({ ...grading, passingValue: event.target.value })} placeholder="Nota mínima aprobatoria" className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
            <button className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white">Guardar escala</button>
          </form>}
        </section>}

        {activeSection === 'courses' && <section className="rounded-3xl border border-purple-100 bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between"><div><h3 className="font-black text-slate-900">Cursos</h3><p className="text-xs text-slate-500">Grado, sección, salón y director.</p></div><button type="button" onClick={toggleEditing} className={`rounded-xl p-2 ${isEditing ? 'bg-purple-100 text-purple-700' : 'text-slate-500 hover:bg-slate-100'}`} aria-label="Editar cursos"><Edit3 className="h-4 w-4" /></button></div>
          {isEditing && <form onSubmit={event => { event.preventDefault(); run(() => saveCourse(course, editing?.type === 'course' ? editing.id : null)); }} className="space-y-2">
            <div className="grid grid-cols-2 gap-2"><select required value={course.gradoId} onChange={event => setCourse({ ...course, gradoId: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">Grado</option>{grados.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><input required placeholder="Sección (A, B...)" value={course.section} onChange={event => setCourse({ ...course, section: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" /></div>
            <select required value={course.salonId} onChange={event => setCourse({ ...course, salonId: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">Seleccionar salón físico</option>{salones.map(item => <option key={item.id} value={item.id}>{item.name} · {item.building}</option>)}</select>
            <button className="flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white"><Save className="h-4 w-4" />Guardar curso</button>
          </form>}
          <div className="mt-4 space-y-2">{grades.map(item => <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span className="text-sm font-semibold text-slate-800">{item.name} <small className="font-normal text-slate-500">· {item.salon}</small></span>{isEditing && <span className="flex gap-1"><button type="button" onClick={() => { setCourse({ gradoId: item.gradoId || '', section: item.section || '', salonId: item.salonId || '', directorId: item.directorId || '' }); setEditing({ type: 'course', id: item.id }); }} className="rounded-lg p-1.5 text-purple-700 hover:bg-purple-100" aria-label="Editar curso"><Edit3 className="h-4 w-4" /></button><button type="button" onClick={() => run(() => removeCourse(item.id))} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50" aria-label="Eliminar curso"><Trash2 className="h-4 w-4" /></button></span>}</div>)}</div>
        </section>}

        {activeSection === 'subjects' && <section className="rounded-3xl border border-purple-100 bg-white p-5 shadow-xs">
          <div className="mb-4 flex items-center justify-between"><div><h3 className="font-black text-slate-900">Materias y asignaciones</h3><p className="text-xs text-slate-500">El horario se generará al asignar una materia.</p></div><button type="button" onClick={toggleEditing} className={`rounded-xl p-2 ${isEditing ? 'bg-purple-100 text-purple-700' : 'text-slate-500 hover:bg-slate-100'}`} aria-label="Editar materias"><Edit3 className="h-4 w-4" /></button></div>
          {isEditing && <form onSubmit={event => { event.preventDefault(); run(() => saveSubject(subject, editing?.type === 'subject' ? editing.id : null)); }} className="space-y-2"><input required placeholder="Nombre de la materia" value={subject.name} onChange={event => setSubject({ ...subject, name: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /><input required placeholder="Nombre corto" value={subject.shortName} onChange={event => setSubject({ ...subject, shortName: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /><button className="flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white"><Save className="h-4 w-4" />Guardar materia</button></form>}
          <div className="mt-4 space-y-2">{subjects.map(item => <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2"><span className="text-sm font-semibold text-slate-800">{item.name}</span>{isEditing && <span className="flex gap-1"><button type="button" onClick={() => { setSubject({ name: item.name, shortName: item.shortName, icon: item.icon, color: item.color }); setEditing({ type: 'subject', id: item.id }); }} className="rounded-lg p-1.5 text-purple-700 hover:bg-purple-100" aria-label="Editar materia"><Edit3 className="h-4 w-4" /></button><button type="button" onClick={() => run(() => removeSubject(item.id))} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50" aria-label="Eliminar materia"><Trash2 className="h-4 w-4" /></button></span>}</div>)}</div>
          {isEditing && <form onSubmit={event => { event.preventDefault(); run(() => assignTeacherToCourse(assignment)); }} className="mt-5 grid gap-2 rounded-2xl bg-purple-50 p-4 sm:grid-cols-2"><p className="text-xs font-bold text-slate-700 sm:col-span-2">Asignar profesor y horario</p><select required value={assignment.subjectId} onChange={event => setAssignment({ ...assignment, subjectId: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">Materia</option>{subjects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select required value={assignment.teacherId} onChange={event => setAssignment({ ...assignment, teacherId: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">Profesor</option>{teachers.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select required value={assignment.courseId} onChange={event => setAssignment({ ...assignment, courseId: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="">Salón</option>{grades.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={assignment.dayOfWeek} onChange={event => setAssignment({ ...assignment, dayOfWeek: Number(event.target.value) })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value="1">Lunes</option><option value="2">Martes</option><option value="3">Miércoles</option><option value="4">Jueves</option><option value="5">Viernes</option></select><input type="time" value={assignment.startTime} onChange={event => setAssignment({ ...assignment, startTime: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" /><input type="time" value={assignment.endTime} onChange={event => setAssignment({ ...assignment, endTime: event.target.value })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" /><button className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white sm:col-span-2">Guardar asignación</button></form>}
        </section>}

        {isProfileSection && <section className="rounded-3xl border border-purple-100 bg-white p-5 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between"><h3 className="font-black text-slate-900">{activeSection === 'teachers' ? 'Profesores' : 'Acudientes'}</h3><button type="button" onClick={toggleEditing} className={`rounded-xl p-2 ${isEditing ? 'bg-purple-100 text-purple-700' : 'text-slate-500 hover:bg-slate-100'}`} aria-label={`Editar ${activeSection === 'teachers' ? 'profesores' : 'acudientes'}`}><Edit3 className="h-4 w-4" /></button></div>
          {isEditing && (
            <form onSubmit={submitUser} className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <input required placeholder="Nombre completo" value={userForm.fullName} onChange={event => setUserForm({ ...userForm, fullName: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm lg:col-span-2" />
              <input placeholder="Correo (opcional)" value={userForm.email} onChange={event => setUserForm({ ...userForm, email: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <input required={editing?.type !== 'profile'} placeholder="DNI / Cédula (obligatorio)" value={userForm.documentNumber} onChange={event => setUserForm({ ...userForm, documentNumber: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
              <div className="flex gap-2">
                <input placeholder="Teléfono" value={userForm.phone} onChange={event => setUserForm({ ...userForm, phone: event.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                <button className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shrink-0">{editing?.type === 'profile' ? 'Guardar' : 'Añadir'}</button>
              </div>
              <p className="text-[11px] text-purple-700 bg-purple-50 px-3 py-1.5 rounded-xl sm:col-span-2 lg:col-span-5 font-semibold">
                ℹ️ La cédula ingresada será la contraseña de acceso temporal del usuario. Al iniciar sesión por primera vez se le pedirá cambiarla.
              </p>
            </form>
          )}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {(activeSection === 'teachers'
              ? teachers.map(item => ({ ...item, role: 'teacher' }))
              : guardians.map(item => ({ ...item, role: 'guardian' }))
            ).map(item => (
              <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-sm font-semibold text-slate-800">{item.name || item.full_name}</span>
                {isEditing && (
                  <span className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => editProfile(item.role === 'teacher' ? { id: item.id, full_name: item.name, email: item.email, phone: item.phone, document_number: item.document_number || item.documentNumber } : item, item.role)}
                      className="rounded-lg p-1.5 text-purple-700 hover:bg-purple-100"
                      aria-label="Editar"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteProfile(item, item.role)}
                      className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-100"
                      aria-label="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>}

        {activeSection === 'students' && <section className="rounded-3xl border border-purple-100 bg-white p-5 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between"><h3 className="font-black text-slate-900">Estudiantes y acudientes</h3><button type="button" onClick={toggleEditing} className={`rounded-xl p-2 ${isEditing ? 'bg-purple-100 text-purple-700' : 'text-slate-500 hover:bg-slate-100'}`} aria-label="Editar estudiantes"><Edit3 className="h-4 w-4" /></button></div>
          {isEditing && <form onSubmit={event => { event.preventDefault(); run(() => saveStudent(student, editing?.type === 'student' ? editing.id : null)); }} className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-6"><input required placeholder="Nombre completo" value={student.name} onChange={event => setStudent({ ...student, name: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm lg:col-span-2" /><input required placeholder="Código escolar" value={student.studentCode} onChange={event => setStudent({ ...student, studentCode: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" /><input placeholder="DNI" value={student.documentNumber} onChange={event => setStudent({ ...student, documentNumber: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" /><select required value={student.gradeId} onChange={event => setStudent({ ...student, gradeId: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">Curso</option>{grades.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select required value={student.guardianId} onChange={event => setStudent({ ...student, guardianId: event.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-sm"><option value="">Acudiente</option>{guardians.map(item => <option key={item.id} value={item.id}>{item.full_name}</option>)}</select><button className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white">Guardar estudiante</button></form>}
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {students.map(item => (
              <div key={item.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                <span className="text-sm font-semibold text-slate-800">{item.name}</span>
                {isEditing && (
                  <span className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setStudent({
                          name: item.name,
                          documentNumber: item.documentNumber,
                          studentCode: item.studentCode,
                          gradeId: item.gradeId,
                          guardianId: item.guardianId || guardians.find(g => g.full_name === item.guardianName)?.id || '',
                          status: item.status === 'Activo' ? 'active' : 'inactive'
                        });
                        setEditing({ type: 'student', id: item.id });
                      }}
                      className="rounded-lg p-1.5 text-purple-700 hover:bg-purple-100"
                      aria-label="Editar estudiante"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => run(() => removeStudent(item.id))}
                      className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-100"
                      aria-label="Eliminar estudiante"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>}
      </div>
    </div>
  );
}
