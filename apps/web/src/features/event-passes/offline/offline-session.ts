import { clearOfflineQrPasses } from './offline-qr-storage';

/** HU07 CA-06/CA-07: días que se puede usar la sesión sin conexión (pendiente de confirmar con el PO). */
export const OFFLINE_SESSION_MAX_AGE_DAYS = 7;

const MAX_AGE_MS = OFFLINE_SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
const VALIDATION_KEY = 'umsspira.offline.session-validation';
const PENDING_LOGOUT_KEY = 'umsspira.offline.pending-logout';
/** Campo del token con el id del usuario. Confirmar en apps/api/.../auth/application/contracts/access-claims.ts */
const USER_ID_CLAIM = 'sub';

interface SessionValidation {
  userId: string;
  validatedAt: number;
}

function readStorage(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage.getItem(key); } catch { return null; }
}

function writeStorage(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(key, value); } catch { /* almacenamiento deshabilitado */ }
}

function removeStorage(key: string): void {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(key); } catch { /* almacenamiento deshabilitado */ }
}

export function getUserIdFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    const value = payload[USER_ID_CLAIM];
    return typeof value === 'string' && value ? value : null;
  } catch {
    return null;
  }
}

function readValidation(): SessionValidation | null {
  const raw = readStorage(VALIDATION_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<SessionValidation>;
    return typeof value.userId === 'string' && typeof value.validatedAt === 'number'
      ? { userId: value.userId, validatedAt: value.validatedAt }
      : null;
  } catch {
    return null;
  }
}

/** Se llama cada vez que el servidor valida la sesión (login o renovación). */
export async function registerValidatedSession(token: string, now = Date.now()): Promise<void> {
  const userId = getUserIdFromToken(token);
  if (!userId) return;

  const previous = readValidation();
  if (previous && previous.userId !== userId) {
    // CA-03: otra cuenta en el mismo dispositivo no ve datos de la anterior.
    await clearPrivateOfflineData();
  }

  writeStorage(VALIDATION_KEY, JSON.stringify({ userId, validatedAt: now }));

  // Tras un inicio de sesión (o cambio de cuenta) las páginas guardadas están vacías: se piden de nuevo al Service Worker
  // para que Eventos, Mis QR y Configuración abran sin conexión sin tener que visitarlas antes.
  if (!previous || previous.userId !== userId) requestOfflineRoutesSync();
}

function requestOfflineRoutesSync(): void {
  try {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    void navigator.serviceWorker.ready
      .then((registration) => registration.active?.postMessage({ type: 'CACHE_OFFLINE_ROUTES' }))
      .catch(() => undefined);
  } catch {
    /* sin Service Worker no hay nada que guardar */
  }
}

export function markPendingLogout(): void {
  writeStorage(PENDING_LOGOUT_KEY, '1');
}

export function hasPendingLogout(): boolean {
  return readStorage(PENDING_LOGOUT_KEY) === '1';
}

export function clearPendingLogout(): void {
  removeStorage(PENDING_LOGOUT_KEY);
}

/** Usuario cuya sesión sigue vigente sin conexión (CA-06), o null si pasaron 7 días o no hay sesión (CA-07). */
export function getOfflineSessionUserId(now = Date.now()): string | null {
  if (hasPendingLogout()) return null;
  const validation = readValidation();
  if (!validation) return null;
  const age = now - validation.validatedAt;
  return age >= 0 && age < MAX_AGE_MS ? validation.userId : null;
}

export function isOfflineSessionValid(now = Date.now()): boolean {
  return getOfflineSessionUserId(now) !== null;
}

/** Borra las páginas del portal guardadas; conserva recursos públicos (CA-04). */
async function clearPrivatePageCaches(): Promise<void> {
  if (typeof caches === 'undefined') return;
  const names = await caches.keys();
  // HU07: las páginas privadas que guarda el Service Worker viven en umsspira-routes-*: se borran completas.
  await Promise.all(names.filter((name) => name.startsWith('umsspira-routes')).map((name) => caches.delete(name)));
  await Promise.all(
    names
      .filter((name) => name.startsWith('umsspira-core-portal') || name.startsWith('umsspira-static'))
      .map(async (name) => {
        const cache = await caches.open(name);
        const requests = await cache.keys();
        await Promise.all(
          requests
            .filter((request) => {
              const path = new URL(request.url).pathname;
              return path === '/portal' || path.startsWith('/portal/');
            })
            .map((request) => cache.delete(request)),
        );
      }),
  );
}

/** HU07: borra la base donde el detalle del pase guarda sus QR (umsspira-event-passes). */
function deleteLegacyPassDatabase(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve();
    try {
      const request = indexedDB.deleteDatabase('umsspira-event-passes');
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });
}

/** CA-02: borra QR, pases, páginas privadas y la marca de validación. Funciona sin conexión. */
export async function clearPrivateOfflineData(): Promise<void> {
  const results = await Promise.allSettled([
    clearOfflineQrPasses(),
    clearPrivatePageCaches(),
    deleteLegacyPassDatabase(),
  ]);
  removeStorage(VALIDATION_KEY);
  results.forEach((result) => {
    if (result.status === 'rejected') {
      console.error('No se pudieron eliminar datos privados guardados localmente:', result.reason);
    }
  });
}
