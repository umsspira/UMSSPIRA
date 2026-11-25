
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { scopedApplication } from '../../infrastructure/repositories/prisma-applications.repository';
import { OcrResultsService } from './ocr-results.service';
import { HistoryEventsService } from './history-events.service';
import type { HistoryEvent } from '../../domain/entities/history-event';

const EVENT_TITLES: Record<string, string> = {
  ENVIO: 'Solicitud enviada',
  REENVIO: 'Solicitud corregida y reenviada',
  OCR_ANALISIS: 'Resultado del análisis OCR',
  DICTAMEN: 'Dictamen del administrador',
};

const DECISIONS: Record<string, string> = {
  APROBADA: 'aprobó', APPROVED: 'aprobó',
  OBSERVADA: 'observó', OBSERVED: 'observó',
  RECHAZADA: 'rechazó', REJECTED: 'rechazó',
};
const SUGGESTIONS: Record<string, string> = {
  APROBAR: 'aprobar', OBSERVAR: 'observar', RECHAZAR: 'rechazar',
  REVISION_MANUAL: 'revisión manual',
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
        dictamen_registros: {
          select: {
            id: true, version_dictaminada: true, decision: true,
            justificacion: true, categoria: true, fecha_creacion: true,
            revisor_id: true,
          },
        },
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
    const analyses = await this.ocrResults.analyses(
      actor,
      applicationId,
    );

    const latestAnalysis = analyses[0] ?? null;

    // Conservar el ultimo resultado completado incluso
    // cuando la nueva version este en proceso.
    const latestCompleted =
      analyses.find(
        (analysis) =>
          analysis.status === 'COMPLETADO' &&
          analysis.result !== null,
      ) ?? null;

    // CA-17.2 y CA-17.4: consultar todos los eventos,
    // incluidos los de versiones anteriores.
    const history = await this.historyEvents.getHistory(
      applicationId,
    );

    // Las operaciones ya persisten estas fuentes. Consultarlas también cubre
    // expedientes anteriores a historial_evento sin escribir durante un GET.
    // Una versión o un trabajo en cola no prueban la fecha de un reenvío:
    // pueden nacer al editar o durante una migración.
    const recovered: Array<Omit<HistoryEvent, 'version'> & { version: number | null }> = [];
    if (application.fecha_creacion) {
      recovered.push({
        id: `envio:${application.id}`, id_solicitud: applicationId, version: 1,
        accion: 'ENVIO', tipo_actor: 'TITULADO', actor_id: null,
        detalle: 'Solicitud enviada por primera vez', creado_en: application.fecha_creacion,
      });
    }
    for (const analysis of analyses) {
      if (!analysis.result || !analysis.completedAt) {continue;}
      recovered.push({
        id: `ocr:${analysis.id}`, id_solicitud: applicationId, version: analysis.revision,
        accion: 'OCR_ANALISIS', tipo_actor: 'SISTEMA', actor_id: null,
        detalle: `OCR sugirió ${SUGGESTIONS[analysis.result.suggestion] ?? analysis.result.suggestion}. ${analysis.result.reason}`,
        creado_en: new Date(analysis.completedAt),
      });
    }
    for (const review of application.dictamen_registros) {
      if (!review.fecha_creacion) {continue;}
      const decision = DECISIONS[review.decision ?? ''];
      recovered.push({
        id: `dictamen:${review.id}`, id_solicitud: applicationId,
        version: review.version_dictaminada,
        accion: 'DICTAMEN', tipo_actor: 'ADMINISTRADOR', actor_id: review.revisor_id,
        detalle: [
          decision ? `Administrador ${decision} la solicitud` : `Dictamen registrado${review.decision ? `: ${review.decision}` : ''}`,
          review.categoria, review.justificacion,
        ].filter(Boolean).join('. '),
        creado_en: review.fecha_creacion,
      });
    }
    const recorded = history.map((event) => ({
      ...event,
      accion: event.accion === 'ENVIO' && event.version > 1 ? 'REENVIO' : event.accion,
    }));
    // ENVIO y OCR son únicos por versión. Para dictámenes se compara además
    // la fecha y el autor: puede haber varias decisiones sobre una versión.
    const additional = recovered.filter((event) => !recorded.some((stored) =>
      stored.accion === event.accion && stored.version === event.version &&
      (event.accion !== 'DICTAMEN' || (
        stored.creado_en.getTime() === event.creado_en.getTime() &&
        stored.actor_id === event.actor_id
      )),
    ));

    // El mockup muestra primero el movimiento mas reciente.
    // El segundo criterio evita orden ambiguo ante empates.
    const orderedEvents = [...recorded, ...additional].sort((a, b) => {
      const difference =
        b.creado_en.getTime() - a.creado_en.getTime();

      return difference || b.id.localeCompare(a.id);
    });

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
              isCurrent:
                latestCompleted.revision ===
                application.version_vigente,
              analyzedAt: latestCompleted.completedAt,
              suggestion:
                latestCompleted.result.suggestion,
              reason:
                latestCompleted.result.reason,
              comparedData:
                latestCompleted.result.findings,
              rulesVersion:
                latestCompleted.result.rulesVersion,
            }
          : null,
      },

      eventCount: orderedEvents.length,

      events: orderedEvents.map((event) => ({
        id: event.id,
        version: event.version,
        action: event.accion,
        title:
          EVENT_TITLES[event.accion] ??
          event.accion,
        description: event.detalle,
        actor: {
          type: event.tipo_actor,
          id: event.actor_id,
        },
        occurredAt: event.creado_en.toISOString(),
      })),
    };
  }
}
