import type { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { JobPostingRepository } from '../src/modules/job-postings/application/ports/job-posting-repository.port';
import { GetPublishedJobPostingTechnicalRequirementsUseCase } from '../src/modules/job-postings/application/use-cases/get-published-job-posting-technical-requirements.use-case';
import type { PublishedJobPosting } from '../src/modules/job-postings/domain/entities/published-job-posting.entity';
import { TechnicalRequirementsController } from '../src/modules/job-postings/http/controllers/technical-requirements.controller';
import {
  CanonicalTechnicalRequirementsReader,
  type CanonicalTechnicalRequirementRow,
  type CanonicalTechnicalRequirementsSource,
} from '../src/modules/job-postings/infrastructure/readers/canonical-technical-requirements.reader';
import { AuthenticationGuard } from '../src/shared/http/auth/guards/authentication.guard';
import { PermissionsGuard } from '../src/shared/http/auth/guards/permissions.guard';
import { ErrorHandlerFilter } from '../src/shared/http/filters/error-handler.filter';
import type { AuthenticatedContext } from '../src/shared/security/contexts/actor-context';
import { AccessError } from '../src/shared/security/errors/access-error';
import { AUTHENTICATOR, type Authenticator } from '../src/shared/security/ports/authenticator.port';

const id = '10000000-0000-4000-8000-000000000001';
const route = `/api/v1/job-postings/${id}/requisitos`;
const now = new Date('2026-11-04T12:00:00.000Z');
const posting: PublishedJobPosting = {
  id, title: 'Vacante vigente', modality: null, experienceLevel: null,
  technicalDescription: null, publishedAt: now, company: null,
  technicalRequirements: [{ areaId: null, name: 'Habilidad HU12', level: null }],
};
const session: AuthenticatedContext = {
  sessionId: 'hu8-test-session',
  actor: {
    id: 'graduate-user', email: 'graduate@example.test', name: null,
    role: 'titulado', permissions: [], credentialVersion: 1,
    scopes: { companyIds: [], graduateId: 'graduate-id', careerIds: [] },
  },
};
const row: CanonicalTechnicalRequirementRow = {
  id: '20000000-0000-4000-8000-000000000001', id_vacante: id,
  competencia_tecnica: 'PostgreSQL', nivel_esperado: 'AVANZADO',
  tipo: 'OBLIGATORIO', descripcion: null, creado_en: now,
};

describe('HU8 canonical HTTP composition (source and authenticator simulated, no DB)', () => {
  let app: INestApplication;
  const authenticator: jest.Mocked<Authenticator> = { execute: jest.fn() };
  const jobs: jest.Mocked<JobPostingRepository> = {
    create: jest.fn(), listPublished: jest.fn(),
    findPublishedById: jest.fn(),
  };
  const source: jest.Mocked<CanonicalTechnicalRequirementsSource> = {
    findMany: jest.fn(),
  };

  beforeAll(async () => {
    // This verifies the candidate reader without changing production providers.
    // It does not verify a Prisma delegate or an applied database migration.
    const module = await Test.createTestingModule({
      controllers: [TechnicalRequirementsController],
      providers: [
        { provide: AUTHENTICATOR, useValue: authenticator },
        { provide: APP_GUARD, useClass: AuthenticationGuard },
        { provide: APP_GUARD, useClass: PermissionsGuard },
        {
          provide: GetPublishedJobPostingTechnicalRequirementsUseCase,
          useValue: new GetPublishedJobPostingTechnicalRequirementsUseCase(
            jobs, new CanonicalTechnicalRequirementsReader(source), () => now,
          ),
        },
      ],
    }).compile();
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
    source.findMany.mockReset().mockResolvedValue([]);
  });

  afterAll(async () => { await app?.close(); });

  afterEach(() => {
    expect(jobs.create).not.toHaveBeenCalled();
  });

  it.each([
    ['BASICO', 'Básico', 'OBLIGATORIO', 'Obligatorio'],
    ['BASICO', 'Básico', 'DESEABLE', 'Deseable'],
    ['INTERMEDIO', 'Intermedio', 'OBLIGATORIO', 'Obligatorio'],
    ['INTERMEDIO', 'Intermedio', 'DESEABLE', 'Deseable'],
    ['AVANZADO', 'Avanzado', 'OBLIGATORIO', 'Obligatorio'],
    ['AVANZADO', 'Avanzado', 'DESEABLE', 'Deseable'],
  ])('serves %s / %s / %s / %s to a graduate without company permissions', async (
    level, levelLabel, type, typeLabel,
  ) => {
    source.findMany.mockImplementation(async () => {
      expect(jobs.findPublishedById).toHaveBeenCalledWith(id, now);
      return [{ ...row, nivel_esperado: level, tipo: type }];
    });

    const response = await request(app.getHttpServer()).get(route)
      .set('Authorization', 'Bearer hu8-test-session').expect(200);

    expect(response.body).toEqual({ idVacante: id, requisitos: [{
      id: row.id, idVacante: id, competencia: 'PostgreSQL',
      nivel: levelLabel, tipo: typeLabel, fechaCreacion: now.toISOString(),
    }] });
    expect(source.findMany).toHaveBeenCalledTimes(1);
    expect(source.findMany.mock.calls[0][0].where).toEqual({ id_vacante: id });
  });

  it('preserves an authenticated empty result with the official session cookie', async () => {
    const response = await request(app.getHttpServer()).get(route)
      .set('Cookie', 'umsspira_token=hu8-test-cookie').expect(200);
    expect(response.body).toEqual({ idVacante: id, requisitos: [] });
    expect(authenticator.execute).toHaveBeenCalledWith('hu8-test-cookie', undefined);
  });

  it('requires authentication before querying either source', async () => {
    await request(app.getHttpServer()).get(route).expect(401);
    expect(jobs.findPublishedById).not.toHaveBeenCalled();
    expect(source.findMany).not.toHaveBeenCalled();
  });

  it('preserves an official access rejection', async () => {
    authenticator.execute.mockRejectedValue(new AccessError('FORBIDDEN'));
    await request(app.getHttpServer()).get(route)
      .set('Authorization', 'Bearer hu8-test-session').expect(403);
    expect(source.findMany).not.toHaveBeenCalled();
  });

  it('rejects malformed UUIDs before querying either source', async () => {
    await request(app.getHttpServer()).get('/api/v1/job-postings/invalid/requisitos')
      .set('Authorization', 'Bearer hu8-test-session').expect(400);
    expect(jobs.findPublishedById).not.toHaveBeenCalled();
    expect(source.findMany).not.toHaveBeenCalled();
  });

  it('does not read canonical requirements when official availability rejects the vacancy', async () => {
    jobs.findPublishedById.mockResolvedValue(null);
    await request(app.getHttpServer()).get(route)
      .set('Authorization', 'Bearer hu8-test-session').expect(404);
    expect(source.findMany).not.toHaveBeenCalled();
  });

  it('propagates availability failures before reading the canonical source', async () => {
    jobs.findPublishedById.mockRejectedValue(new Error('Lookup failed'));
    await request(app.getHttpServer()).get(route)
      .set('Authorization', 'Bearer hu8-test-session').expect(500);
    expect(source.findMany).not.toHaveBeenCalled();
  });

  it('does not hide a missing canonical table behind an empty result or HU12 skills', async () => {
    source.findMany.mockRejectedValue(new Error('Canonical table unavailable'));
    const response = await request(app.getHttpServer()).get(route)
      .set('Authorization', 'Bearer hu8-test-session').expect(500);
    expect(response.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Ocurrió un error inesperado' },
    });
  });

  it('rejects invalid canonical data without exposing substitute requirements', async () => {
    source.findMany.mockResolvedValue([{ ...row, nivel_esperado: 'EXPERTO' }]);
    const response = await request(app.getHttpServer()).get(route)
      .set('Authorization', 'Bearer hu8-test-session').expect(500);
    expect(response.body.requisitos).toBeUndefined();
  });
});
