import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureHttp } from '../src/shared/http/configuration/configure-http';
import { PrismaService } from '../src/shared/infrastructure/database/prisma.service';
import { AUTHENTICATOR } from '../src/shared/security/ports/authenticator.port';
import type { ActorContext } from '../src/shared/security/contexts/actor-context';
import { MENTORSHIP_REQUEST_REPOSITORY } from '../src/modules/mentorship/application/ports/mentorship-request-repository.port';
import type { MyMentorshipRequest } from '../src/modules/mentorship/domain/entities/mentorship-request';
import { BusinessRuleError } from '../src/shared/errors/business-rule-error';

const graduate: ActorContext = {
  id: randomUUID(),
  email: 'titulado@example.com',
  name: 'María Pérez',
  role: 'titulado',
  credentialVersion: 1,
  permissions: ['mentores:self:write'],
  scopes: { graduateId: randomUUID(), companyIds: [], careerIds: [] },
};
const otherGraduate: ActorContext = {
  ...graduate,
  id: randomUUID(),
  email: 'otro@example.com',
  name: 'Otro Titulado',
  scopes: { graduateId: randomUUID(), companyIds: [], careerIds: [] },
};
const adminWithPermission: ActorContext = {
  ...graduate,
  id: randomUUID(),
  role: 'administrador',
  permissions: ['mentores:self:write'],
};
const companyWithPermission: ActorContext = {
  ...graduate,
  id: randomUUID(),
  role: 'empresa',
  permissions: ['mentores:self:write'],
};
const requestId = randomUUID();

const ownRequest: MyMentorshipRequest = {
  id: requestId,
  mentorId: randomUUID(),
  requesterId: graduate.id,
  requesterName: null,
  date: new Date('2026-11-23T00:00:00Z'),
  startTime: new Date('1970-01-01T09:00:00Z'),
  endTime: new Date('1970-01-01T10:00:00Z'),
  message: 'Orientación para mi proyecto',
  status: 'PENDIENTE',
  createdAt: new Date('2026-11-16T00:00:00Z'),
  respondedAt: null,
  updatedAt: new Date('2026-11-16T00:00:00Z'),
  mentorName: 'Ana Quispe',
  mentorPosition: 'Data Scientist',
  mentorCompany: 'Acme',
};

const pageOf = (items: MyMentorshipRequest[], total = items.length) => ({
  items,
  total,
  page: 1,
  pageSize: 20,
  totalPages: total ? Math.ceil(total / 20) : 0,
  counts: {
    TODAS: total,
    PENDIENTE: items.filter((item) => item.status === 'PENDIENTE').length,
    ACEPTADO: items.filter((item) => item.status === 'ACEPTADO').length,
    RECHAZADO: items.filter((item) => item.status === 'RECHAZADO').length,
    CANCELADO: items.filter((item) => item.status === 'CANCELADO').length,
  },
});

