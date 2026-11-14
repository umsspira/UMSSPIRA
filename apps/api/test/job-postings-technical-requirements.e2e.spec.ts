import type { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { Prisma } from '../src/generated/prisma/client';
import { JOB_POSTING_REPOSITORY, type JobPostingRepository } from '../src/modules/job-postings/application/ports/job-posting-repository.port';
import type { PublishedJobPosting } from '../src/modules/job-postings/domain/entities/published-job-posting.entity';
import { JobPostingsModule } from '../src/modules/job-postings/job-postings.module';
import { ElasticsearchService } from '../src/modules/vacantes/indexacion/elasticsearch.service';
import { REQUISITOS_TECNICOS_REPOSITORY, type RequisitosTecnicosRepository } from '../src/modules/vacantes/requisitos-tecnicos.repository';
import { AuthenticationGuard } from '../src/shared/http/auth/guards/authentication.guard';
import { PermissionsGuard } from '../src/shared/http/auth/guards/permissions.guard';
import { ErrorHandlerFilter } from '../src/shared/http/filters/error-handler.filter';
import { PrismaService } from '../src/shared/infrastructure/database/prisma.service';
import type { AuthenticatedContext } from '../src/shared/security/contexts/actor-context';
import { AccessError } from '../src/shared/security/errors/access-error';
import { AUTHENTICATOR, type Authenticator } from '../src/shared/security/ports/authenticator.port';

const id = '10000000-0000-4000-8000-000000000001';
const route = `/api/v1/job-postings/${id}/requisitos`;
const posting: PublishedJobPosting = {
  id, title: null, modality: null, experienceLevel: null,
  technicalDescription: null, publishedAt: null, company: null,
  technicalRequirements: [],
};
const session: AuthenticatedContext = {
  sessionId: 'test-session',
  actor: {
    id: 'graduate-user', email: 'graduate@example.com', name: null,
    role: 'titulado', permissions: [], credentialVersion: 1,
    scopes: { companyIds: [], graduateId: 'graduate-id', careerIds: [] },
  },
};

describe('GET job-postings/:id/requisitos (official guards, isolated persistence)', () => {
  let app: INestApplication;
  const authenticator: jest.Mocked<Authenticator> = { execute: jest.fn() };
  const jobs: jest.Mocked<JobPostingRepository> = {
    create: jest.fn(), listPublished: jest.fn(),
    findPublishedById: jest.fn(),
  };
  const requirements: jest.Mocked<RequisitosTecnicosRepository> = {
    listarPorVacante: jest.fn(), crear: jest.fn(),
    actualizar: jest.fn(), eliminar: jest.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      // Exercise the actual module factories and exported HU2 service. Only
      // persistence, authentication and external indexing are replaced.
      imports: [JobPostingsModule],
      providers: [
        { provide: AUTHENTICATOR, useValue: authenticator },
        { provide: APP_GUARD, useClass: AuthenticationGuard },
        { provide: APP_GUARD, useClass: PermissionsGuard },
      ],
    })
      .overrideProvider(JOB_POSTING_REPOSITORY).useValue(jobs)
      .overrideProvider(REQUISITOS_TECNICOS_REPOSITORY).useValue(requirements)
      .overrideProvider(PrismaService).useValue({})
      .overrideProvider(ElasticsearchService).useValue({})
      .compile();
    app = module.createNestApplication();
    app.useLogger(false);
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new ErrorHandlerFilter());
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    authenticator.execute.mockReset().mockResolvedValue(session);
    jobs.findPublishedById.mockReset().mockResolvedValue(posting);
    requirements.listarPorVacante.mockReset().mockResolvedValue([]);
  });

  afterAll(async () => { await app?.close(); });

  afterEach(() => {
    expect(jobs.create).not.toHaveBeenCalled();
    expect(requirements.crear).not.toHaveBeenCalled();
    expect(requirements.actualizar).not.toHaveBeenCalled();
    expect(requirements.eliminar).not.toHaveBeenCalled();
  });

  it('requires a session before validating the UUID or querying data', async () => {
    await request(app.getHttpServer()).get('/api/v1/job-postings/invalid/requisitos').expect(401);
    expect(authenticator.execute).not.toHaveBeenCalled();
    expect(jobs.findPublishedById).not.toHaveBeenCalled();
    expect(requirements.listarPorVacante).not.toHaveBeenCalled();
  });

  it('accepts the official session cookie and returns the raw HU8 empty contract', async () => {
    const response = await request(app.getHttpServer())
      .get(route).set('Cookie', 'umsspira_token=test-session-cookie').expect(200);
    expect(authenticator.execute).toHaveBeenCalledWith('test-session-cookie', undefined);
    expect(response.body).toEqual({ idVacante: id, requisitos: [] });
    expect(requirements.listarPorVacante).toHaveBeenCalledWith(id);
  });

  it('rejects a malformed UUID with 400 without reading persistence', async () => {
    await request(app.getHttpServer()).get('/api/v1/job-postings/invalid/requisitos')
      .set('Authorization', 'Bearer test-session').expect(400);
    expect(jobs.findPublishedById).not.toHaveBeenCalled();
    expect(requirements.listarPorVacante).not.toHaveBeenCalled();
  });

  it.each([['UNAUTHENTICATED', 401], ['FORBIDDEN', 403]] as const)(
    'preserves an official %s access rejection', async (code, status) => {
      authenticator.execute.mockRejectedValue(new AccessError(code));
      await request(app.getHttpServer()).get(route)
        .set('Authorization', 'Bearer test-session').expect(status);
      expect(jobs.findPublishedById).not.toHaveBeenCalled();
      expect(requirements.listarPorVacante).not.toHaveBeenCalled();
    },
  );

  it('returns 404 and hides HU2 requirements when the vacancy is unavailable', async () => {
    jobs.findPublishedById.mockResolvedValue(null);
    await request(app.getHttpServer()).get(route)
      .set('Authorization', 'Bearer test-session').expect(404);
    expect(requirements.listarPorVacante).not.toHaveBeenCalled();
  });

  it('returns structured HU2 fields rather than HU12 skills', async () => {
    const requirement = {
      id: '20000000-0000-4000-8000-000000000001', idVacante: id,
      competencia: 'PostgreSQL', nivel: 'Avanzado' as const, tipo: 'Obligatorio' as const,
      descripcion: 'Modelado relacional.', fechaCreacion: '2026-11-04T12:00:00.000Z',
    };
    requirements.listarPorVacante.mockResolvedValue([requirement]);
    const response = await request(app.getHttpServer()).get(route)
      .set('Authorization', 'Bearer test-session').expect(200);
    expect(response.body).toEqual({ idVacante: id, requisitos: [requirement] });
    expect(authenticator.execute).toHaveBeenCalledWith('test-session', undefined);
    expect(requirements.listarPorVacante).toHaveBeenCalledWith(id);
  });

  it('propagates an availability failure without reading HU2 or returning an empty result', async () => {
    jobs.findPublishedById.mockRejectedValue(new Error('Lookup failed'));
    const response = await request(app.getHttpServer()).get(route)
      .set('Authorization', 'Bearer test-session').expect(500);
    expect(response.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado' },
    });
    expect(requirements.listarPorVacante).not.toHaveBeenCalled();
  });

  it('reports a database timeout as unavailable without exposing diagnostics or reading requirements', async () => {
    jobs.findPublishedById.mockRejectedValue(new Prisma.PrismaClientKnownRequestError(
      'Private connection diagnostic', { code: 'P2024', clientVersion: 'hu8-test' },
    ));
    const response = await request(app.getHttpServer()).get(route)
      .set('Authorization', 'Bearer test-session').expect(503);
    expect(response.body).toEqual({
      error: { code: 'DATABASE_UNAVAILABLE', message: 'La base de datos no está disponible' },
    });
    expect(requirements.listarPorVacante).not.toHaveBeenCalled();
  });

  it('propagates a HU2 persistence failure without returning an empty result', async () => {
    requirements.listarPorVacante.mockRejectedValue(new Error('Requirements unavailable'));
    const response = await request(app.getHttpServer()).get(route)
      .set('Authorization', 'Bearer test-session').expect(500);
    expect(response.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado' },
    });
  });
});
