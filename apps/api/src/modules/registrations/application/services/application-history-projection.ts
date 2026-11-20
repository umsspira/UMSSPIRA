import type { OcrAnalysis } from '@umsspira/shared-types';
import type { HistoryEvent } from '../../domain/entities/history-event';

type TimelineEvent = HistoryEvent & { title?: string };
type Review = {
  id: string;
  version_dictaminada: number | null;
  decision: string | null;
  revisor_id: string | null;
  fecha_creacion: Date | null;
  justificacion: string | null;
};
type Version = { id: string; numero_version: number; created_at: Date };

const decisions: Record<string, string> = {
  APPROVED: 'APROBADA',
  APROBADA: 'APROBADA',
  REJECTED: 'RECHAZADA',
  RECHAZADA: 'RECHAZADA',
  OBSERVED: 'OBSERVADA',
  OBSERVADA: 'OBSERVADA',
};

// Proyección de registros originales: también funciona para expedientes anteriores
// a historial_evento, sin escribir ni reconstruir fechas en la base de datos.
export function projectApplicationHistory(input: {
  applicationId: string;
  submittedAt: Date | null;
  history: HistoryEvent[];
  analyses: OcrAnalysis[];
  reviews: Review[];
  versions: Version[];
}): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const add = (
    id: string,
    version: number,
    action: string,
    date: Date,
    description: string | null,
    actorType: string,
    actorId: string | null = null,
    title?: string,
  ) =>
    events.push({
      id,
      id_solicitud: input.applicationId,
      version,
      accion: action,
      creado_en: date,
      detalle: description,
      tipo_actor: actorType,
      actor_id: actorId,
      title,
    });

  if (input.submittedAt) {
    add(
      `submission:${input.applicationId}`,
      1,
      'ENVIO',
      input.submittedAt,
      'Se recibió la solicitud y su documento de respaldo.',
      'TITULADO',
      null,
      'Solicitud enviada por primera vez',
    );
  }
  for (const analysis of input.analyses) {
    if (!analysis.completedAt || !['COMPLETADO', 'FALLIDO'].includes(analysis.status)) {
      continue;
    }
    add(
      `ocr:${analysis.id}`,
      analysis.revision,
      'OCR_ANALISIS',
      new Date(analysis.completedAt),
      analysis.status === 'COMPLETADO'
        ? `Lectura completada. Sugerencia automática: ${analysis.result?.suggestion ?? 'Sin sugerencia'}.`
        : 'La lectura automática falló; requiere revisión manual.',
      'SISTEMA',
      null,
      analysis.status === 'COMPLETADO'
        ? 'Análisis automático OCR completado'
        : 'Análisis automático OCR fallido',
    );
  }
  for (const review of input.reviews) {
    if (!review.fecha_creacion) {
      continue;
    }
    const decision = decisions[review.decision ?? ''];
    add(
      `review:${review.id}`,
      review.version_dictaminada ?? 1,
      'DICTAMEN',
      review.fecha_creacion,
      `Decisión administrativa: ${decision ?? review.decision ?? 'Sin decisión'}.${review.justificacion ? ` Motivo: ${review.justificacion}` : ''}`,
      'ADMINISTRADOR',
      review.revisor_id,
      decision ? `Solicitud ${decision.toLowerCase()}` : 'Dictamen del administrador',
    );
  }
  // La fecha del snapshot no prueba cuándo se reenvió. No etiquetarla como reenvío.
  for (const version of input.versions) {
    if (version.numero_version <= 1) {
      continue;
    }
    add(
      `version:${version.id}`,
      version.numero_version,
      'VERSION_REGISTRADA',
      version.created_at,
      'Se conservó una versión de los datos o del respaldo del expediente.',
      'SISTEMA',
      null,
      `Versión ${version.numero_version} registrada`,
    );
  }

  // Preferir los eventos explícitos de envío y conservar su autor. Los dictámenes
  // y resultados originales aportan el estado exacto, incluso con historial parcial.
  const key = (event: HistoryEvent) =>
    `${event.accion === 'ENVIO' && event.version > 1 ? 'REENVIO' : event.accion}:${event.version}`;
  const explicitKeys = new Set(input.history.map(key));
  const sourceKeys = new Set(events.filter((event) => event.accion !== 'ENVIO').map(key));
  return [
    ...input.history.filter((event) => !sourceKeys.has(key(event))),
    ...events.filter((event) => event.accion !== 'ENVIO' || !explicitKeys.has(key(event))),
  ].sort((a, b) => b.creado_en.getTime() - a.creado_en.getTime() || b.id.localeCompare(a.id));
}
