import { getMyEventPasses } from '@/features/event-passes/event-passes-service';
import { getOfflineQrPasses } from '@/features/event-passes/offline/offline-qr-storage';
import { getOfflineSessionUserId } from '@/features/event-passes/offline/offline-session';
import { ApiClientError } from '@/shared/services/api-client';
import { SessionError } from '@/shared/services/auth-session';
import { getUnreadSummary } from '@/shared/services/chat-conversation.service';
import { getEventCatalog } from '@/shared/services/events-service';

import type { HomeSectionsPort, QrSummary } from './home-sections-port';

async function countSavedPasses(): Promise<number | null> {
  const userId = await getOfflineSessionUserId();
  if (!userId) return null;
  return (await getOfflineQrPasses(userId)).length;
}

async function loadQrSummary(signal: AbortSignal): Promise<QrSummary> {
  const isOnline = typeof navigator === 'undefined' || navigator.onLine;

  if (isOnline) {
    try {
      const passes = await getMyEventPasses(signal);
      if (!Array.isArray(passes)) throw new Error('La respuesta de pases no es válida.');
      return { total: passes.length, source: 'server' };
    } catch (error) {
      // Si el servidor respondió con un error (sesión rechazada, etc.) no se usan los guardados.
      if (signal.aborted || error instanceof ApiClientError || error instanceof SessionError) {
        throw error;
      }
      const saved = await countSavedPasses();
      if (saved === null) throw error;
      return { total: saved, source: 'offline' };
    }
  }

  const saved = await countSavedPasses();
  if (saved === null) throw new Error('No hay pases guardados en este dispositivo.');
  return { total: saved, source: 'offline' };
}

export const homeSectionsAdapter: HomeSectionsPort = {
  loadQrSummary,
  loadEvents: () => getEventCatalog(),
  loadUnreadMessages: async () => {
    const summary = await getUnreadSummary();
    return { unread: summary.total };
  },
};