describe('Mis solicitudes de mentoría: contrato HTTP y autorización', () => {
  let app: INestApplication;
  const repository = {
    listCreatedByUser: jest.fn(),
    cancelCreated: jest.fn(),
    listReceived: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(MENTORSHIP_REQUEST_REPOSITORY)
      .useValue(repository)
      .overrideProvider(AUTHENTICATOR)
      .useValue({
        execute: async (token: string) => ({
          actor:
            token === 'other'
              ? otherGraduate
              : token === 'admin'
                ? adminWithPermission
                : token === 'company'
                  ? companyWithPermission
                  : token === 'no-permission'
                    ? { ...graduate, permissions: [] }
                    : graduate,
          sessionId: randomUUID(),
        }),
      })
      .compile();
    app = module.createNestApplication();
    app.useLogger(false);
    configureHttp(app);
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    repository.listCreatedByUser.mockResolvedValue(pageOf([ownRequest]));
    repository.cancelCreated.mockResolvedValue({ ...ownRequest, status: 'CANCELADO' });
    repository.listReceived.mockResolvedValue({
      items: [{ ...ownRequest, requesterId: graduate.id, requesterName: 'María Pérez' }],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });
  });
  afterAll(async () => app?.close());

  it('exige sesión para consultar el historial propio', async () => {
    await request(app.getHttpServer()).get('/api/v1/mentorship/my-requests').expect(401);
    expect(repository.listCreatedByUser).not.toHaveBeenCalled();
  });

  it('rechaza a quien no tiene el permiso de mentorías', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/mentorship/my-requests')
      .set('Authorization', 'Bearer no-permission')
      .expect(403);
    expect(repository.listCreatedByUser).not.toHaveBeenCalled();
  });

  it('un administrador o empresa con permiso tampoco puede usar el historial del titulado', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/mentorship/my-requests')
      .set('Authorization', 'Bearer admin')
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/v1/mentorship/my-requests')
      .set('Authorization', 'Bearer company')
      .expect(403);
    expect(repository.listCreatedByUser).not.toHaveBeenCalled();
  });

  it('lista solo el historial del usuario autenticado con presentación pública del mentor', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/mentorship/my-requests')
      .set('Authorization', 'Bearer graduate')
      .expect(200);

    expect(repository.listCreatedByUser).toHaveBeenCalledWith(graduate.id, {
      status: undefined,
      page: 1,
      pageSize: 20,
    });
    expect(response.body).toEqual({
      data: [
        {
          id: requestId,
          mentor: {
            id: ownRequest.mentorId,
            nombre: 'Ana Quispe',
            cargo: 'Data Scientist',
            empresa: 'Acme',
          },
          fecha: '2026-11-23',
          hora_inicio: '09:00',
          hora_fin: '10:00',
          mensaje: 'Orientación para mi proyecto',
          estado: 'PENDIENTE',
          fecha_creacion: '2026-11-16',
          fecha_respuesta: null,
          fecha_actualizacion: '2026-11-16',
        },
      ],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      counts: { TODAS: 1, PENDIENTE: 1, ACEPTADO: 0, RECHAZADO: 0, CANCELADO: 0 },
    });
    expect(JSON.stringify(response.body)).not.toContain(graduate.email);
  });

  it('deriva la identidad del token e ignora cabeceras del cliente', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/mentorship/my-requests')
      .set('Authorization', 'Bearer other')
      .set('x-user-id', graduate.id)
      .expect(200);
    expect(repository.listCreatedByUser).toHaveBeenCalledWith(otherGraduate.id, {
      status: undefined,
      page: 1,
      pageSize: 20,
    });
  });

  it('valida estado y paginación antes de consultar', async () => {
    for (const query of [
      { estado: 'INVALIDO' },
      { page: 0 },
      { pageSize: 21 },
    ]) {
      await request(app.getHttpServer())
        .get('/api/v1/mentorship/my-requests')
        .query(query)
        .set('Authorization', 'Bearer graduate')
        .expect(400);
    }
    expect(repository.listCreatedByUser).not.toHaveBeenCalled();
  });

  it('aplica el filtro de estado opcional', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/mentorship/my-requests?estado=CANCELADO&page=2&pageSize=5')
      .set('Authorization', 'Bearer graduate')
      .expect(200);
    expect(repository.listCreatedByUser).toHaveBeenCalledWith(graduate.id, {
      status: 'CANCELADO',
      page: 2,
      pageSize: 5,
    });
  });

  it('devuelve una lista vacía cuando el titulado no tiene solicitudes', async () => {
    repository.listCreatedByUser.mockResolvedValue(pageOf([], 0));
    const response = await request(app.getHttpServer())
      .get('/api/v1/mentorship/my-requests')
      .set('Authorization', 'Bearer graduate')
      .expect(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.pagination.total).toBe(0);
    expect(response.body.counts).toEqual({
      TODAS: 0,
      PENDIENTE: 0,
      ACEPTADO: 0,
      RECHAZADO: 0,
      CANCELADO: 0,
    });
  });

  it('cancela una solicitud propia pendiente y la presenta como cancelada', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/v1/mentorship/my-requests/${requestId}/cancel`)
      .set('Authorization', 'Bearer graduate')
      .expect(200);

    expect(repository.cancelCreated).toHaveBeenCalledWith(
      graduate.id,
      requestId,
      expect.any(Date),
    );
    expect(response.body.data).toMatchObject({
      id: requestId,
      estado: 'CANCELADO',
      mentor: { nombre: 'Ana Quispe' },
    });
  });

  it('responde 404 cuando la solicitud es ajena o no existe', async () => {
    repository.cancelCreated.mockRejectedValue(
      new BusinessRuleError(
        'missing',
        'SOLICITUD_NO_ENCONTRADA',
        'La solicitud no existe o no te pertenece',
      ),
    );

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/mentorship/my-requests/${requestId}/cancel`)
      .set('Authorization', 'Bearer graduate')
      .expect(404);
    expect(response.body.error.code).toBe('SOLICITUD_NO_ENCONTRADA');
  });

  it('responde 409 en la segunda cancelación o si ya no está pendiente', async () => {
    repository.cancelCreated.mockRejectedValue(
      new BusinessRuleError(
        'conflict',
        'SOLICITUD_NO_PENDIENTE',
        'Esta solicitud ya no está pendiente',
      ),
    );

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/mentorship/my-requests/${requestId}/cancel`)
      .set('Authorization', 'Bearer graduate')
      .expect(409);
    expect(response.body.error.code).toBe('SOLICITUD_NO_PENDIENTE');
  });

  it('valida el UUID antes de intentar cancelar', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/mentorship/my-requests/no-es-uuid/cancel')
      .set('Authorization', 'Bearer graduate')
      .expect(400);
    expect(repository.cancelCreated).not.toHaveBeenCalled();
  });

  it('el mentor recibe la fecha de actualización al consultar sus solicitudes', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/mentorship/requests?estado=CANCELADO')
      .set('Authorization', 'Bearer graduate')
      .expect(200);
    expect(response.body.data[0].fecha_actualizacion).toBe('2026-11-16');
  });
});
