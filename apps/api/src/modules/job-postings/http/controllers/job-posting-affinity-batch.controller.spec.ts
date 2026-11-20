import { Test } from '@nestjs/testing';
import { APP_GUARD } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AuthenticationGuard } from '../../../../shared/http/auth/guards/authentication.guard';
import { PermissionsGuard } from '../../../../shared/http/auth/guards/permissions.guard';
import { AUTHENTICATOR } from '../../../../shared/security/ports/authenticator.port';
import { ErrorHandlerFilter } from '../../../../shared/http/filters/error-handler.filter';
import { JOB_POSTING_AFFINITY_DATA } from '../../application/ports/job-posting-affinity-data.port';
import { JOB_POSTING_AFFINITY_BATCH_DATA } from '../../application/ports/job-posting-affinity-batch-data.port';
import { CalculateJobPostingAffinity } from '../../application/use-cases/calculate-job-posting-affinity.use-case';
import { CalculateJobPostingAffinityBatch } from '../../application/use-cases/calculate-job-posting-affinity-batch.use-case';
import { AffinityDictionaryUnavailableError } from '../../domain/errors/affinity-dictionary-unavailable.error';
import { JobPostingAffinityBatchController } from './job-posting-affinity-batch.controller';


const VACANCY_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const APPLICATION_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const FOREIGN_APPLICATION_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const graduateActor = {
  id: 'graduate-user', email: 'graduate@example.com', name: null, role: 'titulado', permissions: ['perfil:self:read'],
  scopes: { companyIds: [], graduateId: null, careerIds: [] }, credentialVersion: 1,
};
const companyActor = {
  ...graduateActor, id: 'company-user', role: 'empresa', permissions: ['empresas:self:read'],
};
const profile = {
  userId: 'candidate-user', tituladoId: 'candidate-profile', texts: ['Java'], description: 'Backend',
  hasEducation: true, hasExperience: true, hasCertification: true, hasProject: true,
};
const NO_REQUIREMENTS = { status: 'no-requirements', percentage: null, calculatedAt: null, comparison: [] };



