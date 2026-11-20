import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { scopedApplication } from '../../infrastructure/repositories/prisma-applications.repository';
import { OcrResultsService } from './ocr-results.service';
import { HistoryEventsService } from './history-events.service';
import { projectApplicationHistory } from './application-history-projection';

const EVENT_TITLES: Record<string, string> = {
  ENVIO: 'Solicitud enviada',
  REENVIO: 'Solicitud corregida y reenviada',
  OCR_ANALISIS: 'Resultado del análisis OCR',
  DICTAMEN: 'Dictamen del administrador',
};

@Injectable()
export class ApplicationHistoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ocrResults: OcrResultsService,
    private readonly historyEvents: HistoryEventsService,
  ) {}

  async execute(actor: ActorContext, applicationId: string) {
    // CA-17.5: validar permisos por carrera antes de
    // devolver cualquier dato del expediente.
    const application = await this.prisma.solicitud.findFirst({
      where: scopedApplication(actor, applicationId),
      select: {
        id: true,
        version_vigente: true,
        fecha_creacion: true,
      },
    });

    if (!application) {
      throw new BusinessRuleError(
        'missing',
        'APPLICATION_NOT_FOUND',
        'La solicitud no existe o no está a tu cargo',
      );
    }

    // CA-17.1: consultar los resultados OCR existentes.
    // El servicio ya verifica permisos y ordena por
    // revision descendente.
    const analyses = await this.ocrResults.analyses(actor, applicationId);

    const latestAnalysis = analyses[0] ?? null;

    // Conservar el ultimo resultado completado incluso
    // cuando la nueva version este en proceso.
    const latestCompleted =
      analyses.find((analysis) => analysis.status === 'COMPLETADO' && analysis.result !== null) ??
      null;

    // CA-17.2 y CA-17.4: consultar todos los eventos,
    // incluidos los de versiones anteriores.
    const [history, reviews, versions] = await Promise.all([
      this.historyEvents.getHistory(applicationId),
      this.prisma.dictamen.findMany({
        where: { id_solicitud: applicationId },
        select: {
          id: true,
          version_dictaminada: true,
          decision: true,
          revisor_id: true,
          fecha_creacion: true,
          justificacion: true,
        },
      }),
      this.prisma.solicitudVersion.findMany({
        where: { id_solicitud: applicationId },
        select: { id: true, numero_version: true, created_at: true },
      }),
    ]);
    const orderedEvents = projectApplicationHistory({
      applicationId,
      submittedAt: application.fecha_creacion,
      history,
      analyses,
      reviews,
      versions,
    });

    // Solo autores de eventos ya autorizados por el alcance del expediente.
    const administratorIds = [
      ...new Set(
        orderedEvents.flatMap((event) =>
          event.tipo_actor === 'ADMINISTRADOR' && event.actor_id ? [event.actor_id] : [],
        ),
      ),
    ];
    const administrators = administratorIds.length
      ? await this.prisma.usuario.findMany({
          where: { usuario_id: { in: administratorIds } },
          select: { usuario_id: true, nombre: true, correo: true },
        })
      : [];
    const authors = new Map(
      administrators.map((administrator) => [administrator.usuario_id, administrator]),
    );

    return {
      applicationId,
      currentVersion: application.version_vigente,

      ocr: {
        latestAnalysis: latestAnalysis
          ? {
              id: latestAnalysis.id,
              version: latestAnalysis.revision,
              status: latestAnalysis.status,
              startedAt: latestAnalysis.createdAt,
              completedAt: latestAnalysis.completedAt,
              error: latestAnalysis.error,
            }
          : null,

        latestResult: latestCompleted?.result
          ? {
              id: latestCompleted.id,
              version: latestCompleted.revision,
              isCurrent: latestCompleted.revision === application.version_vigente,
              analyzedAt: latestCompleted.completedAt,
              suggestion: latestCompleted.result.suggestion,
              reason: latestCompleted.result.reason,
              comparedData: latestCompleted.result.findings,
              rulesVersion: latestCompleted.result.rulesVersion,
            }
          : null,
      },

      eventCount: orderedEvents.length,

      events: orderedEvents.map((event) => ({
        id: event.id,
        version: event.version,
        action: event.accion,
        title: event.title ?? EVENT_TITLES[event.accion] ?? event.accion,
        description: event.detalle,
        actor: {
          type: event.tipo_actor,
          id: event.actor_id,
          name:
            event.tipo_actor === 'ADMINISTRADOR'
              ? (authors.get(event.actor_id ?? '')?.nombre ?? null)
              : null,
          email:
            event.tipo_actor === 'ADMINISTRADOR'
              ? (authors.get(event.actor_id ?? '')?.correo ?? null)
              : null,
        },
        occurredAt: event.creado_en.toISOString(),
      })),
    };
  }
}
