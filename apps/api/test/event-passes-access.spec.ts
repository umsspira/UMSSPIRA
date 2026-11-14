import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';

import { EventPassesController } from '../src/modules/events/http/event-passes.controller';
import { GenerateEventPassService } from '../src/modules/events/application/generate-event-pass.service';
import { ListUserPassesService } from '../src/modules/events/application/list-user-passes.service';
import { AuthenticationGuard } from '../src/shared/http/auth/guards/authentication.guard';
import { PermissionsGuard } from '../src/shared/http/auth/guards/permissions.guard';
import { configureHttp } from '../src/shared/http/configuration/configure-http';
import type { ActorContext } from '../src/shared/security/contexts/actor-context';
import { AccessError } from '../src/shared/security/errors/access-error';
import { AUTHENTICATOR } from '../src/shared/security/ports/authenticator.port';

const titulado: ActorContext = {
  id: randomUUID(),
  email: 'titulado@example.com',
  name: 'Titulado',
  role: 'titulado',
  credentialVersion: 1,
  permissions: [],
  scopes: { graduateId: randomUUID(), companyIds: [], careerIds: [] },
};

const otroTitulado: ActorContext = { ...titulado, id: randomUUID() };
const administrador: ActorContext = {
  ...titulado,
  id: randomUUID(),
  role: 'administrador',
};

describe('Acceso a mis pases QR', () => {
  let app: INestApplication;

  const listar = jest.fn().mockResolvedValue([]);
  const generar = jest.fn();

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      controllers: [EventPassesController],
      providers: [
        {
          provide: ConfigService,
          useValue: new ConfigService({
            CORS_ORIGINS: ['http://localhost:3001'],
          }),
        },
        {
          provide: AUTHENTICATOR,
          useValue: {
            execute: async (token: string) => {
              const actor =
                token === 'titulado' ? titulado
                  : token === 'otro' ? otroTitulado
                    : token === 'admin' ? administrador
                      : null;

              if (!actor) {throw new AccessError('UNAUTHENTICATED');}
              return { actor, sessionId: randomUUID() };
            },
          },
        },
        { provide: ListUserPassesService, useValue: { execute: listar } },
        { provide: GenerateEventPassService, useValue: { execute: generar } },
        { provide: APP_GUARD, useClass: AuthenticationGuard },
        { provide: APP_GUARD, useClass: PermissionsGuard },
      ],
    }).compile();

    app = modulo.createNestApplication();
    app.useLogger(false);
    configureHttp(app);
    await app.init();
  });

  beforeEach(() => {
    listar.mockClear();
    generar.mockClear();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rechaza una solicitud sin sesión', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/registrations/my-passes')
      .expect(401);

    expect(listar).not.toHaveBeenCalled();
  });

  it('rechaza a un usuario que no tiene el rol titulado', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/registrations/my-passes')
      .set('Authorization', 'Bearer admin')
      .expect(403);

    expect(listar).not.toHaveBeenCalled();
  });

  it('consulta con la identidad de la sesión y no con un ID enviado por el cliente', async () => {
    const respuesta = await request(app.getHttpServer())
      .get('/api/v1/registrations/my-passes')
      .set('Authorization', 'Bearer titulado')
      .set('x-user-id', otroTitulado.id)
      .expect(200);

    expect(listar).toHaveBeenCalledWith(titulado.id);
    expect(respuesta.headers['cache-control']).toContain('no-store');
    expect(generar).not.toHaveBeenCalled();
  });
});
