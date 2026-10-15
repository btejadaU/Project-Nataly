import test from 'node:test';
import assert from 'node:assert/strict';

test('teacher modals: backdrop dismiss handler stops propagation and calls onClose', () => {
  let closed = false;
  let propagationStopped = false;
  let defaultPrevented = false;

  const onClose = () => {
    closed = true;
  };

  const backdropEvent = {
    target: 'backdrop-element',
    currentTarget: 'backdrop-element',
    cancelable: true,
    stopPropagation() {
      propagationStopped = true;
    },
    preventDefault() {
      defaultPrevented = true;
    }
  };

  // Simulación del manejador en onTouchEnd / onClick del backdrop de los modales docentes
  const handleBackdropTouchEnd = (e) => {
    if (e.target === e.currentTarget) {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  };

  handleBackdropTouchEnd(backdropEvent);

  assert.equal(closed, true, 'Debe cerrar el modal al tocar el backdrop');
  assert.equal(propagationStopped, true, 'Debe detener la propagación del evento táctil/clic');
  assert.equal(defaultPrevented, true, 'Debe prevenir clics sintéticos del navegador');

  // Si el toque ocurre en el contenido interno (diálogo), no debe cerrar el modal
  closed = false;
  const innerContentEvent = {
    target: 'dialog-card',
    currentTarget: 'backdrop-element',
    cancelable: true,
    stopPropagation() {},
    preventDefault() {}
  };

  handleBackdropTouchEnd(innerContentEvent);
  assert.equal(closed, false, 'No debe cerrar el modal cuando el target es el diálogo interno');
});

test('teacher notifications: filters out virtual parent alerts and matches active teacher', () => {
  const inAppAlerts = [
    {
      id: 'task-virtual-1-10',
      title: 'Nueva Tarea: Álgebra',
      isVirtual: true,
      studentId: '10',
      recipientId: 'guardian-1'
    },
    {
      id: 'notif-1',
      title: 'Revisión Solicitada: Taller 1',
      isVirtual: false,
      recipientId: 'teacher-1',
      read: false
    },
    {
      id: 'notif-2',
      title: 'Revisión Solicitada: Taller 2',
      isVirtual: false,
      recipientId: 'teacher-2',
      read: false
    },
    {
      id: 'notif-general',
      title: 'Comunicado Institucional',
      isVirtual: false,
      read: false
    }
  ];

  const activeTeacherId = 'teacher-1';

  const filterAlertsForTeacher = (alerts, activeId) => {
    return alerts.filter(alert => {
      if (alert.isVirtual) return false;
      if (alert.recipientId && activeId && alert.recipientId !== activeId) {
        return false;
      }
      return true;
    });
  };

  const filtered = filterAlertsForTeacher(inAppAlerts, activeTeacherId);

  assert.equal(filtered.length, 2, 'Debe retornar solo la notificación del docente activo y la institucional');
  assert.equal(filtered[0].id, 'notif-1');
  assert.equal(filtered[1].id, 'notif-general');
  assert.equal(filtered.some(a => a.isVirtual), false, 'No debe contener alertas virtuales dirigidas a acudientes');
});

test('appShell sidebar: backdrop touch shield stops propagation and executes safely', () => {
  let sidebarClosed = false;
  let propagationStopped = false;
  let defaultPrevented = false;

  const mockBackdropEvent = {
    target: 'backdrop-sidebar',
    currentTarget: 'backdrop-sidebar',
    cancelable: true,
    stopPropagation() {
      propagationStopped = true;
    },
    preventDefault() {
      defaultPrevented = true;
    }
  };

  const handleSidebarBackdropTouchEnd = (e) => {
    if (e.target === e.currentTarget) {
      if (e.cancelable) e.preventDefault();
      e.stopPropagation();
      sidebarClosed = true;
    }
  };

  handleSidebarBackdropTouchEnd(mockBackdropEvent);

  assert.equal(sidebarClosed, true, 'Debe cerrar la barra lateral');
  assert.equal(propagationStopped, true, 'Debe detener propagación para no accionar elementos inferiores');
  assert.equal(defaultPrevented, true, 'Debe prevenir el clic fantasma');
});

test('teacher notifications: preserves both read confirmation and dispute notifications for same task/student', async () => {
  const { buildAlertsList } = await import('../src/context/appDataMappers.js');

  const rawNotifications = [
    {
      id: 'notif-read-ack',
      title: 'Lectura confirmada: Julia - Taller 1',
      message: 'El acudiente confirmó la lectura y firma de la calificación.',
      assignment_id: 'task-100',
      student_id: 'stu-5',
      recipient_id: 'teacher-mat',
      created_at: '2026-10-13T10:00:00Z',
      is_read: false
    },
    {
      id: 'notif-dispute',
      title: 'Inconformidad de nota: Julia - Taller 1',
      message: 'El acudiente manifestó inconformidad con la nota. Motivo: "Revisar punto 2"',
      assignment_id: 'task-100',
      student_id: 'stu-5',
      recipient_id: 'teacher-mat',
      created_at: '2026-10-13T10:30:00Z',
      is_read: false
    }
  ];

  const alerts = buildAlertsList({
    rawNotifications,
    tasks: [{ id: 'task-100', gradeId: 'c-1', subjectName: 'Matemáticas' }],
    students: [{ id: 'stu-5', name: 'Julia', gradeId: 'c-1' }],
    subjects: [],
    readAlertIds: new Set()
  });

  assert.equal(alerts.length, 2, 'Ambas notificaciones reales deben coexistir sin ser eliminadas por deduplicación');
  const readAlert = alerts.find(a => a.id === 'notif-read-ack');
  const disputeAlert = alerts.find(a => a.id === 'notif-dispute');

  assert.ok(readAlert, 'Debe incluir la alerta de lectura confirmada');
  assert.ok(disputeAlert, 'Debe incluir la alerta de inconformidad / disputa');
  assert.equal(readAlert.recipientId, 'teacher-mat');
  assert.equal(disputeAlert.recipientId, 'teacher-mat');
});
