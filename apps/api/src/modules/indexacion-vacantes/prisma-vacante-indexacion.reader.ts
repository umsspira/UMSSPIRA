import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client';
import type { PrismaService } from '../../shared/infrastructure/database/prisma.service';
import type { ActorContext } from '../../shared/security/contexts/actor-context';
import { AccessError } from '../../shared/security/errors/access-error';
import { VACANTE_INDEXACION_SELECT } from './interfaces/vacante-indexable.interface';

type VacanteParaIndexacion = Prisma.VacanteGetPayload<{
  select: typeof VACANTE_INDEXACION_SELECT;
}>;

/** Lectura interna por UUID. No se registra ni expone mediante HTTP en esta etapa. */
export class PrismaVacanteIndexacionReader {
  constructor(private readonly prisma: Pick<PrismaService, 'vacante'>) {}

  async obtenerAutorizada(
    actor: ActorContext,
    idVacante: string,
  ): Promise<VacanteParaIndexacion> {
    if (!actor) {
      throw new AccessError('UNAUTHENTICATED');
    }
    // Misma capacidad y alcance de empresa que la gestion de requisitos de HU2.
    if (
      !actor.permissions.includes('vacantes:create') ||
      actor.scopes.companyIds.length === 0
    ) {
      throw new AccessError('FORBIDDEN');
    }
    if (
      typeof idVacante !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        idVacante,
      )
    ) {
      throw new BadRequestException(
        'El identificador de la vacante debe ser un UUID.',
      );
    }

    let vacante: VacanteParaIndexacion | null;
    try {
      vacante = await this.prisma.vacante.findFirst({
        where: {
          id: idVacante,
          id_empresa: { in: actor.scopes.companyIds },
        },
        select: VACANTE_INDEXACION_SELECT,
      });
    } catch {
      throw new ServiceUnavailableException(
        'No se pudo consultar la vacante para sincronizar el indice.',
      );
    }
    // No distingue una vacante ajena de una inexistente ni autoriza su borrado.
    if (!vacante) {
      throw new NotFoundException('No se encontro la vacante autorizada.');
    }
    return vacante;
  }
}
