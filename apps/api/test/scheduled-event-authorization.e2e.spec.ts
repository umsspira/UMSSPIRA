import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';

import { ScheduleEventDraftUseCase } from '../src/modules/events/application/use-cases/schedule-event-draft.use-case';
import { CancelEventScheduleUseCase } from '../src/modules/events/application/use-cases/cancel-event-schedule.use-case';
import { ScheduleEventDraftController } from '../src/modules/events/http/controllers/schedule-event-draft.controller';
import { CancelEventScheduleController } from '../src/modules/events/http/controllers/cancel-event-schedule.controller';
import { AuthenticationGuard } from '../src/shared/http/auth/guards/authentication.guard';
import { PermissionsGuard } from '../src/shared/http/auth/guards/permissions.guard';
import { configureHttp } from '../src/shared/http/configuration/configure-http';
import { AUTHENTICATOR } from '../src/shared/security/ports/authenticator.port';

describe('permisos para programar eventos', () => {
  let app: INestApplication;
  const ownerId = randomUUID();
  const eventId = randomUUID();
  const schedulePath = '/api/v1/events/drafts/' + eventId + '/schedule';
  const cancelPath = schedulePath + '/cancel';

  const event = {
    id: eventId,
    ownerId,
    title: 'Encuentro de titulados',
    description: 'Información del evento',
    startDate: new Date('2027-12-01T14:00:00Z'),
    endDate: new Date('2027-12-01T17:00:00Z'),
    maxCapacity: 50,
    location: 'Campus Central',
    coverId: null,
    status: 'BORRADOR',
    creatorName: 'Administrador',
    createdAt: new Date('2026-11-01T10:00:00Z'),
    scheduledAt: null,
    schedulingStatus: null,
  };

  const schedule = { execute: jest.fn() };
  const cancel = { execute: jest.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [
        ScheduleEventDraftController,
        CancelEventScheduleController,
      ],
      providers: [
        { provide: ScheduleEventDraftUseCase, useValue: schedule },
        { provide: CancelEventScheduleUseCase, useValue: cancel },
        { provide: ConfigService, useValue: new ConfigService({ CORS_ORIGINS: [] }) },
        {
          provide: AUTHENTICATOR,
          useValue: {
            execute: async (token: string) => ({
              actor: {
                id: ownerId,
                permissions: token === 'admin' ? ['eventos:manage'] : [],
              },
              sessionId: randomUUID(),
            }),
          },
        },
        { provide: APP_GUARD, useClass: AuthenticationGuard },
        { provide: APP_GUARD, useClass: PermissionsGuard },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useLogger(false);
    configureHttp(app);
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    schedule.execute.mockResolvedValue(event);
    cancel.execute.mockResolvedValue(event);
  });

  afterAll(async () => {
    await app.close();
  });

  it('rechaza ambas acciones sin sesión o sin permiso', async () => {
    const body = { scheduledAt: new Date(Date.now() + 60_000).toISOString() };

    await request(app.getHttpServer()).patch(schedulePath).send(body).expect(401);
    await request(app.getHttpServer()).patch(cancelPath).expect(401);

    await request(app.getHttpServer())
      .patch(schedulePath)
      .set('Authorization', 'Bearer titulado')
      .send(body)
      .expect(403);

    await request(app.getHttpServer())
      .patch(cancelPath)
      .set('Authorization', 'Bearer titulado')
      .expect(403);

    expect(schedule.execute).not.toHaveBeenCalled();
    expect(cancel.execute).not.toHaveBeenCalled();
  });

  it('permite al administrador enviar una programación', async () => {
    const scheduledAt = new Date(Date.now() + 60_000).toISOString();

    const response = await request(app.getHttpServer())
      .patch(schedulePath)
      .set('Authorization', 'Bearer admin')
      .send({ scheduledAt })
      .expect(200);

    expect(schedule.execute).toHaveBeenCalledWith(
      expect.objectContaining({ id: ownerId }),
      eventId,
      new Date(scheduledAt),
    );
    expect(response.body.data.scheduledAt).toBe(scheduledAt);
    expect(response.body.data.schedulingStatus).toBe('PENDIENTE');
  });

  it('permite al administrador cancelar una programación', async () => {
    await request(app.getHttpServer())
      .patch(cancelPath)
      .set('Authorization', 'Bearer admin')
      .expect(200);

    expect(cancel.execute).toHaveBeenCalledWith(
      expect.objectContaining({ id: ownerId }),
      eventId,
    );
  });

  it('rechaza una fecha con formato inválido', async () => {
    await request(app.getHttpServer())
      .patch(schedulePath)
      .set('Authorization', 'Bearer admin')
      .send({ scheduledAt: 'fecha inválida' })
      .expect(400);

    expect(schedule.execute).not.toHaveBeenCalled();
  });
});
