import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import { PermissionsGuard } from '../../../../shared/http/auth/guards/permissions.guard';
import { GetApplicationHistoryController } from '../../http/controllers/get-application-history.controller';

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
      select: expect.objectContaining({ id: true, version_vigente: true }),
    });

    expect(ocrResults.analyses).not.toHaveBeenCalled();
    expect(historyEvents.getHistory).not.toHaveBeenCalled();
  });

  it('conserva el OCR anterior durante un nuevo analisis', async () => {
    prisma.solicitud.findFirst.mockResolvedValue({
      id: 'application-1',
      version_vigente: 2,
      fecha_creacion: null,
      dictamen_registros: [],
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
      fecha_creacion: null,
      dictamen_registros: [],
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
      fecha_creacion: null,
      dictamen_registros: [],
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
  const submittedAt = new Date('2026-10-04T12:30:00Z');
  const reviewedAt = new Date('2026-10-05T12:30:00Z');
  const persistedReview = {
    id: 'review-1', version_dictaminada: 1, decision: 'OBSERVADA',
    revisor_id: 'admin-1', categoria: 'Documento ilegible', justificacion: 'Adjunte una copia legible',
    fecha_creacion: reviewedAt,
  };

  function persistedApplication(reviews: unknown[] = []) {
    prisma.solicitud.findFirst.mockResolvedValue({
      id: 'application-1', version_vigente: 2, fecha_creacion: submittedAt, dictamen_registros: reviews,
    });
    historyEvents.getHistory.mockResolvedValue([]);
    ocrResults.analyses.mockResolvedValue([]);
  }

  it('recupera el envío inicial aunque historial_evento esté vacío y no escribe al consultar', async () => {
    persistedApplication();
    const first = await service.execute(actor, 'application-1');
    const retry = await service.execute(actor, 'application-1');
    expect(retry).toEqual(first);
    expect(first.events).toEqual([expect.objectContaining({
      id: 'envio:application-1', action: 'ENVIO', version: 1,
      actor: { type: 'TITULADO', id: null }, occurredAt: submittedAt.toISOString(),
    })]);
  });

  it.each(['APROBADA', 'OBSERVADA', 'RECHAZADA'])('recupera el dictamen %s y mantiene el envío', async decision => {
    persistedApplication([{ ...persistedReview, decision }]);
    const result = await service.execute(actor, 'application-1');
    expect(result.events.map(event => event.action)).toEqual(['DICTAMEN', 'ENVIO']);
    expect(result.events[0]).toMatchObject({ version: 1, actor: { type: 'ADMINISTRADOR', id: 'admin-1' },
      occurredAt: reviewedAt.toISOString() });
    expect(result.events[0].description).toContain('Adjunte una copia legible');
  });

  it('combina reenvíos registrados, OCR de todas las versiones y dictámenes independientes', async () => {
    persistedApplication([persistedReview]);
    const ocr = (revision: number) => ({
      id: `ocr-${revision}`, revision, status: 'COMPLETADO',
      createdAt: `2026-10-0${revision + 3}T12:31:00Z`, completedAt: `2026-10-0${revision + 3}T12:32:00Z`,
      result: { suggestion: 'OBSERVAR', reason: 'Posibles diferencias', findings: [], rulesVersion: '1' },
    });
    ocrResults.analyses.mockResolvedValue([ocr(2), ocr(1)]);
    historyEvents.getHistory.mockResolvedValue([{
      id: 'resend', version: 2, accion: 'REENVIO', tipo_actor: 'TITULADO', actor_id: null,
      detalle: 'Corrección enviada', creado_en: new Date('2026-10-05T12:31:00Z'),
    }]);
    const result = await service.execute(actor, 'application-1');
    expect(result.events.map(event => [event.action, event.version])).toEqual([
      ['OCR_ANALISIS', 2], ['REENVIO', 2], ['DICTAMEN', 1], ['OCR_ANALISIS', 1], ['ENVIO', 1],
    ]);
    expect(result.events[0].description).toBe('OCR sugirió observar. Posibles diferencias');
    expect(result.ocr.latestResult?.version).toBe(2);
  });

  it('no duplica movimientos ya registrados ni elimina dictámenes distintos de la misma versión', async () => {
    persistedApplication([persistedReview, { ...persistedReview, id: 'review-2',
      decision: 'APROBADA', fecha_creacion: new Date('2026-10-06T12:30:00Z') }]);
    ocrResults.analyses.mockResolvedValue([{ id: 'ocr-1', revision: 1, status: 'COMPLETADO',
      completedAt: submittedAt.toISOString(), result: { suggestion: 'OBSERVAR', reason: 'Diferencias', findings: [] } }]);
    historyEvents.getHistory.mockResolvedValue([
      { id: 'send', version: 1, accion: 'ENVIO', tipo_actor: 'TITULADO', actor_id: null, creado_en: submittedAt },
      { id: 'ocr', version: 1, accion: 'OCR_ANALISIS', tipo_actor: 'SISTEMA', actor_id: null, creado_en: submittedAt },
      { id: 'review', version: 1, accion: 'DICTAMEN', tipo_actor: 'ADMINISTRADOR', actor_id: 'admin-1', creado_en: reviewedAt },
    ]);
    const first = await service.execute(actor, 'application-1');
    expect(first.eventCount).toBe(4);
    expect(first.events.filter(event => event.action === 'DICTAMEN')).toHaveLength(2);
    expect(await service.execute(actor, 'application-1')).toEqual(first);
  });

  it('no inventa envíos ni fechas a partir de versiones, trabajos pendientes o dictámenes sin fecha', async () => {
    prisma.solicitud.findFirst.mockResolvedValue({ id: 'application-1', version_vigente: 3,
      fecha_creacion: null, dictamen_registros: [{ ...persistedReview, fecha_creacion: null }],
    });
    historyEvents.getHistory.mockResolvedValue([]);
    ocrResults.analyses.mockResolvedValue([{ id: 'ocr-3', revision: 3, status: 'PENDIENTE',
      createdAt: reviewedAt.toISOString(), completedAt: null, result: null }]);
    const result = await service.execute(actor, 'application-1');
    expect(result.events).toEqual([]);
    expect(result.ocr.latestResult).toBeNull();
  });

  it('conserva dictámenes antiguos con fecha pero sin versión conocida', async () => {
    persistedApplication([{ ...persistedReview, version_dictaminada: null }]);
    const result = await service.execute(actor, 'application-1');
    expect(result.events[0]).toMatchObject({ action: 'DICTAMEN', version: null });
  });

  it('ordena de forma estable los eventos con la misma fecha', async () => {
    persistedApplication();
    historyEvents.getHistory.mockResolvedValue(['a', 'z'].map(id => ({
      id, version: 2, accion: 'REENVIO', tipo_actor: 'TITULADO', actor_id: null, creado_en: reviewedAt,
    })));
    const result = await service.execute(actor, 'application-1');
    expect(result.events.map(event => event.id)).toEqual(['z', 'a', 'envio:application-1']);
  });

  it.each([{ permissions: [] }, { permissions: ['solicitudes:read'] }])('el endpoint conserva el permiso solicitudes:read (%j)', ({ permissions }) => {
    const context = {
      getHandler: () => GetApplicationHistoryController.prototype.handle,
      getClass: () => GetApplicationHistoryController,
      switchToHttp: () => ({ getRequest: () => ({ auth: { actor: { ...actor, permissions } } }) }),
    } as unknown as ExecutionContext;
    const guard = new PermissionsGuard(new Reflector());
    if (permissions.length) {expect(guard.canActivate(context)).toBe(true);}
    else {expect(() => guard.canActivate(context)).toThrow(expect.objectContaining({ code: 'FORBIDDEN' }));}
  });

  it('el endpoint rechaza una consulta sin sesión', () => {
    const context = {
      getHandler: () => GetApplicationHistoryController.prototype.handle,
      getClass: () => GetApplicationHistoryController,
      switchToHttp: () => ({ getRequest: () => ({}) }),
    } as unknown as ExecutionContext;
    expect(() => new PermissionsGuard(new Reflector()).canActivate(context))
      .toThrow(expect.objectContaining({ code: 'UNAUTHENTICATED' }));
  });

});
