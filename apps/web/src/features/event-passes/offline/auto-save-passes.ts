import type { EventPassDto } from '@umsspira/shared-types';
import { getOfflineQrPasses, saveOfflineQrPass } from './offline-qr-storage';

const REMOVED_KEY_PREFIX = 'umsspira.offline.qr-removed.';

function readRemoved(userId: string): string[] {
  try {
    const raw = window.localStorage.getItem(REMOVED_KEY_PREFIX + userId);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

/** HU02 CA-07: el usuario quitó este QR del dispositivo; el guardado automático no lo vuelve a guardar. */
export function markPassRemovedFromDevice(userId: string, passId: string): void {
  try {
    const list = new Set(readRemoved(userId));
    list.add(passId);
    window.localStorage.setItem(REMOVED_KEY_PREFIX + userId, JSON.stringify(Array.from(list)));
  } catch {
    // Sin almacenamiento: el pase podría guardarse otra vez, no es grave.
  }
}

/** Si el usuario lo guarda a mano otra vez, deja de estar "quitado". */
export function unmarkPassRemoved(userId: string, passId: string): void {
  try {
    const list = readRemoved(userId).filter((id) => id !== passId);
    window.localStorage.setItem(REMOVED_KEY_PREFIX + userId, JSON.stringify(list));
  } catch {
    // Ignorado.
  }
}

/**
 * Guarda en el dispositivo los pases válidos que cargó la página, para verlos sin Internet.
 * Omite los que ya están guardados, los incompletos y los que el usuario quitó. Devuelve los ids guardados.
 */
export async function autoSaveLoadedPasses(userId: string, passes: EventPassDto[]): Promise<string[]> {
  const removed = new Set(readRemoved(userId));
  const saved = new Set((await getOfflineQrPasses(userId)).map((pass) => pass.id));
  const done: string[] = [];

  for (const pass of passes) {
    const d = pass.eventDetails;
    if (pass.status !== 'ACTIVO' || !pass.isValidForAccess) continue;
    if (!pass.id || saved.has(pass.id) || removed.has(pass.id)) continue;
    if (!pass.userId || pass.userId !== userId) continue;
    if (!pass.qrToken?.trim() || !d?.name?.trim() || !d.userName?.trim() || !d.dateTime?.trim() || !d.location?.trim()) continue;
    try {
      await saveOfflineQrPass({
        id: pass.id,
        userId,
        qrToken: pass.qrToken,
        eventDetails: { name: d.name, userName: d.userName, dateTime: d.dateTime, location: d.location },
      });
      done.push(pass.id);
    } catch (error) {
      console.error('No se pudo guardar el pase automáticamente:', pass.id, error);
    }
  }
  return done;
}
