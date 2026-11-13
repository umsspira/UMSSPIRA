import type { EventPassDto } from '@umsspira/shared-types';
import { getMyEventPasses } from '../event-passes-service';
import {
  getOfflineQrPasses,
  updateOfflineQrPass,
  type OfflineQrEventDetails,
  type OfflineQrPass,
  type OfflineQrPassChanges,
} from './offline-qr-storage';

/** Texto que debe verse en un pase guardado que ya no es válido (HU03 CA-02). */
export const OFFLINE_PASS_INVALID_MESSAGE = 'Este pase ya no es válido';

export interface OfflineSyncResult {
  /** Momento en que terminó la sincronización. */
  syncedAt: string;
  /** Pases guardados que se revisaron. */
  total: number;
  /** Pases cuyo contenido cambió (fecha, lugar, QR o estado). */
  updated: number;
  /** Pases que ahora ya no son válidos. */
  invalidated: number;
  /** Pases que no se pudieron actualizar (se conserva lo guardado). */
  failed: number;
}

function hasCompleteDetails(
  details: EventPassDto['eventDetails']
): details is OfflineQrEventDetails {
  return Boolean(
    details?.name?.trim() &&
      details.userName?.trim() &&
      details.dateTime?.trim() &&
      details.location?.trim()
  );
}

function isRemotePassValid(remote: EventPassDto | undefined): boolean {
  return Boolean(
    remote &&
      remote.status === 'ACTIVO' &&
      remote.isValidForAccess &&
      remote.qrToken?.trim()
  );
}

function buildChanges(
  saved: OfflineQrPass,
  remote: EventPassDto | undefined,
  syncedAt: string
): OfflineQrPassChanges {
  const remoteDetails = remote?.eventDetails;
  const eventDetails = hasCompleteDetails(remoteDetails)
    ? remoteDetails
    : saved.eventDetails;

  if (remote && isRemotePassValid(remote)) {
    return {
      qrToken: remote.qrToken,
      eventDetails,
      status: 'ACTIVO',
      isValidForAccess: true,
      syncedAt,
    };
  }

  // Pase invalidado, vencido o que ya no existe: el QR deja de ser utilizable.
  return {
    qrToken: '',
    eventDetails,
    status: remote && remote.status !== 'ACTIVO' ? remote.status : 'INVALIDADO',
    isValidForAccess: false,
    syncedAt,
  };
}

function hasContentChanged(saved: OfflineQrPass, changes: OfflineQrPassChanges): boolean {
  return (
    saved.qrToken !== changes.qrToken ||
    (saved.status ?? 'ACTIVO') !== changes.status ||
    JSON.stringify(saved.eventDetails) !== JSON.stringify(changes.eventDetails)
  );
}

/**
 * HU03: actualiza los pases YA guardados con los datos del servidor.
 *
 * - Solo recorre lo que está guardado: lo eliminado sin conexión no se vuelve a guardar (CA-03).
 * - Si la consulta al servidor falla, lanza el error y no toca nada de lo guardado (CA-04).
 * - Si falla la actualización de un pase, conserva ese pase y lo cuenta en `failed` (CA-04).
 */
export async function syncOfflineQrPasses(
  userId: string,
  signal?: AbortSignal
): Promise<OfflineSyncResult> {
  const saved = await getOfflineQrPasses(userId);

  if (saved.length === 0) {
    return {
      syncedAt: new Date().toISOString(),
      total: 0,
      updated: 0,
      invalidated: 0,
      failed: 0,
    };
  }

  const remotePasses = await getMyEventPasses(signal);

  if (!Array.isArray(remotePasses)) {
    throw new Error('La respuesta del servidor no es válida.');
  }

  const remoteById = new Map(remotePasses.map((pass) => [pass.id, pass]));
  const syncedAt = new Date().toISOString();

  let updated = 0;
  let invalidated = 0;
  let failed = 0;

  for (const pass of saved) {
    const changes = buildChanges(pass, remoteById.get(pass.id), syncedAt);

    try {
      const result = await updateOfflineQrPass(pass.id, userId, changes);

      // null = el usuario lo eliminó mientras sincronizábamos: se respeta.
      if (!result) continue;

      if (hasContentChanged(pass, changes)) updated += 1;
      if (changes.isValidForAccess === false) invalidated += 1;
    } catch (error) {
      failed += 1;
      console.error('No se pudo actualizar el pase guardado:', pass.id, error);
    }
  }

  return { syncedAt, total: saved.length, updated, invalidated, failed };
}

/**
 * HU03 CA-06: fecha de los datos guardados. Se usa el pase más antiguo,
 * así la fecha nunca promete datos más recientes de los que hay.
 */
export function getOfflineDataLastUpdate(passes: OfflineQrPass[]): string | null {
  if (passes.length === 0) return null;

  const times = passes
    .map((pass) => new Date(pass.syncedAt ?? pass.savedAt).getTime())
    .filter((time) => !Number.isNaN(time));

  return times.length > 0 ? new Date(Math.min(...times)).toISOString() : null;
}