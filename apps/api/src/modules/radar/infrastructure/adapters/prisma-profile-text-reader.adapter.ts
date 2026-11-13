import { Injectable } from '@nestjs/common';
import {
  type ProfileTextReaderPort,
  type ProfileTextSources,
} from '../../application/ports/profile-text-reader.port';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { CURRENT_PROFILE_DESCRIPTION_ORDER } from '../../domain/policies/profile-description-order';

/**
 * Lee los textos del perfil desde las cuatro fuentes definidas por el radar.
 * No reutiliza el módulo de perfil para no acoplar los dos contextos.
 */
@Injectable()
export class PrismaProfileTextReaderAdapter implements ProfileTextReaderPort {
  constructor(private readonly prisma: PrismaService) {}

  async getProfileTexts(tituladoId: string): Promise<ProfileTextSources> {
    const [educations, experiences, certifications, currentDescription] = await Promise.all([
      this.prisma.formacionAcademica.findMany({
        where: { id_titulado: tituladoId },
        select: { titulo: true, institucion: true },
      }),
      this.prisma.experienciaLaboral.findMany({
        where: { id_titulado: tituladoId },
        select: { cargo: true, empresa: true },
      }),
      this.prisma.certificacion.findMany({
        where: { id_titulado: tituladoId },
        select: { nombre: true, entidad_emisora: true },
      }),
      this.prisma.perfilArea.findFirst({
        where: { id_titulado: tituladoId },
        orderBy: CURRENT_PROFILE_DESCRIPTION_ORDER,
        select: { descripcion_profesional: true },
      }),
    ]);

    const texts = [
      ...educations.flatMap(({ titulo, institucion }) => [titulo, institucion]),
      ...experiences.flatMap(({ cargo, empresa }) => [cargo, empresa]),
      ...certifications.flatMap(({ nombre, entidad_emisora }) => [nombre, entidad_emisora]),
      currentDescription?.descripcion_profesional,
    ]
      .filter((text): text is string => typeof text === 'string')
      .map((text) => text.trim())
      .filter((text) => text.length > 0);

    return {
      tituladoId,
      texts,
      hasLaborHistory: experiences.length > 0,
    };
  }
}
