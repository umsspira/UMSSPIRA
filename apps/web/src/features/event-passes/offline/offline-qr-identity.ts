
const STORAGE_KEY = 'umsspira.offline-qr-user-id';

/**
 * Guarda el identificador del usuario autenticado.
 * Se utiliza únicamente para filtrar los QR almacenados localmente.
 */
export function saveOfflineQrUserId(userId: string): void {
  if (typeof window === 'undefined') return;

  const normalizedUserId = userId.trim();

  if (!normalizedUserId) {
    clearOfflineQrUserId();
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, normalizedUserId);
}

/**
 * Recupera el identificador local del último usuario verificado online.
 */
export function getOfflineQrUserId(): string | null {
  if (typeof window === 'undefined') return null;

  return window.localStorage.getItem(STORAGE_KEY);
}

/**
 * Elimina la identidad local.
 */
export function clearOfflineQrUserId(): void {
  if (typeof window === 'undefined') return;

  window.localStorage.removeItem(STORAGE_KEY);
}
