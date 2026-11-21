import type { EventItem } from '@umsspira/shared-types';

export interface QrSummary {
  total: number;
  /** 'offline' = se leyeron los pases guardados en el dispositivo. */
  source: 'server' | 'offline';
}

export interface MessagesSummary {
  unread: number;
}

/**
 * HU18 CA-04: contrato que el inicio usa para obtener datos de otros módulos
 * (pases, eventos, chat). El inicio solo conoce esta interfaz, no su código interno.
 */
export interface HomeSectionsPort {
  loadQrSummary(signal: AbortSignal): Promise<QrSummary>;
  loadEvents(signal: AbortSignal): Promise<EventItem[]>;
  loadUnreadMessages(signal: AbortSignal): Promise<MessagesSummary>;
}