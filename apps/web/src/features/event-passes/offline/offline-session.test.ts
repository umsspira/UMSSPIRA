
import {
  OFFLINE_SESSION_MAX_AGE_DAYS,
  getOfflineSessionUserId,
  markPendingLogout,
  registerValidatedSession,
} from './offline-session';

const DAY = 24 * 60 * 60 * 1000;

function fakeToken(sub: string): string {
  const payload = btoa(JSON.stringify({ sub })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `x.${payload}.y`;
}

describe('offline-session', () => {
  beforeEach(() => window.localStorage.clear());

  it('permite ver los datos guardados con menos de 7 días', async () => {
    const start = Date.now();
    await registerValidatedSession(fakeToken('u1'), start);
    expect(getOfflineSessionUserId(start + (OFFLINE_SESSION_MAX_AGE_DAYS - 1) * DAY)).toBe('u1');
  });

  it('no los muestra pasados 7 días', async () => {
    const start = Date.now();
    await registerValidatedSession(fakeToken('u1'), start);
    expect(getOfflineSessionUserId(start + (OFFLINE_SESSION_MAX_AGE_DAYS + 1) * DAY)).toBeNull();
  });

  it('no los muestra con un cierre de sesión pendiente', async () => {
    await registerValidatedSession(fakeToken('u1'));
    markPendingLogout();
    expect(getOfflineSessionUserId()).toBeNull();
  });
});

