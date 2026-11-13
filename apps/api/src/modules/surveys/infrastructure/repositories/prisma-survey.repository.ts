import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import type { SubmitSurveyInput } from '../../application/contracts/submit-survey.input';
import type { SurveyRepositoryPort } from '../../application/ports/survey-repository.port';

@Injectable()
export class PrismaSurveyRepository implements SurveyRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(data: SubmitSurveyInput) {
    return this.prisma.respuestaEncuesta.create({
      data: {
        idEncuesta: data.idEncuesta,
        idTitulado: data.idTitulado,
        condicionLaboral: String(data.condicionLaboral),
        cargo: data.cargo,
        empresa: data.empresa,
        area: data.area,
        modalidad: data.modalidad,
        salarioMensual: data.salarioMensual,
        tiempoInsercion: data.tiempoInsercion,
      },
    });
  }

  // Task 1.6: Reporte de encuestas por carrera paginado y procesado en BD
  async getSurveyReport(params: { careerId: string; page?: number; limit?: number }) {
    const page = params.page && params.page > 0 ? Number(params.page) : 1;
    const limit = params.limit && params.limit > 0 ? Number(params.limit) : 10;
    const skip = (page - 1) * limit;

    // 1. Obtener los IDs de titulados pertenecientes a la carrera del administrador (id_carrera en Titulado)
    const titulados = await this.prisma.titulado.findMany({
      where: {
        id_carrera: params.careerId,
      },
      select: {
        id: true,
      },
    });

    const tituladoIds = titulados.map((t) => t.id);

    const where = {
      idTitulado: {
        in: tituladoIds,
      },
    };

    // 2. Conteo total directamente en PostgreSQL [Mejora 3.1]
    const total = await this.prisma.respuestaEncuesta.count({ where });

    // 3. Consulta paginada de respuestas [Mejora 1.4]
    const data = await this.prisma.respuestaEncuesta.findMany({
      where,
      skip,
      take: limit,
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}