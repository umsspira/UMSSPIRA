import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { AccreditationCache } from '../../../reports/infrastructure/cache/accreditation-cache';
import type { SubmitSurveyInput } from '../../application/contracts/submit-survey.input';
import type {
  SurveyAdminInput,
  SurveyAdminPatch,
  SurveyAdminRecord,
} from '../../application/contracts/survey-admin.input';
import type {
  ActiveSurvey,
  SurveyReportResult,
  SurveyRepositoryPort,
} from '../../application/ports/survey-repository.port';
import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';

const ACTIVE_SURVEY_STATUSES = ['PUBLICADA'];

@Injectable()
export class PrismaSurveyRepository implements SurveyRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accreditationCache?: AccreditationCache,
  ) {}

  async save(data: SubmitSurveyInput) {
    const saved = await this.prisma.respuestaEncuesta.create({
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

    if (this.accreditationCache) {
      const graduate = await this.prisma.titulado.findUnique({
        where: { id: data.idTitulado },
        select: { id_carrera: true },
      });

      if (graduate?.id_carrera) {
        await this.accreditationCache.invalidateAccreditationDashboardCache(graduate.id_carrera);
      }
    }

    return saved;
  }

  async findActiveSurveyByCareer(
    careerId: string,
    surveyId?: string,
  ): Promise<ActiveSurvey | null> {
    const hoy = new Date(new Date().toLocaleDateString('en-CA', { timeZone: 'America/La_Paz' }));
    return this.prisma.encuesta.findFirst({
      where: {
        id_carrera: careerId,
        ...(surveyId ? { id: surveyId } : {}),
        estado: { in: ACTIVE_SURVEY_STATUSES },
        fecha_inicio: { lte: hoy },
        fecha_fin: { gte: hoy },
      },
      orderBy: { fecha_creacion: 'desc' },
    });
  }

  async findActiveSurveyForGraduate(
    graduateId: string,
    surveyId?: string,
  ): Promise<ActiveSurvey | null> {
    const titulado = await this.prisma.titulado.findUnique({
      where: { id: graduateId },
      select: { id_carrera: true },
    });

    if (!titulado?.id_carrera) {
      return null;
    }

    return this.findActiveSurveyByCareer(titulado.id_carrera, surveyId);
  }

  async listManaged(actorId: string, careerIds: readonly string[]): Promise<SurveyAdminRecord[]> {
    await this.assignment(actorId, careerIds);
    const surveys = await this.prisma.encuesta.findMany({
      where: { id_carrera: { in: [...careerIds] } },
      orderBy: [{ fecha_creacion: 'desc' }, { id: 'asc' }],
    });
    return surveys.map((survey) => this.presentManaged(survey));
  }

  async createManaged(actorId: string, careerIds: readonly string[], input: SurveyAdminInput): Promise<SurveyAdminRecord> {
    const assignment = await this.assignment(actorId, careerIds);
    this.validateDates(input.startDate, input.endDate);
    const survey = await this.prisma.encuesta.create({
      data: {
        id_administrador: assignment.id,
        id_carrera: assignment.id_carrera,
        titulo: input.title,
        fecha_inicio: input.startDate,
        fecha_fin: input.endDate,
        fecha_creacion: new Date(),
        estado: 'BORRADOR',
        formato: input.format ?? 'WEB',
      },
    });
    return this.presentManaged(survey);
  }

  async updateManaged(
    actorId: string,
    careerIds: readonly string[],
    id: string,
    input: SurveyAdminPatch,
  ): Promise<SurveyAdminRecord> {
    await this.assignment(actorId, careerIds);
    const current = await this.prisma.encuesta.findFirst({
      where: { id, id_carrera: { in: [...careerIds] } },
    });
    if (!current) {throw new BusinessRuleError('missing', 'SURVEY_NOT_FOUND', 'Encuesta no encontrada');}
    if (current.estado !== 'BORRADOR') {
      throw new BusinessRuleError('conflict', 'SURVEY_NOT_EDITABLE', 'Solo se pueden editar encuestas en borrador');
    }
    const startDate = input.startDate ?? current.fecha_inicio;
    const endDate = input.endDate ?? current.fecha_fin;
    if (startDate && endDate) {this.validateDates(startDate, endDate);}
    const survey = await this.prisma.encuesta.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { titulo: input.title } : {}),
        ...(input.startDate !== undefined ? { fecha_inicio: input.startDate } : {}),
        ...(input.endDate !== undefined ? { fecha_fin: input.endDate } : {}),
        ...(input.format !== undefined ? { formato: input.format } : {}),
      },
    });
    return this.presentManaged(survey);
  }

  async publishManaged(actorId: string, careerIds: readonly string[], id: string): Promise<SurveyAdminRecord> {
    await this.assignment(actorId, careerIds);
    const current = await this.prisma.encuesta.findFirst({
      where: { id, id_carrera: { in: [...careerIds] } },
    });
    if (!current) {throw new BusinessRuleError('missing', 'SURVEY_NOT_FOUND', 'Encuesta no encontrada');}
    if (!current.fecha_inicio || !current.fecha_fin) {
      throw new BusinessRuleError('invalid', 'SURVEY_DATES_REQUIRED', 'La encuesta requiere fechas');
    }
    const startDate = current.fecha_inicio;
    const endDate = current.fecha_fin;
    this.validateDates(startDate, endDate);
    const survey = await this.prisma.$transaction(async (tx) => {
      const today = new Date();
      const published = await tx.encuesta.findFirst({
        where: {
          id_carrera: current.id_carrera,
          estado: 'PUBLICADA',
          id: { not: id },
          OR: [
            { fecha_inicio: { lte: endDate }, fecha_fin: { gte: startDate } },
            { fecha_inicio: { lte: today }, fecha_fin: { gte: today } },
          ],
        },
        select: { id: true },
      });
      if (published) {
        throw new BusinessRuleError(
          'conflict',
          'SURVEY_ALREADY_PUBLISHED',
          'Ya existe una encuesta publicada y vigente para esta carrera',
        );
      }
      return tx.encuesta.update({ where: { id }, data: { estado: 'PUBLICADA' } });
    });
    return this.presentManaged(survey);
  }

  async unpublishManaged(actorId: string, careerIds: readonly string[], id: string): Promise<SurveyAdminRecord> {
    await this.assignment(actorId, careerIds);
    const survey = await this.prisma.encuesta.findFirst({
      where: { id, id_carrera: { in: [...careerIds] } },
    });
    if (!survey) {throw new BusinessRuleError('missing', 'SURVEY_NOT_FOUND', 'Encuesta no encontrada');}
    return this.presentManaged(
      await this.prisma.encuesta.update({ where: { id }, data: { estado: 'BORRADOR' } }),
    );
  }

  private async assignment(actorId: string, careerIds: readonly string[]) {
    if (!careerIds.length) {
      throw new BusinessRuleError('forbidden', 'SURVEY_CAREER_FORBIDDEN', 'No tienes una carrera asignada');
    }
    const assignment = await this.prisma.administradorDeCarrera.findFirst({
      where: { id_usuario: actorId, estado: 'ACTIVO', id_carrera: { in: [...careerIds] } },
      select: { id: true, id_carrera: true },
    });
    if (!assignment?.id_carrera) {
      throw new BusinessRuleError('forbidden', 'SURVEY_CAREER_FORBIDDEN', 'No tienes una carrera asignada');
    }
    return assignment;
  }

  private validateDates(startDate: Date, endDate: Date): void {
    if (endDate < startDate) {
      throw new BusinessRuleError('invalid', 'SURVEY_INVALID_DATES', 'La fecha de fin no puede ser anterior a la de inicio');
    }
  }

  private presentManaged(survey: {
    id: string;
    titulo: string | null;
    fecha_inicio: Date | null;
    fecha_fin: Date | null;
    estado: string | null;
    formato: string | null;
    fecha_creacion: Date | null;
    id_carrera: string | null;
  }): SurveyAdminRecord {
    return {
      id: survey.id,
      title: survey.titulo,
      startDate: survey.fecha_inicio,
      endDate: survey.fecha_fin,
      status: survey.estado,
      format: survey.formato,
      createdAt: survey.fecha_creacion,
      careerId: survey.id_carrera,
    };
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

    const respuestas = rawRespuestas.map((item) => {
      const normalized = item.condicionLaboral.trim().toLowerCase();
      const condicionLaboral =
        normalized === 'trabaja' || normalized === 'true'
          ? 'Trabaja'
          : 'No trabaja';

      return {
        id: item.id,
        condicionLaboral,
        cargo: item.cargo,
        empresa: item.empresa,
        area: item.area,
        modalidad: item.modalidad,
        salarioMensual: item.salarioMensual,
        tiempoInsercion: item.tiempoInsercion,
        fechaEnvio: item.fechaEnvio.toISOString(),
      };
    });

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
