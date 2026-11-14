import { Inject, Injectable } from '@nestjs/common';
import { HISTORY_EVENTS_PORT, type HistoryEventsPort } from '../ports/history-events.port';
import type { CreateHistoryEventInput, HistoryEvent } from '../../domain/entities/history-event';

@Injectable()
export class HistoryEventsService {
  constructor(
    @Inject(HISTORY_EVENTS_PORT)
    private readonly repository: HistoryEventsPort,
  ) {}

  async logEvent(input: CreateHistoryEventInput): Promise<HistoryEvent> {
    return this.repository.createEvent(input);
  }

  async getHistory(id_solicitud: string): Promise<HistoryEvent[]> {
    return this.repository.getEventsByApplication(id_solicitud);
  }
}