import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import type { SubmitSurveyInput } from '../../application/contracts/submit-survey.input';
import type {
  SurveyAdminInput,
  SurveyAdminPatch,
  SurveyAdminRecord,
} from '../../application/contracts/survey-admin.input';
import type { SurveyRepositoryPort } from '../../application/ports/survey-repository.port';
import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';

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
      // Integración T5.3: la pantalla debe conservar la nueva encuesta en
      // BORRADOR y mostrar este conflicto sin cambiar el estado anterior.
      // T5.2 puede seguir consultando la encuesta publicada existente.
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
}
