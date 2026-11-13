import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { ValidateAttendancePassService } from '../src/modules/events/application/validate-attendance-pass.service';
import { ValidateAttendancePassController } from '../src/modules/events/http/controllers/validate-attendance-pass.controller';
import { AuthenticationGuard } from '../src/shared/http/auth/guards/authentication.guard';
import { PermissionsGuard } from '../src/shared/http/auth/guards/permissions.guard';
import { configureHttp } from '../src/shared/http/configuration/configure-http';
import { PrismaService } from '../src/shared/infrastructure/database/prisma.service';
import { AUTHENTICATOR } from '../src/shared/security/ports/authenticator.port';

describe('POST /events/owned/:id/attendance', () => {
  let app: INestApplication;
  const ownerId = randomUUID();
  const eventId = randomUUID();
  const path = '/api/v1/events/owned/' + eventId + '/attendance';
  const tx = { evento: { findFirst: jest.fn() }, paseQr: { findUnique: jest.fn() } };
  const transaction = jest.fn((run) => run(tx));

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ValidateAttendancePassController],
      providers: [
        ValidateAttendancePassService,
        { provide: PrismaService, useValue: { $transaction: transaction } },
        { provide: ConfigService, useValue: new ConfigService({ CORS_ORIGINS: [] }) },
        {
          provide: AUTHENTICATOR,
          useValue: {
            execute: async (token: string) => ({
              actor: { id: ownerId, permissions: token === 'admin' ? ['eventos:manage'] : [] },
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
    tx.evento.findFirst.mockResolvedValue({
      id: eventId,
      estado: 'PUBLICADO',
      fecha_fin: new Date(Date.now() + 60000),
    });
    tx.paseQr.findUnique.mockResolvedValue({
      estado: 'VIGENTE',
      fecha_expiracion: null,
      inscripcion: { id_evento: eventId, id_usuario: randomUUID(), estado: 'CONFIRMADA' },
    });
  });
  afterAll(() => app.close());

  it('confirma solo la validación al recibir un pase vigente', async () => {
    await request(app.getHttpServer())
      .post(path)
      .set('Authorization', 'Bearer admin')
      .send({ qrToken: 'token' })
      .expect(200, { data: { code: 'PASS_VALIDATED', attendanceRecorded: false } });
    expect(tx.evento.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: eventId, id_usuario: ownerId, archivado: false },
      }),
    );
  });

  it('rechaza peticiones sin sesión, sin permiso o con datos ajenos al contrato', async () => {
    await request(app.getHttpServer()).post(path).expect(401);
    await request(app.getHttpServer())
      .post(path)
      .set('Authorization', 'Bearer titulado')
      .expect(403);
    await request(app.getHttpServer())
      .post(path)
      .set('Authorization', 'Bearer admin')
      .send({ qrToken: 'token', eventId })
      .expect(400);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('devuelve el rechazo del servidor cuando el token no existe', async () => {
    tx.paseQr.findUnique.mockResolvedValue(null);
    const response = await request(app.getHttpServer())
      .post(path)
      .set('Authorization', 'Bearer admin')
      .send({ qrToken: 'desconocido' })
      .expect(404);
    expect(response.body.error.code).toBe('PASS_NOT_FOUND');
  });
});
