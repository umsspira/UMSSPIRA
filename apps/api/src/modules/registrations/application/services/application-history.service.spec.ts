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
    dictamen: { findMany: jest.fn() },
    solicitudVersion: { findMany: jest.fn() },
    usuario: { findMany: jest.fn() },
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
    prisma.dictamen.findMany.mockResolvedValue([]);
    prisma.solicitudVersion.findMany.mockResolvedValue([]);
    prisma.usuario.findMany.mockResolvedValue([]);

    service = new ApplicationHistoryService(
      prisma as never,
      ocrResults as never,
      historyEvents as never,
    );
  });

  it('no devuelve datos de otra carrera', async () => {
    prisma.solicitud.findFirst.mockResolvedValue(null);

    await expect(service.execute(actor, 'application-1')).rejects.toMatchObject({
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
        fecha_creacion: true,
      },
    });

    expect(ocrResults.analyses).not.toHaveBeenCalled();
    expect(historyEvents.getHistory).not.toHaveBeenCalled();
    expect(prisma.usuario.findMany).not.toHaveBeenCalled();
    expect(prisma.dictamen.findMany).not.toHaveBeenCalled();
    expect(prisma.solicitudVersion.findMany).not.toHaveBeenCalled();
  });

  it('recupera recepción, OCR, versiones y dictámenes aunque historial_evento esté vacío', async () => {
    prisma.solicitud.findFirst.mockResolvedValue({
      id: 'application-1',
      version_vigente: 2,
      fecha_creacion: new Date('2026-11-14T10:00:00Z'),
    });
    historyEvents.getHistory.mockResolvedValue([]);
    ocrResults.analyses.mockResolvedValue([
      {
        id: 'ocr-1',
        revision: 1,
        status: 'COMPLETADO',
        current: false,
        createdAt: '2026-11-14T10:00:00Z',
        completedAt: '2026-11-14T10:02:00Z',
        result: { suggestion: 'OBSERVAR' },
        error: null,
      },
    ]);
    prisma.dictamen.findMany.mockResolvedValue([
      {
        id: 'review-1',
        version_dictaminada: 1,
        decision: 'OBSERVADA',
        revisor_id: 'admin-1',
        fecha_creacion: new Date('2026-11-14T11:00:00Z'),
        justificacion: 'Respaldo ilegible',
      },
    ]);
    prisma.solicitudVersion.findMany.mockResolvedValue([
      {
        id: 'version-2',
        numero_version: 2,
        created_at: new Date('2026-11-15T10:00:00Z'),
      },
    ]);
    prisma.usuario.findMany.mockResolvedValue([
      {
        usuario_id: 'admin-1',
        nombre: 'Revisora',
        correo: 'admin@example.test',
      },
    ]);
    const result = await service.execute(actor, 'application-1');
    expect(result.eventCount).toBe(4);
    expect(result.events.map((event) => event.action)).toEqual([
      'VERSION_REGISTRADA',
      'DICTAMEN',
      'OCR_ANALISIS',
      'ENVIO',
    ]);
    expect(result.events[1]).toMatchObject({
      title: 'Solicitud observada',
      description: expect.stringContaining('Respaldo ilegible'),
      actor: { name: 'Revisora' },
      occurredAt: '2026-11-14T11:00:00.000Z',
    });
    expect(result.events[3].occurredAt).toBe('2026-11-14T10:00:00.000Z');
    for (const query of [prisma.dictamen.findMany, prisma.solicitudVersion.findMany]) {
      expect(query).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id_solicitud: 'application-1' } }),
      );
    }
  });

  it('muestra la recepción como primer movimiento de una solicitud nueva sin OCR', async () => {
    prisma.solicitud.findFirst.mockResolvedValue({
      id: 'application-1',
      version_vigente: 1,
      fecha_creacion: new Date('2026-11-14T10:00:00Z'),
    });
    historyEvents.getHistory.mockResolvedValue([]);
    ocrResults.analyses.mockResolvedValue([]);
    const result = await service.execute(actor, 'application-1');
    expect(result.events).toEqual([
      expect.objectContaining({
        action: 'ENVIO',
        title: 'Solicitud enviada por primera vez',
        version: 1,
        occurredAt: '2026-11-14T10:00:00.000Z',
      }),
    ]);
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

    const result = await service.execute(actor, 'application-1');

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

    const result = await service.execute(actor, 'application-1');

    expect(result.eventCount).toBe(2);

    expect(result.events.map((event) => event.action)).toEqual(['REENVIO', 'ENVIO']);

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
    prisma.usuario.findMany.mockResolvedValue([
      { usuario_id: 'admin-1', nombre: 'Administradora de Sistemas', correo: 'admin@example.test' },
    ]);

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

    const result = await service.execute(actor, 'application-1');

    expect(result.events).toHaveLength(2);

    expect(result.events[0]).toMatchObject({
      action: 'DICTAMEN',
      actor: {
        type: 'ADMINISTRADOR',
        name: 'Administradora de Sistemas',
        email: 'admin@example.test',
      },
    });

    expect(result.events[1]).toMatchObject({
      action: 'OCR_ANALISIS',
      actor: {
        type: 'SISTEMA',
      },
    });
    expect(prisma.usuario.findMany).toHaveBeenCalledWith({
      where: { usuario_id: { in: ['admin-1'] } },
      select: { usuario_id: true, nombre: true, correo: true },
    });
  });
});
