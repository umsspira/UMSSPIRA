import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import type { SubmitSurveyInput } from '../../application/contracts/submit-survey.input';
import type {
  SurveyReportResult,
  SurveyRepositoryPort,
} from '../../application/ports/survey-repository.port';

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

  async getSurveyReport(params: {
    careerIds: string[];
    page?: number;
    limit?: number;
  }): Promise<SurveyReportResult> {
    const page = params.page && params.page > 0 ? Number(params.page) : 1;
    const limit = params.limit && params.limit > 0 ? Number(params.limit) : 10;
    const skip = (page - 1) * limit;

    if (params.careerIds.length === 0) {
      return {
        total: 0,
        trabajan: 0,
        noTrabajan: 0,
        porModalidad: {},
        porSalario: {},
        porInsercion: {},
        respuestas: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const titulados = await this.prisma.titulado.findMany({
      where: {
        id_carrera: {
          in: params.careerIds,
        },
      },
      select: {
        id: true,
      },
    });

    const tituladoIds = titulados.map((t) => t.id);

    if (tituladoIds.length === 0) {
      return {
        total: 0,
        trabajan: 0,
        noTrabajan: 0,
        porModalidad: {},
        porSalario: {},
        porInsercion: {},
        respuestas: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
        },
      };
    }

    const where = {
      idTitulado: {
        in: tituladoIds,
      },
    };

    const [
      total,
      condicionGroups,
      modalidadGroups,
      salarioGroups,
      insercionGroups,
      rawRespuestas,
    ] = await Promise.all([
      this.prisma.respuestaEncuesta.count({ where }),
      this.prisma.respuestaEncuesta.groupBy({
        by: ['condicionLaboral'],
        where,
        _count: { _all: true },
      }),
      this.prisma.respuestaEncuesta.groupBy({
        by: ['modalidad'],
        where: { ...where, modalidad: { not: null } },
        _count: { _all: true },
      }),
      this.prisma.respuestaEncuesta.groupBy({
        by: ['salarioMensual'],
        where: { ...where, salarioMensual: { not: null } },
        _count: { _all: true },
      }),
      this.prisma.respuestaEncuesta.groupBy({
        by: ['tiempoInsercion'],
        where: { ...where, tiempoInsercion: { not: null } },
        _count: { _all: true },
      }),
      this.prisma.respuestaEncuesta.findMany({
        where,
        select: {
          id: true,
          condicionLaboral: true,
          cargo: true,
          empresa: true,
          area: true,
          modalidad: true,
          salarioMensual: true,
          tiempoInsercion: true,
          fechaEnvio: true,
        },
        orderBy: {
          fechaEnvio: 'desc',
        },
        skip,
        take: limit,
      }),
    ]);

    let trabajan = 0;
    let noTrabajan = 0;
    for (const group of condicionGroups) {
      const normalized = group.condicionLaboral.trim().toLowerCase();
      if (normalized === 'trabaja' || normalized === 'true') {
        trabajan += group._count._all;
      } else {
        noTrabajan += group._count._all;
      }
    }

    const porModalidad: Record<string, number> = {};
    for (const group of modalidadGroups) {
      if (group.modalidad) {
        porModalidad[group.modalidad] = group._count._all;
      }
    }

    const porSalario: Record<string, number> = {};
    for (const group of salarioGroups) {
      if (group.salarioMensual) {
        porSalario[group.salarioMensual] = group._count._all;
      }
    }

    const porInsercion: Record<string, number> = {};
    for (const group of insercionGroups) {
      if (group.tiempoInsercion) {
        porInsercion[group.tiempoInsercion] = group._count._all;
      }
    }

    const respuestas = rawRespuestas.map((item) => ({
      id: item.id,
      condicionLaboral: item.condicionLaboral,
      cargo: item.cargo,
      empresa: item.empresa,
      area: item.area,
      modalidad: item.modalidad,
      salarioMensual: item.salarioMensual,
      tiempoInsercion: item.tiempoInsercion,
      fechaEnvio: item.fechaEnvio.toISOString(),
    }));

    return {
      total,
      trabajan,
      noTrabajan,
      porModalidad,
      porSalario,
      porInsercion,
      respuestas,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}