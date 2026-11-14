import type { CreateHistoryEventInput, HistoryEvent } from '../../domain/entities/history-event';

export const HISTORY_EVENTS_PORT = Symbol('HISTORY_EVENTS_PORT');

export interface HistoryEventsPort {
  createEvent(input: CreateHistoryEventInput): Promise<HistoryEvent>;
  getEventsByApplication(id_solicitud: string): Promise<HistoryEvent[]>;
}