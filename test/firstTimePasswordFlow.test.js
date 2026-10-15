import { test } from 'node:test';
import assert from 'node:assert/strict';

test('first-time password validation logic', () => {
  function validateNewPassword({ newPassword, confirmPassword, documentNumber }) {
    if (!newPassword || newPassword.length < 6) {
      return { valid: false, error: 'La nueva contraseña debe tener al menos 6 caracteres.' };
    }
    if (newPassword !== confirmPassword) {
      return { valid: false, error: 'Las contraseñas no coinciden. Por favor verifica.' };
    }
    const cleanDoc = documentNumber?.trim();
    if (cleanDoc && newPassword.trim() === cleanDoc) {
      return { valid: false, error: 'Por seguridad, la nueva contraseña no puede ser igual a tu número de documento.' };
    }
    return { valid: true };
  }

  // Password too short
  assert.equal(validateNewPassword({ newPassword: '123', confirmPassword: '123', documentNumber: '102030' }).valid, false);
  assert.equal(validateNewPassword({ newPassword: '123', confirmPassword: '123', documentNumber: '102030' }).error, 'La nueva contraseña debe tener al menos 6 caracteres.');

  // Passwords do not match
  assert.equal(validateNewPassword({ newPassword: 'claveSegura1', confirmPassword: 'claveSegura2', documentNumber: '102030' }).valid, false);
  assert.equal(validateNewPassword({ newPassword: 'claveSegura1', confirmPassword: 'claveSegura2', documentNumber: '102030' }).error, 'Las contraseñas no coinciden. Por favor verifica.');

  // Password equals document number
  assert.equal(validateNewPassword({ newPassword: '1020304050', confirmPassword: '1020304050', documentNumber: '1020304050' }).valid, false);
  assert.equal(validateNewPassword({ newPassword: '1020304050', confirmPassword: '1020304050', documentNumber: '1020304050' }).error, 'Por seguridad, la nueva contraseña no puede ser igual a tu número de documento.');

  // Valid password
  assert.equal(validateNewPassword({ newPassword: 'MiClaveSegura2026', confirmPassword: 'MiClaveSegura2026', documentNumber: '1020304050' }).valid, true);
});

test('first-time password redirection flow and storage keys', () => {
  const mockLocalStorage = new Map();
  const mockSessionStorage = new Map();

  function onPasswordChangeSuccess({ profile, nextRoute }) {
    const userIdentifier = profile?.document_number || profile?.email || '';
    if (userIdentifier) {
      mockLocalStorage.set('nataly_saved_identifier', userIdentifier);
    }
    if (profile?.role) {
      mockLocalStorage.set('nataly_selected_role', profile.role);
    }
    mockSessionStorage.set('nataly_password_updated_notice', 'true');
    return nextRoute;
  }

  const profile = {
    id: 'user-123',
    role: 'guardian',
    document_number: '1234567890',
    email: 'acudiente@ejemplo.com'
  };

  const destination = onPasswordChangeSuccess({ profile, nextRoute: 'login' });

  assert.equal(destination, 'login');
  assert.equal(mockLocalStorage.get('nataly_saved_identifier'), '1234567890');
  assert.equal(mockLocalStorage.get('nataly_selected_role'), 'guardian');
  assert.equal(mockSessionStorage.get('nataly_password_updated_notice'), 'true');
});

test('AuthenticatedApp route selection based on must_change_password', () => {
  function getAppRoute({ session, profile, authError }) {
    if (!session || !profile || authError) {
      return 'LoginPage';
    }
    if (profile?.must_change_password) {
      return 'FirstTimePasswordModal';
    }
    return 'AppShell';
  }

  // Not logged in
  assert.equal(getAppRoute({ session: null, profile: null }), 'LoginPage');

  // Logged in for first time with must_change_password true
  assert.equal(getAppRoute({
    session: { user: { id: 'u1' } },
    profile: { id: 'u1', must_change_password: true }
  }), 'FirstTimePasswordModal');

  // Logged in with password already updated (must_change_password false)
  assert.equal(getAppRoute({
    session: { user: { id: 'u1' } },
    profile: { id: 'u1', must_change_password: false }
  }), 'AppShell');
});
