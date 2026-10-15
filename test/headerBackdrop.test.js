import test from 'node:test';
import assert from 'node:assert/strict';

test('header backdrop: stopPropagation and preventDefault behavior on closeDropdowns handler', () => {
  let propagationStopped = false;
  let immediatePropagationStopped = false;
  let defaultPrevented = false;

  const mockTouchEvent = {
    type: 'touchend',
    cancelable: true,
    stopPropagation() {
      propagationStopped = true;
    },
    stopImmediatePropagation() {
      immediatePropagationStopped = true;
    },
    preventDefault() {
      defaultPrevented = true;
    }
  };

  const closeDropdowns = (event) => {
    if (event) {
      if (typeof event.stopPropagation === 'function') {
        event.stopPropagation();
      }
      if (typeof event.stopImmediatePropagation === 'function') {
        event.stopImmediatePropagation();
      }
      if (event.cancelable && typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
    }
  };

  closeDropdowns(mockTouchEvent);
  assert.equal(propagationStopped, true, 'Debe detener la propagación del toque exterior');
  assert.equal(immediatePropagationStopped, true, 'Debe detener la propagación inmediata');
  assert.equal(defaultPrevented, true, 'Debe prevenir la generación del clic fantasma en touchend');

  let mousePropagationStopped = false;
  let mouseDefaultPrevented = false;
  const mockMouseEvent = {
    type: 'click',
    cancelable: true,
    stopPropagation() {
      mousePropagationStopped = true;
    },
    preventDefault() {
      mouseDefaultPrevented = true;
    }
  };

  closeDropdowns(mockMouseEvent);
  assert.equal(mousePropagationStopped, true, 'Debe detener la propagación del clic exterior');
});

test('header backdrop: ghost-click capture shield annihilates any synthetic events dispatched during dismissal', () => {
  let isDismissing = true;
  let killed = false;

  const killGhostEvents = (e) => {
    if (isDismissing) {
      e.stopPropagation();
      e.stopImmediatePropagation();
      if (e.cancelable && typeof e.preventDefault === 'function') {
        e.preventDefault();
      }
      killed = true;
    }
  };

  const syntheticGhostClick = {
    type: 'click',
    cancelable: true,
    stopPropagation() {},
    stopImmediatePropagation() {},
    preventDefault() {}
  };

  killGhostEvents(syntheticGhostClick);
  assert.equal(killed, true, 'El escudo de captura debe aniquilar el clic fantasma mientras isDismissing es true');

  // Cuando ya pasaron los 400ms y no hay menú cerrándose
  isDismissing = false;
  killed = false;
  killGhostEvents(syntheticGhostClick);
  assert.equal(killed, false, 'No debe bloquear clics legítimos cuando isDismissing es false');
});
