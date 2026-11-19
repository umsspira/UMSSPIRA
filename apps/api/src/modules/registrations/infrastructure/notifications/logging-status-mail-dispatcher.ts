import { Injectable, Logger } from '@nestjs/common';
import type {
  StatusMailDispatcher,
  StatusQueryTarget,
} from '../../application/contracts/request-status.dto';

// Sustituir por la implementación de 18.2. No registra correos ni nombres.
@Injectable()
export class LoggingStatusMailDispatcher implements StatusMailDispatcher {
  private readonly logger = new Logger(LoggingStatusMailDispatcher.name);

  async dispatch(target: StatusQueryTarget): Promise<void> {
    this.logger.log(`Consulta de estado lista para enviar (${target.kind}, ${target.applicationId})`);
  }
}