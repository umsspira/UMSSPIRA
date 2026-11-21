
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { ApplicationHistoryService } from './application-history.service';

describe('ApplicationHistoryService', () => {
  const actor = {
    id: 'admin-1',
    role: 'administrador',
    permissions: ['solicitudes:read'],
    scopes: {
      careerIds: ['career-1'],
      companyIds: [],
      graduateId: null,
    },
  } as unknown as ActorContext;

  const prisma = {
    solicitud: {
      findFirst: jest.fn(),
    },
  };

  const ocrResults = {
    analyses: jest.fn(),
  };

  const historyEvents = {
    getHistory: jest.fn(),
  };

  let service: ApplicationHistoryService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new ApplicationHistoryService(
      prisma as never,
      ocrResults as never,
      historyEvents as never,
    );
  });

  it('no devuelve datos de otra carrera', async () => {
    prisma.solicitud.findFirst.mockResolvedValue(null);

    await expect(
      service.execute(actor, 'application-1'),
    ).rejects.toMatchObject({
      code: 'APPLICATION_NOT_FOUND',
    });

    expect(prisma.solicitud.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'application-1',
        detalle_solicitud: {
          is: {
            id_carrera: {
              in: ['career-1'],
            },
          },
        },
      },
      select: {
        id: true,
        version_vigente: true,
      },
    });

    expect(ocrResults.analyses).not.toHaveBeenCalled();
    expect(historyEvents.getHistory).not.toHaveBeenCalled();
  });

  it('conserva el OCR anterior durante un nuevo analisis', async () => {
    prisma.solicitud.findFirst.mockResolvedValue({
      id: 'application-1',
      version_vigente: 2,
    });

    ocrResults.analyses.mockResolvedValue([
      {
        id: 'ocr-2',
        revision: 2,
        status: 'PENDIENTE',
        createdAt: '2026-11-16T12:00:00.000Z',
        completedAt: null,
        error: null,
        result: null,
      },
      {
        id: 'ocr-1',
        revision: 1,
        status: 'COMPLETADO',
        createdAt: '2026-11-15T12:00:00.000Z',
        completedAt: '2026-11-15T12:01:00.000Z',
        error: null,
        result: {
          suggestion: 'OBSERVAR',
          reason: 'Hay diferencias en el documento',
          findings: [
            {
              field: 'ci',
              label: 'Cedula de identidad',
              declared: '1234567',
              read: '1234568',
              status: 'POSIBLE_DIFERENCIA',
              evidence: null,
              reason: 'Numeros diferentes',
            },
          ],
          rulesVersion: '1',
        },
      },
    ]);

    historyEvents.getHistory.mockResolvedValue([]);

    const result = await service.execute(
      actor,
      'application-1',
    );

    expect(result.ocr.latestAnalysis?.version).toBe(2);
    expect(result.ocr.latestAnalysis?.status).toBe('PENDIENTE');

    expect(result.ocr.latestResult?.version).toBe(1);
    expect(result.ocr.latestResult?.isCurrent).toBe(false);
    expect(result.ocr.latestResult?.suggestion).toBe('OBSERVAR');
    expect(result.ocr.latestResult?.comparedData).toHaveLength(1);
  });

  it('ordena eventos recientes primero y conserva versiones', async () => {
    prisma.solicitud.findFirst.mockResolvedValue({
      id: 'application-1',
      version_vigente: 2,
    });

    ocrResults.analyses.mockResolvedValue([]);

    // Incluso si llegan desordenados, el servicio
    // devuelve primero el evento mas reciente.
    historyEvents.getHistory.mockResolvedValue([
      {
        id: 'event-1',
        version: 1,
        accion: 'ENVIO',
        tipo_actor: 'TITULADO',
        actor_id: 'user-1',
        detalle: 'Solicitud enviada por primera vez',
        creado_en: new Date('2026-10-04T12:30:00Z'),
      },
      {
        id: 'event-2',
        version: 2,
        accion: 'REENVIO',
        tipo_actor: 'TITULADO',
        actor_id: 'user-1',
        detalle: 'Solicitud corregida y reenviada',
        creado_en: new Date('2026-10-07T14:45:00Z'),
      },
    ]);

    const result = await service.execute(
      actor,
      'application-1',
    );

    expect(result.eventCount).toBe(2);

    expect(result.events.map((event) => event.action)).toEqual([
      'REENVIO',
      'ENVIO',
    ]);

    expect(result.events[0]).toMatchObject({
      version: 2,
      title: 'Solicitud corregida y reenviada',
      actor: {
        type: 'TITULADO',
        id: 'user-1',
      },
      occurredAt: '2026-10-07T14:45:00.000Z',
    });

    expect(result.events[1].version).toBe(1);
  });

  it('mantiene OCR y dictamen como eventos separados', async () => {
    prisma.solicitud.findFirst.mockResolvedValue({
      id: 'application-1',
      version_vigente: 1,
    });

    ocrResults.analyses.mockResolvedValue([]);

    historyEvents.getHistory.mockResolvedValue([
      {
        id: 'event-1',
        version: 1,
        accion: 'OCR_ANALISIS',
        tipo_actor: 'SISTEMA',
        actor_id: null,
        detalle: 'OCR sugirio observar',
        creado_en: new Date('2026-10-05T10:00:00Z'),
      },
      {
        id: 'event-2',
        version: 1,
        accion: 'DICTAMEN',
        tipo_actor: 'ADMINISTRADOR',
        actor_id: 'admin-1',
        detalle: 'Administrador aprobo',
        creado_en: new Date('2026-10-05T11:00:00Z'),
      },
    ]);

    const result = await service.execute(
      actor,
      'application-1',
    );

    expect(result.events).toHaveLength(2);

    expect(result.events[0]).toMatchObject({
      action: 'DICTAMEN',
      actor: {
        type: 'ADMINISTRADOR',
      },
    });

    expect(result.events[1]).toMatchObject({
      action: 'OCR_ANALISIS',
      actor: {
        type: 'SISTEMA',
      },
    });
  });
});
