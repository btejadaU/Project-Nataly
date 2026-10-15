/**
 * Motor algorítmico de generación de línea de tiempo y franjas horarias escolares
 * para Project Nataly.
 *
 * Soporta jornada dinámica, bloques base de 1 hora, recesos flexibles
 * y absorción de tiempo para mantener las horas en punto cerradas.
 */

export const START_HOUR_OPTIONS = [
  { value: '06:00', label: '06:00 AM' },
  { value: '06:30', label: '06:30 AM' },
  { value: '07:00', label: '07:00 AM (Estándar)' },
  { value: '07:30', label: '07:30 AM' },
  { value: '08:00', label: '08:00 AM' },
  { value: '08:30', label: '08:30 AM' },
  { value: '09:00', label: '09:00 AM' }
];

export const BREAK_DURATIONS = [
  { value: 15, label: '15 minutos' },
  { value: 20, label: '20 minutos' },
  { value: 30, label: '30 minutos' }
];

export function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.slice(0, 5).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(totalMinutes) {
  const norm = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const hours = Math.floor(norm / 60);
  const minutes = norm % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function doTimeRangesOverlap(startA, endA, startB, endB) {
  const sA = timeToMinutes(startA);
  const eA = timeToMinutes(endA);
  const sB = timeToMinutes(startB);
  const eB = timeToMinutes(endB);
  return sA < eB && eA > sB;
}

/**
 * Genera el array ordenado de franjas horarias para la grilla semanal.
 *
 * @param {string} startHour - Hora inicial de la jornada (ej. '07:00')
 * @param {number} totalSlots - Número base de horas/franjas de clase (ej. 6)
 * @param {Array|Object} breaks - Lista o mapa de recesos por índice de franja (ej. [{ slotIndex: 2, duration: 15 }])
 * @returns {Array} timeline - Lista ordenada de franjas horarias y recesos
 */
export function generateScheduleTimeline(startHour = '07:00', totalSlots = 6, breaks = []) {
  const startMinutes = timeToMinutes(startHour);
  const timeline = [];

  // Normalizar breaks a un mapa por slotIndex: { [slotIndex]: durationMinutes }
  const breaksBySlot = {};
  if (Array.isArray(breaks)) {
    for (const b of breaks) {
      if (b && typeof b.slotIndex === 'number') {
        breaksBySlot[b.slotIndex] = Number(b.duration || b.durationMinutes || 20);
      }
    }
  } else if (breaks && typeof breaks === 'object') {
    for (const [key, val] of Object.entries(breaks)) {
      breaksBySlot[Number(key)] = Number(val);
    }
  }

  let classSlotCounter = 1;

  for (let slotIdx = 0; slotIdx < totalSlots; slotIdx++) {
    const baseHourStart = startMinutes + slotIdx * 60;
    const baseHourEnd = baseHourStart + 60;
    const breakDuration = breaksBySlot[slotIdx] ? Number(breaksBySlot[slotIdx]) : 0;

    if (breakDuration >= 60) {
      // 1. Franja completa de receso escolar (ej. 60 min)
      timeline.push({
        id: `break-${slotIdx}`,
        slotIndex: slotIdx,
        isBreak: true,
        startTime: minutesToTime(baseHourStart),
        endTime: minutesToTime(baseHourEnd),
        durationMinutes: 60,
        label: `Receso escolar (60 min)`
      });
      // No se genera franja de clase absorbida en una hora completa de receso
    } else if (breakDuration > 0) {
      // 1. Franja de receso (desde el inicio de la hora hasta el fin del receso)
      const breakStart = baseHourStart;
      const breakEnd = baseHourStart + breakDuration;

      timeline.push({
        id: `break-${slotIdx}`,
        slotIndex: slotIdx,
        isBreak: true,
        startTime: minutesToTime(breakStart),
        endTime: minutesToTime(breakEnd),
        durationMinutes: breakDuration,
        label: `Receso escolar (${breakDuration} min)`
      });

      // 2. Franja de clase absorbida (inicia al terminar el receso y termina en la siguiente hora en punto)
      const classStart = breakEnd;
      const classEnd = baseHourEnd;
      const classDuration = 60 - breakDuration;

      timeline.push({
        id: `slot-${slotIdx}`,
        slotIndex: slotIdx,
        isBreak: false,
        startTime: minutesToTime(classStart),
        endTime: minutesToTime(classEnd),
        durationMinutes: classDuration,
        label: `${classSlotCounter}ª Franja`
      });

      classSlotCounter++;
    } else {
      // Franja estándar completa de 60 minutos
      timeline.push({
        id: `slot-${slotIdx}`,
        slotIndex: slotIdx,
        isBreak: false,
        startTime: minutesToTime(baseHourStart),
        endTime: minutesToTime(baseHourEnd),
        durationMinutes: 60,
        label: `${classSlotCounter}ª Franja`
      });

      classSlotCounter++;
    }
  }

  return timeline;
}
