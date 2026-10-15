import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Edit3,
  Trash2,
  AlertTriangle,
  BookOpen,
  User,
  Building,
  X,
  Coffee,
  Minus,
  ChevronLeft,
  ChevronRight,
  Move
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useApp } from '../../context/AppContext';
import {
  START_HOUR_OPTIONS,
  timeToMinutes,
  minutesToTime,
  doTimeRangesOverlap,
  generateScheduleTimeline
} from '../../utils/scheduleTimeline';

// Días escolares estándar (1: Lunes ... 6: Sábado)
const DAYS_CONFIG = [
  { id: 1, name: 'Lunes', short: 'Lun' },
  { id: 2, name: 'Martes', short: 'Mar' },
  { id: 3, name: 'Miércoles', short: 'Mié' },
  { id: 4, name: 'Jueves', short: 'Jue' },
  { id: 5, name: 'Viernes', short: 'Vie' },
  { id: 6, name: 'Sábado', short: 'Sáb' }
];

export default function WeeklyScheduleEditor({ onNavigateToTeachers }) {
  const {
    grades,
    subjects,
    teachers,
    salones,
    rawHorarios,
    saveScheduleBlock,
    deleteScheduleBlock
  } = useApp();

  // Curso seleccionado actualmente para ver/editar su horario
  const [selectedCourseId, setSelectedCourseId] = useState(grades[0]?.id || '');
  const [includeSaturday, setIncludeSaturday] = useState(false);

  // 1. Configuración dinámica de jornada: Hora de inicio y número de franjas base
  const [startHour, setStartHour] = useState('07:00');
  const [totalSlots, setTotalSlots] = useState(6);
  // Lista de recesos flexibles: [{ slotIndex: number, duration: number }]
  const [breaks, setBreaks] = useState([]);

  // Modales de interacción
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState(null); // null para nuevo bloque, o bloque existente
  const [viewingBlock, setViewingBlock] = useState(null); // bloque seleccionado para inspeccionar

  // Modal para configurar receso
  const [isBreakModalOpen, setIsBreakModalOpen] = useState(false);
  const [breakModalTargetSlot, setBreakModalTargetSlot] = useState(2);
  const [breakModalDuration, setBreakModalDuration] = useState(20);

  // Estado del formulario de bloque
  const [formData, setFormData] = useState({
    blockType: 'class', // 'class' | 'break'
    breakDuration: 20,
    slotIndex: 0,
    dayOfWeek: 1,
    startTime: '07:00',
    endTime: '08:00',
    subjectId: '',
    teacherId: '',
    topic: ''
  });

  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Cargar configuración guardada al cambiar de curso
  useEffect(() => {
    if (!selectedCourseId) return;
    const configKey = `schedule_config_${selectedCourseId}`;
    const saved = localStorage.getItem(configKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.startHour) setStartHour(parsed.startHour);
        if (parsed.totalSlots) setTotalSlots(parsed.totalSlots);
        if (Array.isArray(parsed.breaks)) setBreaks(parsed.breaks);
      } catch (e) {
        console.error('Error al cargar configuración de horario:', e);
      }
    }
  }, [selectedCourseId]);

  const persistConfig = (newStartHour, newTotalSlots, newBreaks) => {
    if (!selectedCourseId) return;
    const configKey = `schedule_config_${selectedCourseId}`;
    localStorage.setItem(
      configKey,
      JSON.stringify({
        startHour: newStartHour,
        totalSlots: newTotalSlots,
        breaks: newBreaks
      })
    );
  };

  const scrollContainerRef = useRef(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0, hasMoved: false });
  const [activeDayView, setActiveDayView] = useState(1);

  // Navegación fluida hacia un día específico en móvil
  const scrollToDay = dayId => {
    setActiveDayView(dayId);
    const pill = document.getElementById(`pill-day-${dayId}`);
    if (pill) {
      pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }

    const container = scrollContainerRef.current;
    if (!container) return;
    const dayIndex = activeDays.findIndex(d => d.id === dayId);
    if (dayIndex === -1) return;

    const colWidth = includeSaturday ? 131 : 132;
    container.scrollTo({ left: Math.max(0, dayIndex * colWidth), behavior: 'smooth' });
  };

  const scrollDays = direction => {
    const currentIndex = activeDays.findIndex(d => d.id === activeDayView);
    const nextIndex = Math.max(
      0,
      Math.min(activeDays.length - 1, (currentIndex === -1 ? 0 : currentIndex) + direction)
    );
    scrollToDay(activeDays[nextIndex].id);
  };

  // Manejo de arrastre (pan en cualquier dirección para mouse y touch)
  const handlePointerDown = e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
      hasMoved: false,
      pointerId: e.pointerId
    };

    if (e.pointerType === 'mouse') {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const handlePointerMove = e => {
    if (!isDraggingRef.current) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (!dragStartRef.current.hasMoved && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
      dragStartRef.current.hasMoved = true;
    }

    // En mouse hacemos scroll por JS. En touch el navegador hace pan-x pan-y nativo a 120fps
    if (dragStartRef.current.hasMoved && e.pointerType === 'mouse') {
      container.scrollLeft = dragStartRef.current.scrollLeft - dx;
      container.scrollTop = dragStartRef.current.scrollTop - dy;
    }
  };

  const handlePointerUp = e => {
    if (e && e.pointerType === 'mouse') {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
    isDraggingRef.current = false;
    setTimeout(() => {
      if (dragStartRef.current) {
        dragStartRef.current.hasMoved = false;
      }
    }, 80);
  };

  const handlePointerCancel = () => {
    isDraggingRef.current = false;
    if (dragStartRef.current) {
      dragStartRef.current.hasMoved = false;
    }
  };

  // Sincronizar el día activo mientras el usuario se desplaza horizontalmente
  const handleContainerScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const colWidth = includeSaturday ? 131 : 132;
    const dayIndex = Math.min(
      activeDays.length - 1,
      Math.max(0, Math.round(container.scrollLeft / colWidth))
    );
    const activeDay = activeDays[dayIndex];
    if (activeDay && activeDay.id !== activeDayView) {
      setActiveDayView(activeDay.id);
      const pill = document.getElementById(`pill-day-${activeDay.id}`);
      if (pill) {
        pill.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    }
  };

  const activeCourse = useMemo(() => {
    return grades.find(g => g.id === selectedCourseId) || grades[0] || null;
  }, [grades, selectedCourseId]);

  const activeDays = useMemo(() => {
    return includeSaturday ? DAYS_CONFIG : DAYS_CONFIG.slice(0, 5);
  }, [includeSaturday]);

  // Lista de todos los bloques de horario existentes
  const allBlocks = useMemo(() => {
    return rawHorarios || [];
  }, [rawHorarios]);

  // Línea de tiempo recalculada automáticamente en cascada
  const timeline = useMemo(() => {
    return generateScheduleTimeline(startHour, totalSlots, breaks);
  }, [startHour, totalSlots, breaks]);

  // Mapeo estable de bloques a índices de franjas (slotIndex)
  const courseBlocksWithSlot = useMemo(() => {
    if (!activeCourse) return [];
    const blocks = allBlocks.filter(b => b.class_group_id === activeCourse.id);

    return blocks.map(b => {
      let sIdx = b.slot_index;
      if (sIdx === undefined || sIdx === null) {
        const foundSlot = timeline.find(
          s => !s.isBreak && doTimeRangesOverlap(s.startTime, s.endTime, b.start_time, b.end_time)
        );
        if (foundSlot) {
          sIdx = foundSlot.slotIndex;
        } else {
          // Si el bloque está fuera del rango horario activo, no pertenece a ninguna franja visible
          sIdx = -1;
        }
      }
      return {
        ...b,
        slotIndex: sIdx
      };
    });
  }, [allBlocks, activeCourse, timeline, totalSlots]);

  // Verifica si la última franja tiene clases asignadas para permitir eliminarla
  const isLastSlotOccupied = useMemo(() => {
    const lastSlotIndex = totalSlots - 1;
    return courseBlocksWithSlot.some(b => b.slotIndex === lastSlotIndex);
  }, [courseBlocksWithSlot, totalSlots]);

  // Docentes filtrados para la materia seleccionada en el formulario
  const availableTeachersForSubject = useMemo(() => {
    if (!formData.subjectId) return [];
    return teachers.filter(t => t.subjectIds && t.subjectIds.includes(formData.subjectId));
  }, [teachers, formData.subjectId]);

  // Verificación de colisiones en tiempo real
  const collisionAlert = useMemo(() => {
    if (formData.blockType === 'break') return null;
    if (!formData.dayOfWeek || !formData.startTime || !formData.endTime) {
      return null;
    }

    const startMin = timeToMinutes(formData.startTime);
    const endMin = timeToMinutes(formData.endTime);

    if (startMin >= endMin) {
      return {
        type: 'invalid_range',
        message: 'La hora de inicio debe ser anterior a la hora de fin.'
      };
    }

    const currentBlockId = editingBlock?.id || null;
    const targetDay = Number(formData.dayOfWeek);

    for (const b of allBlocks) {
      if (currentBlockId && b.id === currentBlockId) continue;
      if (Number(b.day_of_week) !== targetDay) continue;

      const overlap = doTimeRangesOverlap(formData.startTime, formData.endTime, b.start_time, b.end_time);
      if (!overlap) continue;

      const bTimeFmt = `${b.start_time.slice(0, 5)} - ${b.end_time.slice(0, 5)}`;
      const bCourse = grades.find(g => g.id === b.class_group_id);
      const bSubject = subjects.find(s => s.id === b.subject_id);

      // 1. Conflicto de docente
      if (formData.teacherId && b.teacher_id === formData.teacherId) {
        const teacherObj = teachers.find(t => t.id === formData.teacherId);
        return {
          type: 'teacher',
          message: `Conflicto de Docente: ${teacherObj?.name || 'El profesor'} ya tiene clase de "${bSubject?.name || 'Materia'}" en ${bCourse?.name || 'otro curso'} (${bTimeFmt}).`
        };
      }

      // 2. Conflicto de curso
      if (activeCourse && b.class_group_id === activeCourse.id) {
        return {
          type: 'course',
          message: `Conflicto de Curso: El curso ${activeCourse.name} ya tiene asignada la materia "${bSubject?.name || 'Clase'}" en este mismo horario (${bTimeFmt}).`
        };
      }

      // 3. Conflicto de salón físico
      if (activeCourse?.salonId && bCourse?.salonId === activeCourse.salonId) {
        const salonObj = salones.find(s => s.id === activeCourse.salonId);
        return {
          type: 'salon',
          message: `Conflicto de Salón: El salón "${salonObj?.name || 'físico'}" ya está ocupado por ${bCourse?.name || 'otro grupo'} en este horario (${bTimeFmt}).`
        };
      }
    }

    return null;
  }, [formData, editingBlock, allBlocks, activeCourse, teachers, grades, subjects, salones]);

  // Manejadores de línea de tiempo y jornada
  const handleChangeStartHour = (newHour) => {
    setStartHour(newHour);
    persistConfig(newHour, totalSlots, breaks);
  };

  const handleAddSlot = () => {
    const next = totalSlots + 1;
    setTotalSlots(next);
    persistConfig(startHour, next, breaks);
  };

  const handleRemoveLastSlot = async () => {
    if (totalSlots <= 1) return;

    const lastSlotIndex = totalSlots - 1;
    const blocksInLastSlot = courseBlocksWithSlot.filter(b => b.slotIndex === lastSlotIndex);
    const lastSlotInfo = timeline.find(s => !s.isBreak && s.slotIndex === lastSlotIndex);
    const slotLabel = lastSlotInfo?.timeLabel || `Franja ${totalSlots}`;

    if (blocksInLastSlot.length > 0) {
      const classListHtml = blocksInLastSlot
        .map(b => {
          const sName = subjects.find(s => s.id === b.subject_id)?.name || 'Materia';
          const dayName = DAYS_CONFIG.find(d => d.id === Number(b.day_of_week))?.name || 'Día';
          return `<li><strong>${sName}</strong> (${dayName} ${b.start_time.slice(0, 5)})</li>`;
        })
        .join('');

      const result = await Swal.fire({
        title: '¿Remover última franja?',
        html: `
          <div class="space-y-3 text-left">
            <p class="text-sm text-slate-600">
              La última franja (<strong>${slotLabel}</strong>) contiene <strong>${blocksInLastSlot.length} clase(s) asignada(s)</strong>:
            </p>
            <ul class="text-xs bg-purple-50 p-3 rounded-xl border border-purple-200 list-disc list-inside text-purple-900 space-y-1">
              ${classListHtml}
            </ul>
            <p class="text-xs text-slate-500">
              Al remover la franja, estas clases se retirarán de la programación semanal de este curso. ¿Deseas continuar?
            </p>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, remover franja y clases',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#e11d48',
        cancelButtonColor: '#94a3b8'
      });

      if (!result.isConfirmed) return;

      try {
        for (const b of blocksInLastSlot) {
          await deleteScheduleBlock(b.id);
        }
      } catch (err) {
        console.error('Error al retirar clases de la franja:', err);
        Swal.fire({
          title: 'Error al retirar clases',
          text: err.message || 'No se pudieron eliminar algunas clases de la última franja.',
          icon: 'error',
          confirmButtonColor: '#7c3aed'
        });
        return;
      }
    }

    const next = totalSlots - 1;
    const newBreaks = breaks.filter(b => b.slotIndex < next);
    setTotalSlots(next);
    setBreaks(newBreaks);
    persistConfig(startHour, next, newBreaks);

    if (blocksInLastSlot.length === 0) {
      const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1600,
        timerProgressBar: true
      });
      Toast.fire({
        icon: 'success',
        title: `Franja removida (${next} franjas en la jornada)`
      });
    } else {
      Swal.fire({
        title: 'Franja y clases removidas',
        text: `La jornada ahora tiene ${next} franjas.`,
        icon: 'success',
        timer: 1800,
        showConfirmButton: false
      });
    }
  };

  const handleSetBreak = (slotIndex, duration) => {
    let newBreaks;
    if (!duration) {
      newBreaks = breaks.filter(b => b.slotIndex !== slotIndex);
    } else {
      const existingIdx = breaks.findIndex(b => b.slotIndex === slotIndex);
      if (existingIdx >= 0) {
        newBreaks = breaks.map((b, i) => i === existingIdx ? { ...b, duration: Number(duration) } : b);
      } else {
        newBreaks = [...breaks, { slotIndex, duration: Number(duration) }];
      }
    }
    setBreaks(newBreaks);
    persistConfig(startHour, totalSlots, newBreaks);
  };

  const handleRemoveBreak = (slotIndex) => {
    handleSetBreak(slotIndex, 0);
  };

  // Abrir modal para crear en una celda vacía
  const handleOpenCreateModal = (dayId, slot) => {
    setEditingBlock(null);
    setViewingBlock(null);
    setFormError('');
    setFormData({
      blockType: 'class',
      breakDuration: 20,
      slotIndex: slot.slotIndex,
      dayOfWeek: dayId,
      startTime: slot.startTime,
      endTime: slot.endTime,
      subjectId: '',
      teacherId: '',
      topic: ''
    });
    setIsModalOpen(true);
  };

  // Abrir modal para inspeccionar un bloque existente
  const handleOpenViewModal = (block) => {
    setViewingBlock(block);
  };

  // Pasar de ver a editar
  const handleStartEditFromView = (block) => {
    setViewingBlock(null);
    setEditingBlock(block);
    setFormError('');
    setFormData({
      blockType: 'class',
      breakDuration: 20,
      slotIndex: block.slotIndex ?? 0,
      dayOfWeek: Number(block.day_of_week),
      startTime: block.start_time.slice(0, 5),
      endTime: block.end_time.slice(0, 5),
      subjectId: block.subject_id || '',
      teacherId: block.teacher_id || '',
      topic: block.topic || ''
    });
    setIsModalOpen(true);
  };

  // Eliminar un bloque de horario
  const handleDeleteBlock = async (block) => {
    const subjectName = subjects.find(s => s.id === block.subject_id)?.name || 'esta clase';
    const result = await Swal.fire({
      title: '¿Eliminar horario?',
      html: `¿Estás seguro de que deseas retirar la clase de <strong>${subjectName}</strong> (${block.start_time.slice(0, 5)} - ${block.end_time.slice(0, 5)}) del horario de este curso?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar horario',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#94a3b8'
    });

    if (result.isConfirmed) {
      try {
        await deleteScheduleBlock(block.id);
        setViewingBlock(null);
        setIsModalOpen(false);
        Swal.fire({
          title: 'Horario eliminado',
          text: 'La clase fue retirada de la programación semanal.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
      } catch (err) {
        Swal.fire({
          title: 'Error al eliminar',
          text: err.message || 'No se pudo eliminar el bloque de horario.',
          icon: 'error',
          confirmButtonColor: '#7c3aed'
        });
      }
    }
  };

  // Guardar (crear o actualizar) bloque de horario o receso
  const handleSubmitForm = async (e) => {
    e.preventDefault();

    // Caso 1: Asignar receso desde el modal
    if (formData.blockType === 'break') {
      handleSetBreak(formData.slotIndex, formData.breakDuration);
      setIsModalOpen(false);
      Swal.fire({
        title: 'Receso configurado',
        text: `Se programó un receso de ${formData.breakDuration} minutos para esta franja.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      return;
    }

    // Caso 2: Asignar clase
    if (collisionAlert) {
      setFormError(collisionAlert.message);
      return;
    }
    if (!formData.subjectId) {
      setFormError('Debes seleccionar una materia.');
      return;
    }
    if (!activeCourse) {
      setFormError('Debes seleccionar un curso activo.');
      return;
    }

    setIsSubmitting(true);
    setFormError('');

    try {
      await saveScheduleBlock(
        {
          classGroupId: activeCourse.id,
          subjectId: formData.subjectId,
          teacherId: formData.teacherId || null,
          dayOfWeek: Number(formData.dayOfWeek),
          startTime: formData.startTime,
          endTime: formData.endTime,
          topic: formData.topic?.trim() || null
        },
        editingBlock?.id || null
      );

      setIsModalOpen(false);
      setEditingBlock(null);
      Swal.fire({
        title: editingBlock ? 'Clase actualizada' : 'Clase programada',
        text: 'El horario semanal se ha actualizado correctamente.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err) {
      setFormError(err.message || 'Error al guardar el bloque de horario.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const firstClassSlot = timeline.find(s => !s.isBreak) || { startTime: '07:00', endTime: '08:00', slotIndex: 0 };

  // Cálculos reactivos de tiempos para el modal de receso escolar (Añadir / Editar Receso)
  const breakTargetBaseMin = useMemo(() => {
    return timeToMinutes(startHour) + (breakModalTargetSlot || 0) * 60;
  }, [startHour, breakModalTargetSlot]);

  const breakTargetStartFmt = useMemo(() => {
    return minutesToTime(breakTargetBaseMin);
  }, [breakTargetBaseMin]);

  const breakTargetEndFmt = useMemo(() => {
    return minutesToTime(breakTargetBaseMin + 60);
  }, [breakTargetBaseMin]);

  const clampedBreakModalDuration = Math.max(5, Math.min(60, Number(breakModalDuration) || 20));

  const breakTargetBreakEndFmt = useMemo(() => {
    return minutesToTime(breakTargetBaseMin + clampedBreakModalDuration);
  }, [breakTargetBaseMin, clampedBreakModalDuration]);

  // Cálculos reactivos para el modal de bloques cuando se elige tipo "break"
  const formBreakSlotBaseMin = useMemo(() => {
    return timeToMinutes(startHour) + (formData.slotIndex || 0) * 60;
  }, [startHour, formData.slotIndex]);

  const formBreakStartFmt = useMemo(() => {
    return minutesToTime(formBreakSlotBaseMin);
  }, [formBreakSlotBaseMin]);

  const formBreakEndFmt = useMemo(() => {
    return minutesToTime(formBreakSlotBaseMin + 60);
  }, [formBreakSlotBaseMin]);

  const clampedFormBreakDuration = Math.max(5, Math.min(60, Number(formData.breakDuration) || 20));

  const formBreakTimeEndFmt = useMemo(() => {
    return minutesToTime(formBreakSlotBaseMin + clampedFormBreakDuration);
  }, [formBreakSlotBaseMin, clampedFormBreakDuration]);

  return (
    <div className="space-y-6 w-full min-w-0 max-w-full">
      {/* Barra superior de control y selección de curso y jornada - Adaptable a móvil */}
      <div className="bg-white p-3.5 sm:px-6 sm:py-4 rounded-2xl border border-purple-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 w-full min-w-0 max-w-full">
        {/* Título e ícono */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-purple-100/80 text-purple-700 flex items-center justify-center shrink-0 shadow-2xs">
              <Calendar className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-800 tracking-tight">
                Horario Escolar Interactivo
              </h3>
              <p className="text-[11px] text-purple-700 font-semibold md:hidden">
                Toca o arrastra en cualquier dirección para explorar
              </p>
            </div>
          </div>

          {/* Botón Nueva Clase en móvil */}
          <button
            type="button"
            onClick={() => handleOpenCreateModal(1, firstClassSlot)}
            className="md:hidden h-8.5 inline-flex items-center justify-center gap-1 px-3 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 active:scale-98 transition-all shadow-xs cursor-pointer shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Clase</span>
          </button>
        </div>

        {/* Controles responsivos */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
          {/* Selector de curso */}
          <div className="flex items-center gap-1.5 flex-1 min-w-[170px] sm:flex-initial">
            <span className="text-xs font-semibold text-slate-500 shrink-0">Curso:</span>
            <select
              id="course-select"
              value={selectedCourseId}
              onChange={e => setSelectedCourseId(e.target.value)}
              className="w-full sm:w-auto h-8.5 sm:h-9 px-2.5 sm:px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 cursor-pointer transition-colors shadow-2xs"
            >
              {grades.map(g => (
                <option key={g.id} value={g.id}>
                  {g.name} {g.salon ? `· Salón: ${g.salon}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Hora de Inicio */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500 shrink-0 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-purple-600" />
              <span className="hidden sm:inline">Hora de inicio:</span>
              <span className="sm:hidden">Inicio:</span>
            </span>
            <select
              id="start-hour-select"
              value={startHour}
              onChange={e => handleChangeStartHour(e.target.value)}
              className="h-8.5 sm:h-9 px-2 sm:px-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100/80 text-xs font-semibold text-purple-950 focus:outline-hidden focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 cursor-pointer transition-colors shadow-2xs"
            >
              {START_HOUR_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle Sábado */}
          <button
            type="button"
            onClick={() => setIncludeSaturday(!includeSaturday)}
            className={`h-8.5 sm:h-9 px-2.5 sm:px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-2xs inline-flex items-center justify-center shrink-0 ${
              includeSaturday
                ? 'bg-purple-100 text-purple-800 border-purple-300'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {includeSaturday ? '✓ Con Sáb' : '+ Sábado'}
          </button>

          {/* Botón Nueva Clase en desktop */}
          <button
            type="button"
            onClick={() => handleOpenCreateModal(1, firstClassSlot)}
            className="hidden md:inline-flex h-9 items-center justify-center gap-1.5 px-3.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 active:scale-98 transition-all shadow-xs cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Clase</span>
          </button>
        </div>
      </div>

      {/* Barra de Navegación Rápida por Días para Móvil */}
      <div className="sm:hidden flex items-center justify-between gap-1.5 p-1.5 bg-gradient-to-r from-purple-50 via-white to-purple-50 rounded-2xl border border-purple-100 shadow-2xs w-full min-w-0 max-w-full">
        <button
          type="button"
          onClick={() => scrollDays(-1)}
          className="p-1.5 rounded-xl bg-white text-purple-700 shadow-2xs border border-purple-200/70 hover:bg-purple-50 active:scale-95 transition-all cursor-pointer shrink-0"
          aria-label="Día anterior"
          title="Ver día anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1 overflow-x-auto min-w-0 flex-1 py-0.5 px-1 scrollbar-none">
          {activeDays.map(day => (
            <button
              key={day.id}
              id={`pill-day-${day.id}`}
              type="button"
              onClick={() => scrollToDay(day.id)}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                activeDayView === day.id
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-purple-700 border border-slate-200/70'
              }`}
            >
              {day.name}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => scrollDays(1)}
          className="p-1.5 rounded-xl bg-white text-purple-700 shadow-2xs border border-purple-200/70 hover:bg-purple-50 active:scale-95 transition-all cursor-pointer shrink-0"
          aria-label="Día siguiente"
          title="Ver día siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Indicador de ayuda táctil/desplazamiento para móvil */}
      <div className="sm:hidden flex items-center justify-between px-1 text-[11px] text-slate-500 font-medium w-full min-w-0">
        <span className="flex items-center gap-1 text-purple-700 font-semibold">
          <Move className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
          <span>Desplaza en cualquier dirección</span>
        </span>
        <span className="text-slate-500">
          Día enfocado: <strong className="text-purple-900">{activeDays.find(d => d.id === activeDayView)?.name || 'Lunes'}</strong>
        </span>
      </div>

      {/* Grilla Semanal Dinámica */}
      <div className="bg-white rounded-3xl border border-purple-100 shadow-xs overflow-hidden w-full min-w-0 max-w-full flex flex-col">
        {/* Contenedor con Desplazamiento Bidireccional (X e Y) y Arrastre Fluido */}
        <div
          ref={scrollContainerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onScroll={handleContainerScroll}
          className="relative overflow-x-auto overflow-y-auto max-h-[70vh] sm:max-h-none w-full min-w-0 max-w-full overscroll-contain select-none cursor-grab active:cursor-grabbing"
          style={{
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'thin',
            touchAction: 'pan-x pan-y'
          }}
        >
          <table
            className="border-separate border-spacing-0 table-fixed"
            style={{
              width: includeSaturday ? '890px' : '760px',
              minWidth: includeSaturday ? '890px' : '760px'
            }}
          >
            <colgroup>
              <col style={{ width: '100px' }} />
              {activeDays.map(day => (
                <col key={day.id} style={{ width: includeSaturday ? '131px' : '132px' }} />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs">
                {/* Columna Horario fija arriba y a la izquierda */}
                <th
                  style={{ width: '100px', minWidth: '100px', maxWidth: '100px' }}
                  className="sticky top-0 left-0 z-20 bg-slate-100/95 backdrop-blur-xs py-3 px-2 text-center font-bold uppercase tracking-wider text-slate-500 border-b border-r border-slate-200/80 shadow-[2px_2px_4px_rgba(0,0,0,0.04)]"
                >
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-purple-600" />
                    <span>Horario</span>
                  </div>
                </th>
                {activeDays.map(day => (
                  <th
                    key={day.id}
                    id={`th-day-${day.id}`}
                    style={{
                      width: includeSaturday ? '131px' : '132px',
                      minWidth: includeSaturday ? '131px' : '132px',
                      maxWidth: includeSaturday ? '131px' : '132px'
                    }}
                    className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs py-3 px-2 text-center font-bold uppercase tracking-wider text-slate-700 border-b border-r border-slate-200/80 shadow-[0_2px_4px_rgba(0,0,0,0.04)]"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-xs">{day.name}</span>
                      <span className="text-[10px] text-purple-700 font-semibold sm:hidden">({day.short})</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y-0">
              {timeline.map(slot => {
                // 3. Renderizado de Receso Escolar Flexible
                if (slot.isBreak) {
                  return (
                    <tr key={slot.id} className="bg-amber-50/50 hover:bg-amber-50/70 transition-colors">
                      <td
                        style={{ width: '100px', minWidth: '100px', maxWidth: '100px' }}
                        className="sticky left-0 z-10 py-3 px-2 align-middle bg-amber-100/95 backdrop-blur-xs border-b border-r border-amber-200/80 shadow-[2px_0_4px_rgba(0,0,0,0.04)]"
                      >
                        <div className="flex flex-col items-center justify-center gap-1 text-center">
                          <span className="font-semibold text-xs text-amber-950 tabular-nums">
                            {slot.startTime} - {slot.endTime}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full border border-amber-300/80">
                            <Coffee className="w-2.5 h-2.5 text-amber-700" />
                            {slot.durationMinutes} min
                          </span>
                        </div>
                      </td>
                      <td
                        colSpan={activeDays.length}
                        style={{
                          width: includeSaturday ? '790px' : '660px',
                          maxWidth: includeSaturday ? '790px' : '660px'
                        }}
                        className="py-2.5 px-3 align-middle border-b border-r border-amber-200/80 bg-amber-50/40"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2.5 p-2 rounded-2xl bg-white/90 border border-amber-200/70 shadow-2xs max-w-full overflow-hidden">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-xs shadow-2xs shrink-0">
                              <Coffee className="w-3.5 h-3.5 text-amber-700" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-amber-950 truncate">
                                Receso Escolar ({slot.startTime} a {slot.endTime})
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {slot.durationMinutes >= 60
                                  ? 'Receso escolar de hora completa. No habrá clase en esta franja.'
                                  : `La clase siguiente absorbe los ${60 - slot.durationMinutes} min restantes.`}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                if (dragStartRef.current?.hasMoved) return;
                                setBreakModalTargetSlot(slot.slotIndex);
                                setBreakModalDuration(slot.durationMinutes);
                                setIsBreakModalOpen(true);
                              }}
                              className="h-8 px-2.5 rounded-xl text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                              title="Cambiar duración y tiempo del receso a voluntad"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                              <span>Ajustar tiempo</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (dragStartRef.current?.hasMoved) return;
                                handleRemoveBreak(slot.slotIndex);
                              }}
                              className="h-8 w-8 rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
                              title="Quitar receso y restaurar clase de 60 min"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                }

                // Renderizado de Franja de Clase
                return (
                  <tr key={slot.id} className="hover:bg-slate-50/40 transition-colors">
                    {/* Columna de Horario fija a la izquierda */}
                    <td
                      style={{ width: '100px', minWidth: '100px', maxWidth: '100px' }}
                      className="sticky left-0 z-10 py-3.5 px-2 align-middle bg-slate-50/95 backdrop-blur-xs border-b border-r border-slate-200/80 shadow-[2px_0_4px_rgba(0,0,0,0.04)]"
                    >
                      <div className="flex flex-col items-center justify-center gap-1.5 text-center">
                        <span className="font-bold text-xs tracking-tight text-slate-800 tabular-nums select-none">
                          {slot.startTime} - {slot.endTime}
                        </span>

                        {/* Botón para añadir receso */}
                        {!breaks.some(b => b.slotIndex === slot.slotIndex) && (
                          <button
                            type="button"
                            onClick={() => {
                              if (dragStartRef.current?.hasMoved) return;
                              setBreakModalTargetSlot(slot.slotIndex);
                              setBreakModalDuration(20);
                              setIsBreakModalOpen(true);
                            }}
                            className="inline-flex items-center justify-center gap-1 py-0.5 px-2 rounded-full text-[10px] font-medium text-amber-800 bg-amber-50 hover:bg-amber-100/90 border border-amber-200/70 hover:border-amber-300 transition-all cursor-pointer shadow-2xs group"
                            title="Añadir receso escolar a esta hora"
                          >
                            <Coffee className="w-3 h-3 text-amber-600 group-hover:scale-110 transition-transform" />
                            <span>+ Receso</span>
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Celdas por día */}
                    {activeDays.map(day => {
                      // Vinculación por índice de slot
                      const matchingBlocks = courseBlocksWithSlot.filter(b => {
                        if (Number(b.day_of_week) !== day.id) return false;
                        return b.slotIndex === slot.slotIndex;
                      });

                      const hasBlock = matchingBlocks.length > 0;

                      return (
                        <td
                          key={day.id}
                          style={{
                            width: includeSaturday ? '131px' : '132px',
                            minWidth: includeSaturday ? '131px' : '132px',
                            maxWidth: includeSaturday ? '131px' : '132px'
                          }}
                          className="py-2 px-2 align-top border-b border-r border-slate-100 h-28 bg-white hover:bg-slate-50/30 transition-colors"
                        >
                          {hasBlock ? (
                            <div className="space-y-1.5 h-full">
                              {matchingBlocks.map(block => {
                                const subjectObj = subjects.find(s => s.id === block.subject_id);
                                const teacherObj = teachers.find(t => t.id === block.teacher_id);

                                return (
                                  <div
                                    key={block.id}
                                    onClick={() => {
                                      if (dragStartRef.current?.hasMoved) return;
                                      handleOpenViewModal(block);
                                    }}
                                    className="p-2.5 rounded-2xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100/70 hover:border-purple-300 hover:shadow-xs transition-all cursor-pointer text-left space-y-1 group"
                                    title="Haz clic para ver detalles, editar o eliminar"
                                  >
                                    <div className="flex items-center justify-between gap-1">
                                      <span className="font-bold text-xs text-purple-900 group-hover:text-purple-950 truncate">
                                        {subjectObj?.name || 'Materia'}
                                      </span>
                                      <span className="text-[10px] font-mono text-purple-700 font-bold shrink-0">
                                        {slot.startTime}
                                      </span>
                                    </div>

                                    {teacherObj && (
                                      <p className="text-[11px] text-slate-600 truncate flex items-center gap-1">
                                        <User className="w-3 h-3 text-purple-500 shrink-0" />
                                        {teacherObj.name}
                                      </p>
                                    )}

                                    {activeCourse?.salon && (
                                      <p className="text-[10px] text-slate-400 font-medium">
                                        Aula: {activeCourse.salon}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (dragStartRef.current?.hasMoved) return;
                                handleOpenCreateModal(day.id, slot);
                              }}
                              className="w-full h-full min-h-[70px] rounded-2xl border border-dashed border-slate-200 hover:border-purple-300 hover:bg-purple-50/30 transition-all flex flex-col items-center justify-center gap-1 text-slate-300 hover:text-purple-600 cursor-pointer group"
                              title={`Asignar clase el ${day.name} a las ${slot.startTime}`}
                            >
                              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                              <span className="text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                                Asignar
                              </span>
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* 2. Barra inferior: Expansión de franjas (+ Añadir franja y remover última) */}
        <div className="p-3 sm:p-3.5 bg-slate-50/80 border-t border-purple-100/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full min-w-0">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Clock className="w-4 h-4 text-purple-600 shrink-0" />
            <span>
              Jornada escolar de <strong>{totalSlots} franjas</strong> ({timeline[0]?.startTime} a {timeline[timeline.length - 1]?.endTime})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {totalSlots > 1 && (
              <button
                type="button"
                onClick={handleRemoveLastSlot}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                  isLastSlotOccupied
                    ? 'text-amber-800 bg-amber-50 border-amber-300 hover:bg-amber-100'
                    : 'text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100'
                }`}
                title={
                  isLastSlotOccupied
                    ? 'Remover la última franja (contiene clases programadas)'
                    : 'Remover la última franja de la jornada'
                }
              >
                <Minus className="w-3.5 h-3.5 shrink-0" />
                <span>Remover última franja</span>
                {isLastSlotOccupied && (
                  <span
                    className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0"
                    title="Contiene clases programadas"
                  />
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleAddSlot}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir franja (+1 hora)</span>
            </button>
          </div>
        </div>
      </div>

      {/* MODAL 1: INSPECCIONAR BLOQUE EXISTENTE (DETALLE / EDITAR / ELIMINAR) */}
      {viewingBlock && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in duration-150"
          role="presentation"
          onClick={() => setViewingBlock(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="block-detail-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-purple-50/50 px-5 py-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">
                  Detalle de la Clase
                </span>
                <h3 id="block-detail-title" className="text-base font-black text-slate-900 mt-0.5">
                  {subjects.find(s => s.id === viewingBlock.subject_id)?.name || 'Materia'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingBlock(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="space-y-2.5">
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <User className="w-4 h-4 text-purple-600 shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Docente Titular</span>
                    <p className="font-bold text-slate-800">
                      {teachers.find(t => t.id === viewingBlock.teacher_id)?.name || 'Sin docente asignado'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <Clock className="w-4 h-4 text-purple-600 shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Día y Horario</span>
                    <p className="font-bold text-slate-800">
                      {DAYS_CONFIG.find(d => d.id === Number(viewingBlock.day_of_week))?.name} ·{' '}
                      {timeline.find(s => !s.isBreak && s.slotIndex === viewingBlock.slotIndex)?.startTime || viewingBlock.start_time.slice(0, 5)} a{' '}
                      {timeline.find(s => !s.isBreak && s.slotIndex === viewingBlock.slotIndex)?.endTime || viewingBlock.end_time.slice(0, 5)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <Building className="w-4 h-4 text-purple-600 shrink-0" />
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Curso y Salón</span>
                    <p className="font-bold text-slate-800">
                      {activeCourse?.name} {activeCourse?.salon ? `(Aula: ${activeCourse.salon})` : ''}
                    </p>
                  </div>
                </div>

                {viewingBlock.topic && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                      Tema / Observaciones
                    </span>
                    <p className="text-slate-700">{viewingBlock.topic}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Acciones directas: Editar y Eliminar */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => handleDeleteBlock(viewingBlock)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar horario
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setViewingBlock(null)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => handleStartEditFromView(viewingBlock)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-xs cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                  Editar clase
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CREAR O EDITAR BLOQUE (CLASE O RECESO) */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in duration-150"
          role="presentation"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="block-form-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 bg-purple-50/50 px-5 py-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">
                  {editingBlock ? 'Modificar Horario' : 'Programar en Grilla'}
                </span>
                <h3 id="block-form-title" className="text-base font-black text-slate-900 mt-0.5">
                  Curso: {activeCourse?.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-5 space-y-4">
              {/* Selector de Tipo de Bloque: Clase vs Receso */}
              {!editingBlock && (
                <div className="flex rounded-2xl bg-slate-100 p-1 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, blockType: 'class' })}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                      formData.blockType === 'class'
                        ? 'bg-white text-purple-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                    Asignar Clase
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, blockType: 'break' })}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                      formData.blockType === 'break'
                        ? 'bg-white text-amber-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Coffee className="w-3.5 h-3.5 text-amber-600" />
                    Programar Receso
                  </button>
                </div>
              )}

              {/* Si es tipo Receso */}
              {formData.blockType === 'break' ? (
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                    <Coffee className="w-4 h-4 text-amber-600" />
                    <span>Configurar receso escolar para la {formData.slotIndex + 1}ª Franja</span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    El receso se ubicará al inicio de esta hora. La clase inmediatamente posterior absorberá los minutos restantes hasta cerrar la hora en punto.
                  </p>

                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold text-amber-900">
                          Duración del receso:
                        </label>
                        <span className="text-xs font-mono font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md border border-amber-300">
                          {clampedFormBreakDuration} minutos
                        </span>
                      </div>

                      {/* Stepper y entrada de texto libre */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, breakDuration: Math.max(5, clampedFormBreakDuration - 5) });
                          }}
                          className="w-9 h-9 rounded-xl bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold flex items-center justify-center transition-colors cursor-pointer"
                          title="Restar 5 minutos"
                        >
                          -5
                        </button>
                        <div className="relative flex-1">
                          <input
                            type="number"
                            min="5"
                            max="60"
                            step="1"
                            value={formData.breakDuration}
                            onChange={(e) => {
                              const val = e.target.value === '' ? '' : Number(e.target.value);
                              setFormData({ ...formData, breakDuration: val });
                            }}
                            onBlur={() => {
                              const val = Number(formData.breakDuration);
                              if (isNaN(val) || val < 5) setFormData({ ...formData, breakDuration: 5 });
                              else if (val > 60) setFormData({ ...formData, breakDuration: 60 });
                            }}
                            className="w-full text-center font-mono font-black text-sm py-1.5 px-3 rounded-xl border border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none bg-white text-amber-950"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                            min
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, breakDuration: Math.min(60, clampedFormBreakDuration + 5) });
                          }}
                          className="w-9 h-9 rounded-xl bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold flex items-center justify-center transition-colors cursor-pointer"
                          title="Sumar 5 minutos"
                        >
                          +5
                        </button>
                      </div>

                      {/* Slider continuo de 5 a 60 min */}
                      <div className="mt-2.5">
                        <input
                          type="range"
                          min="5"
                          max="60"
                          step="1"
                          value={clampedFormBreakDuration}
                          onChange={(e) => setFormData({ ...formData, breakDuration: Number(e.target.value) })}
                          className="w-full accent-amber-600 cursor-pointer"
                        />
                        <div className="flex justify-between text-[10px] font-bold text-amber-800/60 mt-0.5">
                          <span>5 min</span>
                          <span>15 min</span>
                          <span>30 min</span>
                          <span>45 min</span>
                          <span>60 min</span>
                        </div>
                      </div>
                    </div>

                    {/* Previsualización de horario de receso y clase */}
                    <div className="p-2.5 rounded-xl bg-white border border-amber-200/80 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-900 flex items-center gap-1">
                          <Coffee className="w-3.5 h-3.5 text-amber-600" />
                          Receso:
                        </span>
                        <span className="font-mono font-bold text-amber-800">
                          {formBreakStartFmt} - {formBreakTimeEndFmt} ({clampedFormBreakDuration}m)
                        </span>
                      </div>
                      {60 - clampedFormBreakDuration > 0 ? (
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-purple-900 flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                            Clase restante:
                          </span>
                          <span className="font-mono font-bold text-purple-800">
                            {formBreakTimeEndFmt} - {formBreakEndFmt} ({60 - clampedFormBreakDuration}m)
                          </span>
                        </div>
                      ) : (
                        <p className="text-[11px] text-amber-700 italic">
                          * Receso completo de 60 min (sin clase en esta franja).
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-amber-200/70 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-xs cursor-pointer"
                    >
                      Guardar Receso
                    </button>
                  </div>
                </div>
              ) : (
                /* Si es tipo Clase */
                <>
                  {formError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {/* Banner de colisión en tiempo real */}
                  {collisionAlert && (
                    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 text-xs font-bold text-amber-900 flex items-start gap-2.5 animate-pulse">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-black text-amber-950">Alerta de Colisión en Tiempo Real</p>
                        <p className="font-semibold text-amber-800 mt-0.5 leading-relaxed">
                          {collisionAlert.message}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Selección de Día y Horas */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Día de la semana</label>
                      <select
                        value={formData.dayOfWeek}
                        onChange={e => setFormData({ ...formData, dayOfWeek: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                      >
                        {activeDays.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Hora Inicio</label>
                      <input
                        type="time"
                        required
                        value={formData.startTime}
                        onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Hora Fin</label>
                      <input
                        type="time"
                        required
                        value={formData.endTime}
                        onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  {/* Materia y Docente con filtro de vinculación */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Materia</label>
                      <select
                        required
                        value={formData.subjectId}
                        onChange={e => {
                          const newSubId = e.target.value;
                          const teachesNew = teachers
                            .find(t => t.id === formData.teacherId)
                            ?.subjectIds?.includes(newSubId);
                          setFormData({
                            ...formData,
                            subjectId: newSubId,
                            teacherId: teachesNew ? formData.teacherId : ''
                          });
                        }}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">-- Seleccionar materia --</option>
                        {subjects.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700">
                          Docente (Filtrado por materia)
                        </label>
                        {onNavigateToTeachers && (
                          <button
                            type="button"
                            onClick={onNavigateToTeachers}
                            className="text-[10px] font-bold text-purple-600 hover:underline"
                          >
                            Gestionar materias de docentes →
                          </button>
                        )}
                      </div>

                      <select
                        value={formData.teacherId}
                        onChange={e => setFormData({ ...formData, teacherId: e.target.value })}
                        disabled={!formData.subjectId}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-500 disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        <option value="">
                          {!formData.subjectId
                            ? '-- Primero selecciona una materia --'
                            : availableTeachersForSubject.length === 0
                            ? '-- Sin docentes vinculados a esta materia --'
                            : '-- Seleccionar docente --'}
                        </option>
                        {availableTeachersForSubject.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>

                      {formData.subjectId && availableTeachersForSubject.length === 0 && (
                        <p className="mt-1 text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 font-semibold">
                          ℹ️ Ningún docente tiene vinculada esta materia. Puedes asignarle esta materia a un profesor en la pestaña <strong>Profesores</strong>.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Tema opcional */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Observaciones / Tema (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Álgebra Lineal - Aula de Informática"
                      value={formData.topic}
                      onChange={e => setFormData({ ...formData, topic: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  {/* Botones de acción */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || Boolean(collisionAlert)}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      {isSubmitting ? 'Guardando...' : editingBlock ? 'Guardar Cambios' : 'Asignar Clase'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: MODAL DEDICADO PARA AÑADIR RECESO */}
      {isBreakModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in duration-150"
          role="presentation"
          onClick={() => setIsBreakModalOpen(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-amber-200 overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="break-modal-title"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-amber-100 bg-amber-50/70 px-5 py-4">
              <div className="flex items-center gap-2">
                <Coffee className="w-5 h-5 text-amber-600" />
                <h3 id="break-modal-title" className="text-base font-black text-amber-950">
                  Añadir Receso Escolar
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsBreakModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                El receso se programará en la <strong>{breakModalTargetSlot + 1}ª Franja</strong> ({breakTargetStartFmt} a {breakTargetEndFmt}). La clase inmediatamente siguiente absorberá el tiempo restante hasta la hora en punto para mantener la jornada alineada.
              </p>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800">
                    Duración del receso:
                  </label>
                  <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    {clampedBreakModalDuration} minutos
                  </span>
                </div>

                {/* Controles de entrada libre y ajuste */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBreakModalDuration(Math.max(5, clampedBreakModalDuration - 5))}
                    className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition-colors cursor-pointer shrink-0"
                    title="Restar 5 minutos"
                  >
                    -5
                  </button>

                  <div className="relative flex-1">
                    <input
                      type="number"
                      min="5"
                      max="60"
                      step="1"
                      value={breakModalDuration}
                      onChange={(e) => {
                        const val = e.target.value === '' ? '' : Number(e.target.value);
                        setBreakModalDuration(val);
                      }}
                      onBlur={() => {
                        const val = Number(breakModalDuration);
                        if (isNaN(val) || val < 5) setBreakModalDuration(5);
                        else if (val > 60) setBreakModalDuration(60);
                      }}
                      className="w-full text-center font-mono font-black text-base py-1.5 px-3 rounded-xl border border-amber-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none bg-amber-50/30 text-amber-950"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">
                      min
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setBreakModalDuration(Math.min(60, clampedBreakModalDuration + 5))}
                    className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center transition-colors cursor-pointer shrink-0"
                    title="Sumar 5 minutos"
                  >
                    +5
                  </button>
                </div>

                {/* Control deslizante continuo para elegir cualquier tiempo libremente */}
                <div className="mt-3">
                  <input
                    type="range"
                    min="5"
                    max="60"
                    step="1"
                    value={clampedBreakModalDuration}
                    onChange={(e) => setBreakModalDuration(Number(e.target.value))}
                    className="w-full accent-amber-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-0.5">
                    <span>5 min</span>
                    <span>15 min</span>
                    <span>30 min</span>
                    <span>45 min</span>
                    <span>60 min</span>
                  </div>
                </div>
              </div>

              {/* Selector de horario directo: Hora de inicio y Hora de fin editable */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase font-mono">Inicia</span>
                  <span className="font-mono text-sm font-bold text-slate-800">{breakTargetStartFmt}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                  <span className="text-[10px] font-bold text-amber-800 block uppercase font-mono">Termina</span>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <span className="font-mono text-sm font-black text-amber-900">{breakTargetBreakEndFmt}</span>
                    <input
                      type="time"
                      value={breakTargetBreakEndFmt}
                      min={minutesToTime(breakTargetBaseMin + 5)}
                      max={breakTargetEndFmt}
                      onChange={(e) => {
                        if (!e.target.value) return;
                        const endMin = timeToMinutes(e.target.value);
                        const diff = endMin - breakTargetBaseMin;
                        if (diff >= 5 && diff <= 60) {
                          setBreakModalDuration(diff);
                        }
                      }}
                      className="text-[11px] font-mono font-bold text-amber-900 bg-white border border-amber-300 rounded-md px-1.5 py-0.5 outline-none cursor-pointer"
                      title="Seleccionar hora exacta de finalización"
                    />
                  </div>
                </div>
              </div>

              {/* Resumen dinámico en tiempo real */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-bold text-amber-900">
                    <Coffee className="w-3.5 h-3.5 text-amber-600" />
                    Receso escolar:
                  </span>
                  <span className="font-mono font-bold text-amber-800">
                    {breakTargetStartFmt} - {breakTargetBreakEndFmt} ({clampedBreakModalDuration} min)
                  </span>
                </div>

                {60 - clampedBreakModalDuration > 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-bold text-purple-900">
                      <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                      Clase restante:
                    </span>
                    <span className="font-mono font-bold text-purple-800">
                      {breakTargetBreakEndFmt} - {breakTargetEndFmt} ({60 - clampedBreakModalDuration} min)
                    </span>
                  </div>
                ) : (
                  <p className="text-[11px] text-amber-700 italic">
                    * Receso escolar de hora completa. No habrá clase en esta franja.
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBreakModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSetBreak(breakModalTargetSlot, clampedBreakModalDuration);
                    setIsBreakModalOpen(false);
                    Swal.fire({
                      title: 'Receso guardado',
                      text: `Receso escolar de ${clampedBreakModalDuration} min (${breakTargetStartFmt} a ${breakTargetBreakEndFmt}) programado exitosamente.`,
                      icon: 'success',
                      timer: 1800,
                      showConfirmButton: false
                    });
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-xs cursor-pointer transition-colors"
                >
                  Guardar Receso
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
