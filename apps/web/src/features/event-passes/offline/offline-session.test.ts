import {
  OFFLINE_SESSION_MAX_AGE_DAYS,
  clearPrivateOfflineData,
  clearPendingLogout,
  getOfflineSessionUserId,
  hasPendingLogout,
  markPendingLogout,
  registerValidatedSession,
} from './offline-session';

const DAY = 24 * 60 * 60 * 1000;

function fakeToken(sub: string): string {
  const payload = btoa(JSON.stringify({ sub })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `x.${payload}.y`;
}

describe('offline-session', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.restoreAllMocks();
  });

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

  it('HU08 CA-04: tras clearPrivateOfflineData + markPendingLogout no hay sesión offline', async () => {
    await registerValidatedSession(fakeToken('u1'));
    markPendingLogout();
    await clearPrivateOfflineData();
    expect(getOfflineSessionUserId()).toBeNull();
    expect(hasPendingLogout()).toBe(true);
  });

  it('HU07 CA-03: otra cuenta en el mismo dispositivo invalida la anterior', async () => {
    await registerValidatedSession(fakeToken('u1'));
    await registerValidatedSession(fakeToken('u2'));
    expect(getOfflineSessionUserId()).toBe('u2');
  });

  it('clearPendingLogout permite revalidar tras un logout', async () => {
    await registerValidatedSession(fakeToken('u1'));
    markPendingLogout();
    expect(getOfflineSessionUserId()).toBeNull();
    clearPendingLogout();
    expect(getOfflineSessionUserId()).toBe('u1');
  });
});