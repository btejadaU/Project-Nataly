import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  timeToMinutes,
  minutesToTime,
  doTimeRangesOverlap,
  generateScheduleTimeline
} from '../src/utils/scheduleTimeline.js';

describe('scheduleTimeline algorithm and engine', () => {
  it('converts time strings to minutes and back accurately', () => {
    assert.equal(timeToMinutes('07:00'), 420);
    assert.equal(timeToMinutes('08:30'), 510);
    assert.equal(minutesToTime(420), '07:00');
    assert.equal(minutesToTime(510), '08:30');
    assert.equal(minutesToTime(0), '00:00');
  });

  it('generates standard 6 slots of 1 hour starting at 07:00', () => {
    const timeline = generateScheduleTimeline('07:00', 6, []);
    assert.equal(timeline.length, 6);
    assert.deepEqual(
      timeline.map(s => ({ start: s.startTime, end: s.endTime, isBreak: s.isBreak, dur: s.durationMinutes })),
      [
        { start: '07:00', end: '08:00', isBreak: false, dur: 60 },
        { start: '08:00', end: '09:00', isBreak: false, dur: 60 },
        { start: '09:00', end: '10:00', isBreak: false, dur: 60 },
        { start: '10:00', end: '11:00', isBreak: false, dur: 60 },
        { start: '11:00', end: '12:00', isBreak: false, dur: 60 },
        { start: '12:00', end: '13:00', isBreak: false, dur: 60 }
      ]
    );
  });

  it('recalculates in cascade when start hour is changed to 08:00', () => {
    const timeline = generateScheduleTimeline('08:00', 6, []);
    assert.equal(timeline[0].startTime, '08:00');
    assert.equal(timeline[0].endTime, '09:00');
    assert.equal(timeline[5].startTime, '13:00');
    assert.equal(timeline[5].endTime, '14:00');
  });

  it('supports adding extra slots (totalSlots: 8)', () => {
    const timeline = generateScheduleTimeline('07:00', 8, []);
    assert.equal(timeline.length, 8);
    assert.equal(timeline[6].startTime, '13:00');
    assert.equal(timeline[6].endTime, '14:00');
    assert.equal(timeline[7].startTime, '14:00');
    assert.equal(timeline[7].endTime, '15:00');
  });

  it('handles flexible breaks with time absorption keeping round hours', () => {
    // Receso de 15 min en slot 2 (09:00)
    const timeline = generateScheduleTimeline('07:00', 6, [{ slotIndex: 2, duration: 15 }]);
    assert.equal(timeline.length, 7); // 6 clases + 1 receso

    const breakItem = timeline.find(s => s.isBreak);
    assert.ok(breakItem, 'Debe existir un bloque de receso');
    assert.equal(breakItem.startTime, '09:00');
    assert.equal(breakItem.endTime, '09:15');
    assert.equal(breakItem.durationMinutes, 15);

    // La clase en esa misma franja absorbe la diferencia: 09:15 a 10:00 (45 min)
    const slot2Class = timeline.find(s => !s.isBreak && s.slotIndex === 2);
    assert.ok(slot2Class);
    assert.equal(slot2Class.startTime, '09:15');
    assert.equal(slot2Class.endTime, '10:00');
    assert.equal(slot2Class.durationMinutes, 45);

    // Los bloques posteriores continúan en horas cerradas de 60 min
    const slot3Class = timeline.find(s => !s.isBreak && s.slotIndex === 3);
    assert.equal(slot3Class.startTime, '10:00');
    assert.equal(slot3Class.endTime, '11:00');
    assert.equal(slot3Class.durationMinutes, 60);
  });

  it('supports arbitrary break duration at will (e.g. 25 min and 60 min)', () => {
    // Receso personalizado de 25 min
    const timeline25 = generateScheduleTimeline('07:00', 6, [{ slotIndex: 1, duration: 25 }]);
    const break25 = timeline25.find(s => s.isBreak);
    assert.equal(break25.startTime, '08:00');
    assert.equal(break25.endTime, '08:25');
    assert.equal(break25.durationMinutes, 25);
    const class25 = timeline25.find(s => !s.isBreak && s.slotIndex === 1);
    assert.equal(class25.startTime, '08:25');
    assert.equal(class25.endTime, '09:00');
    assert.equal(class25.durationMinutes, 35);

    // Receso completo de 60 min (ej. almuerzo)
    const timeline60 = generateScheduleTimeline('07:00', 6, [{ slotIndex: 3, duration: 60 }]);
    const break60 = timeline60.find(s => s.isBreak);
    assert.equal(break60.startTime, '10:00');
    assert.equal(break60.endTime, '11:00');
    assert.equal(break60.durationMinutes, 60);
    // No debe haber clase absorbida en ese slot
    const classInSlot3 = timeline60.find(s => !s.isBreak && s.slotIndex === 3);
    assert.equal(classInSlot3, undefined);
  });

  it('correctly calculates overlap between time ranges', () => {
    assert.equal(doTimeRangesOverlap('07:00', '08:00', '07:30', '08:30'), true);
    assert.equal(doTimeRangesOverlap('07:00', '08:00', '08:00', '09:00'), false);
    assert.equal(doTimeRangesOverlap('09:15', '10:00', '09:00', '09:15'), false);
  });
});
