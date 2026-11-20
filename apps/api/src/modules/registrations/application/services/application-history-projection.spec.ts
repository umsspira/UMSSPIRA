import { projectApplicationHistory } from './application-history-projection';
import type { OcrAnalysis } from '@umsspira/shared-types';
import type { HistoryEvent } from '../../domain/entities/history-event';

describe('projectApplicationHistory', () => {
  const date = new Date('2026-11-14T12:00:00Z');
  const base = {
    applicationId: 'app-1',
    submittedAt: date,
    history: [],
    analyses: [],
    reviews: [],
    versions: [],
  };
  const review = {
    id: 'r-1',
    version_dictaminada: 1,
    decision: 'APPROVED',
    revisor_id: 'admin-1',
    fecha_creacion: date,
    justificacion: null,
  };
  const event = (action: string): HistoryEvent => ({
    id: `event-${action}`,
    id_solicitud: 'app-1',
    version: 1,
    accion: action,
    creado_en: date,
    detalle: null,
    tipo_actor: 'SISTEMA',
    actor_id: null,
  });

  it('fusiona fuentes reales e historial parcial sin duplicar acciones', () => {
    const result = projectApplicationHistory({
      ...base,
      reviews: [review],
      history: [event('ENVIO'), event('DICTAMEN')],
    });
    expect(result).toHaveLength(2);
    expect(result.find((item) => item.accion === 'ENVIO')?.id).toBe('event-ENVIO');
    expect(result.find((item) => item.accion === 'DICTAMEN')).toMatchObject({
      id: 'review:r-1',
      title: 'Solicitud aprobada',
      actor_id: 'admin-1',
      detalle: 'Decisión administrativa: APROBADA.',
    });
  });

  it.each([
    ['APPROVED', 'aprobada'],
    ['REJECTED', 'rechazada'],
    ['OBSERVED', 'observada'],
  ])('normaliza el estado %s para identificar el color del dictamen', (decision, label) => {
    const result = projectApplicationHistory({ ...base, reviews: [{ ...review, decision }] });
    expect(result.find((item) => item.accion === 'DICTAMEN')?.title).toBe(`Solicitud ${label}`);
  });

  it('conserva múltiples dictámenes de una versión sin confundirlos con el OCR', () => {
    const analyses = [
      {
        id: 'ocr-1',
        revision: 1,
        status: 'COMPLETADO',
        completedAt: date.toISOString(),
        result: { suggestion: 'OBSERVAR' },
      },
    ] as OcrAnalysis[];
    const result = projectApplicationHistory({
      ...base,
      analyses,
      reviews: [review, { ...review, id: 'r-2', decision: 'REJECTED' }],
    });
    expect(result.filter((item) => item.accion === 'DICTAMEN')).toHaveLength(2);
    expect(result.filter((item) => item.accion === 'OCR_ANALISIS')).toHaveLength(1);
  });

  it('no inventa finalizaciones, fechas de recepción ni reenvíos de snapshots', () => {
    const result = projectApplicationHistory({
      ...base,
      submittedAt: null,
      analyses: [
        { id: 'pending', revision: 2, status: 'PENDIENTE', completedAt: null },
      ] as OcrAnalysis[],
      versions: [{ id: 'v-2', numero_version: 2, created_at: date }],
      reviews: [{ ...review, fecha_creacion: null }],
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ accion: 'VERSION_REGISTRADA', creado_en: date });
  });

  it('conserva los reenvíos explícitos con su fecha y autor', () => {
    const resend = { ...event('REENVIO'), version: 2, tipo_actor: 'TITULADO' };
    expect(projectApplicationHistory({ ...base, history: [resend] })).toContainEqual(resend);
  });
});
