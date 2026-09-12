import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Building2,
  BookOpen,
  Users,
  GraduationCap,
  PlusCircle,
  Search,
  CheckCircle2,
  Phone,
  Mail,
  UserCheck,
  Sparkles,
  Layers,
  ArrowRight,
  Filter
} from 'lucide-react';

export default function AdminDashboard() {
  const { grades, subjects, teachers, students, addStudent } = useApp();

  const [activeTab, setActiveTab] = useState('structure'); // 'structure', 'subjects', 'students'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  // Formulario nuevo estudiante/acudiente
  const [newStudentName, setNewStudentName] = useState('');
  const [newGuardianName, setNewGuardianName] = useState('');
  const [newGuardianKinship, setNewGuardianKinship] = useState('Madre');
  const [newGuardianPhone, setNewGuardianPhone] = useState('+57 3');
  const [newGuardianEmail, setNewGuardianEmail] = useState('');
  const [newGradeId, setNewGradeId] = useState('9A');

  const handleCreateStudent = (e) => {
    e.preventDefault();
    if (!newStudentName || !newGuardianName) return;

    addStudent({
      name: newStudentName,
      gradeId: newGradeId,
      guardianName: newGuardianName,
      guardianKinship: newGuardianKinship,
      guardianPhone: newGuardianPhone,
      guardianEmail: newGuardianEmail
    });

    setNewStudentName('');
    setNewGuardianName('');
    setNewGuardianPhone('+57 3');
    setNewGuardianEmail('');
    setShowAddModal(false);
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.guardianName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.guardianPhone.includes(searchTerm);
    const matchesGrade = selectedGradeFilter === 'ALL' || s.gradeId === selectedGradeFilter;
    return matchesSearch && matchesGrade;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      
      {/* Cabecera Limpia Rol Administrador */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-purple-100/70">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              Gestión Institucional y Base Escolar
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              Coordinación
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Supervisa salones, materias, profesores y la vinculación directa de estudiantes con acudientes.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-purple-600 text-white font-bold text-xs shadow-xs hover:bg-purple-700 transition-all cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          Vincular Estudiante & Acudiente
        </button>
      </div>

      {/* Tarjetas de Métricas Institucionales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-3xl border border-purple-100/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Salones y Grados</span>
            <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-800">{grades.length}</div>
            <p className="text-xs text-slate-600 mt-1">Primaria y Secundaria activa</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-purple-100/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Materias Activas</span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-800">{subjects.length}</div>
            <p className="text-xs text-slate-600 mt-1">Plan de estudios 2026</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-purple-100/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Cuerpo Docente</span>
            <div className="w-10 h-10 rounded-2xl bg-fuchsia-50 flex items-center justify-center text-fuchsia-600">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-800">{teachers.length}</div>
            <p className="text-xs text-slate-600 mt-1">Docentes capacitados en IA</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-purple-100/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Acudientes Activos</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-800">100%</div>
            <p className="text-xs text-emerald-600 font-semibold mt-1">Canal directo verificado</p>
          </div>
        </div>
      </div>

      {/* Pestañas de Navegación del Administrador */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-purple-100 pb-4">
        <div className="flex items-center gap-2 p-1.5 bg-purple-50/70 rounded-2xl border border-purple-100/80 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('structure')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'structure'
                ? 'bg-white text-purple-900 shadow-xs border border-purple-200/60'
                : 'text-slate-600 hover:text-purple-700'
            }`}
          >
            1. Salones y Cursos ({grades.length})
          </button>
          <button
            onClick={() => setActiveTab('subjects')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'subjects'
                ? 'bg-white text-purple-900 shadow-xs border border-purple-200/60'
                : 'text-slate-600 hover:text-purple-700'
            }`}
          >
            2. Materias y Profesores ({subjects.length})
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'students'
                ? 'bg-white text-purple-900 shadow-xs border border-purple-200/60'
                : 'text-slate-600 hover:text-purple-700'
            }`}
          >
            3. Estudiantes y Acudientes ({students.length})
          </button>
        </div>

        {activeTab === 'students' && (
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar alumno o acudiente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-white rounded-2xl border border-purple-100 focus:outline-hidden focus:ring-2 focus:ring-purple-400/40 text-slate-700"
              />
            </div>
            <select
              value={selectedGradeFilter}
              onChange={(e) => setSelectedGradeFilter(e.target.value)}
              className="px-3 py-2 text-xs sm:text-sm bg-white rounded-2xl border border-purple-100 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-purple-400/40 cursor-pointer"
            >
              <option value="ALL">Todos los grados</option>
              {grades.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Contenido de la pestaña 1: Salones y Cursos */}
      {activeTab === 'structure' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {grades.map((grade) => {
            const isPiloto = grade.id === '9A';
            return (
              <div
                key={grade.id}
                className={`bg-white rounded-3xl p-6 border transition-all duration-200 ${
                  isPiloto
                    ? 'border-purple-300 shadow-md ring-2 ring-purple-400/20'
                    : 'border-purple-100/80 shadow-xs hover:shadow-md'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg ${
                      isPiloto ? 'bg-purple-600 text-white shadow-sm' : 'bg-purple-100 text-purple-700'
                    }`}>
                      {grade.name.replace('Grado ', '')}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-base">{grade.name}</h3>
                      <p className="text-xs text-slate-600 font-medium">{grade.salon}</p>
                    </div>
                  </div>
                  {isPiloto && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                      Curso Piloto Nataly
                    </span>
                  )}
                </div>

                <div className="mt-5 space-y-2.5 text-xs text-slate-600 border-t border-purple-50 pt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Director de Grupo:</span>
                    <span className="font-semibold text-slate-800">{grade.director}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Ubicación Física:</span>
                    <span className="font-medium text-slate-700">{grade.building}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">Capacidad Matriculada:</span>
                    <span className="font-bold text-purple-700">{grade.totalStudents} estudiantes</span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-purple-50 flex items-center justify-between">
                  <span className="inline-flex items-center text-[11px] text-emerald-600 font-semibold gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Canal Escolar Activo
                  </span>
                  <button
                    onClick={() => setActiveTab('students')}
                    className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center gap-1 cursor-pointer"
                  >
                    Ver Alumnos <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Contenido de la pestaña 2: Materias y Profesores */}
      {activeTab === 'subjects' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((subj) => (
            <div
              key={subj.id}
              className="bg-white rounded-3xl p-6 border border-purple-100/80 shadow-xs hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl bg-purple-100/70 border border-purple-200/60 flex items-center justify-center text-purple-700 font-bold">
                  <BookOpen className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                  Plan Semestral
                </span>
              </div>

              <h3 className="font-bold text-slate-800 text-lg mt-4">{subj.name}</h3>
              <p className="text-xs text-slate-600 mt-1">Docente Titular Asignado:</p>
              <div className="mt-2 p-3 bg-purple-50/50 rounded-2xl border border-purple-100/50 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-200 flex items-center justify-center text-purple-800 font-bold text-xs">
                  {subj.teacher.split(' ')[1]?.[0] || 'D'}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-800">{subj.teacher}</div>
                  <div className="text-[11px] text-purple-600 font-medium">Asignado a 9°A, 8°A y 11°A</div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-purple-50 flex items-center justify-between text-xs">
                <span className="text-slate-600">Frecuencia Semanal:</span>
                <span className="font-bold text-slate-700">4 Horas Pedagógicas</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contenido de la pestaña 3: Estudiantes y Acudientes */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-3xl border border-purple-100/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-purple-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Directorio de Estudiantes y Acudientes Vinculados</h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Cada estudiante cuenta con su acudiente directo para recepción de notas y mensajes adaptados con IA.
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 bg-purple-50 text-purple-700 rounded-full border border-purple-100 self-start sm:self-auto">
              Mostrando {filteredStudents.length} estudiantes
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-purple-50/50 text-[11px] font-bold text-slate-600 uppercase tracking-wider border-b border-purple-100/60">
                  <th className="py-3 px-5">Estudiante</th>
                  <th className="py-3 px-4">Grado</th>
                  <th className="py-3 px-5">Acudiente Responsable</th>
                  <th className="py-3 px-4">Parentesco</th>
                  <th className="py-3 px-4">Teléfono Notificaciones</th>
                  <th className="py-3 px-4 text-center">Estado del Canal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-50/60 text-xs">
                {filteredStudents.map((std) => (
                  <tr
                    key={std.id}
                    className={`hover:bg-purple-50/30 transition-colors ${
                      std.isTargetStudent ? 'bg-purple-50/40' : ''
                    }`}
                  >
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <img
                          src={std.avatar}
                          alt={std.name}
                          className="w-9 h-9 rounded-2xl object-cover border border-purple-200 shadow-xs"
                        />
                        <div>
                          <span className="font-bold text-slate-800 block">{std.name}</span>
                          {std.isTargetStudent && (
                            <span className="inline-block text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.2 rounded-md">
                              Estudiante Principal Demo
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-700">
                      <span className="px-2.5 py-1 bg-slate-100 rounded-xl font-bold text-slate-700">
                        {std.gradeName}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 font-bold text-slate-800">
                      {std.guardianName}
                      <span className="block text-[10px] text-slate-600 font-normal">{std.guardianEmail}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                        {std.guardianKinship}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                      <span className="inline-flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-purple-500" />
                        {std.guardianPhone}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        Vinculado & Activo
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Vincular Nuevo Estudiante & Acudiente */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-purple-100 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-800">Vincular Estudiante y Acudiente</h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  Asigne un nuevo alumno a su salón y registre el contacto del acudiente.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo del Estudiante</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Camilo Andrés Restrepo"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-purple-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Grado / Salón</label>
                  <select
                    value={newGradeId}
                    onChange={(e) => setNewGradeId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-purple-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  >
                    {grades.map(g => (
                      <option key={g.id} value={g.id}>{g.name} ({g.salon})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Parentesco</label>
                  <select
                    value={newGuardianKinship}
                    onChange={(e) => setNewGuardianKinship(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-purple-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Madre">Madre</option>
                    <option value="Padre">Padre</option>
                    <option value="Tutor Legal">Tutor Legal</option>
                    <option value="Abuelo/a">Abuelo/a</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Completo del Acudiente</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Gloria Restrepo"
                  value={newGuardianName}
                  onChange={(e) => setNewGuardianName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-purple-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Teléfono Notificaciones</label>
                  <input
                    type="tel"
                    required
                    placeholder="+57 3..."
                    value={newGuardianPhone}
                    onChange={(e) => setNewGuardianPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-purple-100 text-sm font-mono focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="gloria@ejemplo.com"
                    value={newGuardianEmail}
                    onChange={(e) => setNewGuardianEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-purple-100 text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-purple-50">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-2xl bg-purple-600 text-white text-xs font-bold shadow-md hover:bg-purple-700 cursor-pointer"
                >
                  Guardar y Vincular
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
