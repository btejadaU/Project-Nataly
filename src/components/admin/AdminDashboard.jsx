import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import AdminManagement from './AdminManagement';
import StudentEnrollmentModal from './StudentEnrollmentModal';
import GradingMethodologyModal from './GradingMethodologyModal';
import { LayoutGrid, GraduationCap, UserPlus, Users, SlidersHorizontal } from 'lucide-react';

export default function AdminDashboard() {
  const { grades, teachers, students, gradingSettings } = useApp();
  const [activeTab, setActiveTab] = useState('grades');
  const [isEnrollmentOpen, setIsEnrollmentOpen] = useState(false);
  const [isGradingModalOpen, setIsGradingModalOpen] = useState(false);

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full animate-in fade-in duration-150">

      {/* Cabecera Limpia Rol Administrador */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-purple-100/70">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 shrink-0"></span>
            <h2 className="text-lg sm:text-2xl font-black text-slate-800 tracking-tight break-words">
              Gestión Institucional y Base Escolar
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
              Coordinación
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Supervisa salones, materias, profesores y la vinculación directa de estudiantes con acudientes.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsEnrollmentOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-purple-600 text-white font-bold text-xs shadow-xs hover:bg-purple-700 transition-all cursor-pointer w-full sm:w-auto"
        >
          <UserPlus className="w-4 h-4" />
          Inscribir nuevo estudiante
        </button>
      </div>

      {/* Tarjetas de Métricas Institucionales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <div className="bg-white p-3.5 sm:p-5 rounded-3xl border border-purple-100/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-600">Cursos</span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
              <LayoutGrid className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-800">{grades.length}</div>
            <p className="text-[11px] sm:text-xs text-slate-600 mt-1">Primaria y Secundaria</p>
          </div>
        </div>

        {/* Tarjeta de Metodología de Calificación */}
        <button
          type="button"
          onClick={() => setIsGradingModalOpen(true)}
          className="bg-white p-3.5 sm:p-5 rounded-3xl border border-purple-100/80 shadow-xs hover:shadow-md hover:border-purple-300 transition-all cursor-pointer text-left group relative focus:outline-hidden focus:ring-2 focus:ring-purple-500/20"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-600 group-hover:text-purple-700 transition-colors">
              Metodología
            </span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-indigo-50 group-hover:bg-purple-100 group-hover:text-purple-700 flex items-center justify-center text-indigo-600 transition-colors">
              <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-800 group-hover:text-purple-900 transition-colors truncate">
              {gradingSettings?.format === 'zero_hundred'
                ? '0 a 100'
                : gradingSettings?.format === 'a_f'
                ? 'A a F'
                : '0 a 5'}
            </div>
            <p className="text-[11px] sm:text-xs text-slate-600 mt-1 font-medium flex items-center justify-between">
              <span>Aprueba con: <strong className="text-slate-800">{gradingSettings?.passingValue ?? (gradingSettings?.format === 'zero_hundred' ? 60 : 3.0)}</strong></span>
              <span className="text-purple-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity text-[10px] sm:text-[11px]">Editar →</span>
            </p>
          </div>
        </button>

        <div className="bg-white p-3.5 sm:p-5 rounded-3xl border border-purple-100/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-600">Profesores</span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-fuchsia-50 flex items-center justify-center text-fuchsia-600">
              <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-800">{teachers.length}</div>
            <p className="text-[11px] sm:text-xs text-slate-600 mt-1">Docentes capacitados</p>
          </div>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-3xl border border-purple-100/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-600">Estudiantes</span>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-800">{students.length}</div>
            <p className="text-[11px] sm:text-xs text-slate-600 font-semibold mt-1">Matriculados activos</p>
          </div>
        </div>
      </div>

      {/* Pestañas de Navegación del Administrador */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-purple-100 pb-4">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-purple-50/70 rounded-2xl border border-purple-100/80 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('grades')}
            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer text-center ${activeTab === 'grades'
              ? 'bg-white text-purple-900 shadow-xs border border-purple-200/60'
              : 'text-slate-600 hover:text-purple-700'
              }`}
          >
            Grados
          </button>
          <button onClick={() => setActiveTab('courses')} className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer text-center ${activeTab === 'courses' ? 'bg-white text-purple-900 shadow-xs border border-purple-200/60' : 'text-slate-600 hover:text-purple-700'}`}>Cursos</button>
          <button onClick={() => setActiveTab('salones')} className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer text-center ${activeTab === 'salones' ? 'bg-white text-purple-900 shadow-xs border border-purple-200/60' : 'text-slate-600 hover:text-purple-700'}`}>Salones</button>
          <button
            onClick={() => setActiveTab('subjects')}
            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer text-center ${activeTab === 'subjects'
              ? 'bg-white text-purple-900 shadow-xs border border-purple-200/60'
              : 'text-slate-600 hover:text-purple-700'
              }`}
          >
            Materias
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer text-center ${activeTab === 'schedule'
              ? 'bg-white text-purple-900 shadow-xs border border-purple-200/60'
              : 'text-slate-600 hover:text-purple-700'
              }`}
          >
            Horarios
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer text-center ${activeTab === 'students'
              ? 'bg-white text-purple-900 shadow-xs border border-purple-200/60'
              : 'text-slate-600 hover:text-purple-700'
              }`}
          >
            Estudiantes
          </button>
          <button onClick={() => setActiveTab('teachers')} className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer text-center ${activeTab === 'teachers' ? 'bg-white text-purple-900 shadow-xs border border-purple-200/60' : 'text-slate-600 hover:text-purple-700'}`}>Profesores</button>
          <button onClick={() => setActiveTab('guardians')} className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer text-center ${activeTab === 'guardians' ? 'bg-white text-purple-900 shadow-xs border border-purple-200/60' : 'text-slate-600 hover:text-purple-700'}`}>Acudientes</button>
        </div>

      </div>

      <AdminManagement activeSection={activeTab} onTabChange={setActiveTab} />

      <StudentEnrollmentModal
        isOpen={isEnrollmentOpen}
        onClose={() => setIsEnrollmentOpen(false)}
        onEnrolled={() => setActiveTab('students')}
      />

      <GradingMethodologyModal
        isOpen={isGradingModalOpen}
        onClose={() => setIsGradingModalOpen(false)}
      />
    </div>
  );
}
