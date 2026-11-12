import { createHash } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { RATE_LIMITER, type RateLimiter } from '../../../auth/application/ports/rate-limiter.port';
import {
  STATUS_MAIL_DISPATCHER,
  STATUS_QUERY_GENERIC_MESSAGE,
  STATUS_QUERY_READER,
  type StatusMailDispatcher,
  type StatusQueryKind,
  type StatusQueryReader,
  type StatusQueryRecord,
} from '../contracts/request-status.dto';
import {
  STATUS_QUERY_COOLDOWN_MS,
  STATUS_QUERY_EMAIL_LIMIT,
  STATUS_QUERY_ORIGIN_LIMIT,
  STATUS_QUERY_WINDOW_MS,
} from '../../domain/policies/status-query.policy';

function fingerprint(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function kindOf(record: StatusQueryRecord): StatusQueryKind {
  if (record.state === 'aprobada') {
    return record.activated ? 'aprobada_activa' : 'aprobada_por_activar';
  }
  return record.state;
}

// Consulta pública de estado por correo (CA-18.2 a CA-18.7).
// Responde siempre igual: exista o no la solicitud, y se aplique o no el límite.
@Injectable()
export class StatusQueryService {
  private readonly logger = new Logger(StatusQueryService.name);

  constructor(
    @Inject(RATE_LIMITER) private readonly limiter: RateLimiter,
    @Inject(STATUS_QUERY_READER) private readonly reader: StatusQueryReader,
    @Inject(STATUS_MAIL_DISPATCHER) private readonly dispatcher: StatusMailDispatcher,
  ) {}

  async execute(input: { email: string; origin: string }): Promise<{ message: string }> {
    if (await this.withinLimits(input)) {
      // Se procesa aparte para que el tiempo de respuesta no delate si hay solicitud.
      void this.handle(input.email);
    }
    return { message: STATUS_QUERY_GENERIC_MESSAGE };
  }

  async handle(email: string): Promise<void> {
    try {
      const record = await this.reader.findLatestByEmail(email);
      if (!record) {
        this.logger.log('Consulta de estado sin solicitud vinculada');
        return;
      }
      await this.dispatcher.dispatch({
        applicationId: record.applicationId,
        email: record.email,
        fullName: record.fullName,
        kind: kindOf(record),
      });
    } catch (error) {
      const reason = error instanceof Error ? error.name : 'desconocido';
      this.logger.error(`No se pudo procesar la consulta de estado (${reason})`);
    }
  }

  private async withinLimits(input: { email: string; origin: string }): Promise<boolean> {
    try {
      const emailKey = fingerprint(input.email);
      const origin = await this.limiter.consume(
        `status-query:origin:${fingerprint(input.origin)}`,
        STATUS_QUERY_WINDOW_MS,
        STATUS_QUERY_ORIGIN_LIMIT,
      );
      if (!origin.allowed) {return false;}
      const hourly = await this.limiter.consume(
        `status-query:email:${emailKey}`,
        STATUS_QUERY_WINDOW_MS,
        STATUS_QUERY_EMAIL_LIMIT,
      );
      if (!hourly.allowed) {return false;}
      const cooldown = await this.limiter.consume(
        `status-query:cooldown:${emailKey}`,
        STATUS_QUERY_COOLDOWN_MS,
        1,
      );
      return cooldown.allowed;
    } catch {
      // Si el limitador falla no se envía nada, y el usuario sigue viendo la misma respuesta.
      this.logger.error('Fallo el limitador de la consulta de estado');
      return false;
    }
  }
}