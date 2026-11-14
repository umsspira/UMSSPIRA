import type { ConfigService } from '@nestjs/config';
import { resolveJobPostingsIndex } from '../../shared/infrastructure/search/job-posting-search.config';
import type { ActorContext } from '../../shared/security/contexts/actor-context';
import type { IndexacionVacantesService } from './indexacion-vacantes.service';
import type { PrismaVacanteIndexacionReader } from './prisma-vacante-indexacion.reader';

/**
 * Coordinador interno preparado para HU4/HU7, sin registro ni eventos automaticos.
 * Solo acepta UUID y contexto confiable del servidor, nunca documentos del cliente.
 */
export class VacanteIndexacionCoordinator {
  constructor(
    private readonly reader: PrismaVacanteIndexacionReader,
    private readonly indexador: IndexacionVacantesService,
    config: Pick<ConfigService, 'get'>,
  ) {
    const indice = resolveJobPostingsIndex(
      config.get<unknown>('ELASTICSEARCH_INDEX_JOB_POSTINGS'),
      config.get<unknown>('ELASTICSEARCH_INDEX_VACANTES'),
    );
    if (indexador.indice !== indice) {
      throw new Error(
        'El indexador HU4 no apunta al indice separado configurado.',
      );
    }
  }

  async indexarVacante(
    actor: ActorContext,
    idVacante: string,
    ahora: Date = new Date(),
  ) {
    const vacante = await this.reader.obtenerAutorizada(actor, idVacante);
    // El mapper compartido deriva disponibilidad, cierre y datos de empresa de Prisma.
    return this.indexador.indexarVacante(vacante, ahora);
  }

  async actualizarVacante(
    actor: ActorContext,
    idVacante: string,
    ahora: Date = new Date(),
  ) {
    // Reemplazo completo por el mismo _id: reintentar no duplica documentos.
    return this.indexarVacante(actor, idVacante, ahora);
  }

  async eliminarVacante(actor: ActorContext, idVacante: string) {
    // Autorizar ANTES de eliminar fisicamente la vacante en Prisma.
    // Una vacante ya eliminada necesitara un evento interno autorizado (etapa posterior).
    const vacante = await this.reader.obtenerAutorizada(actor, idVacante);
    return this.indexador.eliminarVacante(vacante.id);
  }
}