describe('HTTP T10.5 affinity batch', () => {
  let app: INestApplication;
  const auth = { execute: jest.fn() };
  const data = { readProfiles: jest.fn() };
  const batchData = { readPublicVacancies: jest.fn(), readCompanyVacancyApplications: jest.fn() };
  const calculate = { execute: jest.fn() };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [JobPostingAffinityBatchController],
      providers: [
        CalculateJobPostingAffinityBatch,
        { provide: JOB_POSTING_AFFINITY_DATA, useValue: data },
        { provide: JOB_POSTING_AFFINITY_BATCH_DATA, useValue: batchData },
        { provide: CalculateJobPostingAffinity, useValue: calculate },
        { provide: AUTHENTICATOR, useValue: auth },
        { provide: APP_GUARD, useClass: AuthenticationGuard },
        { provide: APP_GUARD, useClass: PermissionsGuard },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new ErrorHandlerFilter());
    await app.init();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    auth.execute.mockImplementation(async (token: string) => ({ actor: token === 'company-token' ? companyActor : graduateActor }));
    data.readProfiles.mockResolvedValue([profile]);
    batchData.readPublicVacancies.mockImplementation(async (ids: string[]) => ids.map((vacancyId) => ({ vacancyId, requirements: [] })));
    batchData.readCompanyVacancyApplications.mockImplementation(async (vacancyId: string, _actorId: string, ids: string[]) => ({
      vacancy: { vacancyId, requirements: [] }, applications: ids.map((applicationId) => ({ applicationId, userId: profile.userId })),
    }));
    calculate.execute.mockResolvedValue([{ vacancyId: VACANCY_ID, result: NO_REQUIREMENTS }]);
  });
  afterAll(async () => app.close());


  it('requiere autenticación (401) y no llama al servicio', async () => {
    await request(app.getHttpServer()).post('/api/v1/affinity/batch').send({ mode: 'vacancies', vacancyIds: [VACANCY_ID] }).expect(401);
    expect(batchData.readPublicVacancies).not.toHaveBeenCalled();
  });
  it('rechaza payload inválido de lote completo (400)', async () => {
    await request(app.getHttpServer()).post('/api/v1/affinity/batch').set('Authorization', 'Bearer graduate-token')
      .send({ mode: 'vacancies', vacancyIds: [VACANCY_ID, VACANCY_ID] }).expect(400);
    expect(batchData.readPublicVacancies).not.toHaveBeenCalled();
  });
  it('responde 200 en modo titulado y usa el perfil del actor', async () => {
    const response = await request(app.getHttpServer()).post('/api/v1/affinity/batch')
      .set('Authorization', 'Bearer graduate-token').send({ mode: 'vacancies', vacancyIds: [VACANCY_ID] }).expect(200);
    expect(response.body.data[0]).toMatchObject({ vacancyId: VACANCY_ID, result: NO_REQUIREMENTS, error: null });
    expect(data.readProfiles).toHaveBeenCalledWith([graduateActor.id]);
  });
  it('empresa no puede solicitar el modo titulado (403) antes de consultas', async () => {
    await request(app.getHttpServer()).post('/api/v1/affinity/batch').set('Authorization', 'Bearer company-token')
      .send({ mode: 'vacancies', vacancyIds: [VACANCY_ID] }).expect(403);
    expect(batchData.readPublicVacancies).not.toHaveBeenCalled();
    expect(calculate.execute).not.toHaveBeenCalled();
  });
  it('titulado no puede solicitar el modo empresa (403) antes de consultas', async () => {
    await request(app.getHttpServer()).post('/api/v1/affinity/batch').set('Authorization', 'Bearer graduate-token')
      .send({ mode: 'applicants', vacancyId: VACANCY_ID, applicationIds: [APPLICATION_ID] }).expect(403);
    expect(batchData.readCompanyVacancyApplications).not.toHaveBeenCalled();
    expect(calculate.execute).not.toHaveBeenCalled();
  });
  it('empresa recibe 403 al solicitar postulación ajena a la vacante', async () => {
    batchData.readCompanyVacancyApplications.mockResolvedValue({ vacancy: { vacancyId: VACANCY_ID, requirements: [] }, applications: [] });
    await request(app.getHttpServer()).post('/api/v1/affinity/batch').set('Authorization', 'Bearer company-token')
      .send({ mode: 'applicants', vacancyId: VACANCY_ID, applicationIds: [FOREIGN_APPLICATION_ID] }).expect(403);
    expect(data.readProfiles).not.toHaveBeenCalled();
    expect(calculate.execute).not.toHaveBeenCalled();
  });
  it('empresa recibe 200 y conserva vacancyId/applicationId', async () => {
    const response = await request(app.getHttpServer()).post('/api/v1/affinity/batch').set('Authorization', 'Bearer company-token')
      .send({ mode: 'applicants', vacancyId: VACANCY_ID, applicationIds: [APPLICATION_ID] }).expect(200);
    expect(response.body.data[0]).toMatchObject({ vacancyId: VACANCY_ID, applicationId: APPLICATION_ID, result: NO_REQUIREMENTS, error: null });
  });
  it('propaga indisponibilidad del diccionario como 503 global', async () => {
    batchData.readPublicVacancies.mockResolvedValue([{ vacancyId: VACANCY_ID, requirements: ['Java'] }]);
    calculate.execute.mockRejectedValue(new AffinityDictionaryUnavailableError());
    const response = await request(app.getHttpServer()).post('/api/v1/affinity/batch')
      .set('Authorization', 'Bearer graduate-token').send({ mode: 'vacancies', vacancyIds: [VACANCY_ID] }).expect(503);
    expect(response.body.error.code).toBe('NLP_DICTIONARY_UNAVAILABLE');
  });
});
