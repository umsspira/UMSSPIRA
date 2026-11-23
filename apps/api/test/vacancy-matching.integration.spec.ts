import 'reflect-metadata';
import type { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import request from 'supertest';
import { PrismaClient } from '../src/generated/prisma/client';
import { JobPostingAffinityBatchController } from '../src/modules/job-postings/http/controllers/job-posting-affinity-batch.controller';
import { jobPostingAffinityProviders } from '../src/modules/job-postings/infrastructure/providers/job-posting-affinity.providers';
import { nlpProviders } from '../src/modules/nlp/infrastructure/providers/nlp.providers';
import { PrismaService } from '../src/shared/infrastructure/database/prisma.service';
import type { ActorContext } from '../src/shared/security/contexts/actor-context';
import { startTestDatabase, type TestDatabase } from './integration/support/test-database';
import {
  seedApplication,
  seedCompanyVacancy,
  seedGraduate,
  seedKeywordDictionary,
  type SeededVacancy,
} from './integration/support/vacancy-matching-seed';
import { passesMatchingRegression, vacancyMatchingCases } from './integration/support/vacancy-matching-cases';

// Los adaptadores solo usan el cliente Prisma. Se sustituye PrismaService (que lee la
// configuración de la aplicación) por un cliente real conectado a la base de prueba.
jest.mock('../src/shared/infrastructure/database/prisma.service', () => ({
  PrismaService: class {},
}));

type CaseId = (typeof vacancyMatchingCases)[number]['id'];

const EXPECTED_PERCENTAGES: Record<CaseId, number> = { exacta: 100, parcial: 50, 'sin-coincidencia': 0 };
const ROUTE = '/api/v1/affinity/batch';

// Opt-in: sin TEST_DATABASE_URL (PostgreSQL local desechable) la suite se omite.
const integration = process.env.TEST_DATABASE_URL ? describe : describe.skip;

function buildActor(id: string, role: ActorContext['role'], permissions: readonly string[]): ActorContext {
  return {
    id,
    email: `${id}@example.com`,
    name: null,
    role,
    permissions,
    scopes: { companyIds: [], graduateId: null, careerIds: [] },
    credentialVersion: 1,
  };
}

integration('HU-E5-17 · POST /api/v1/affinity/batch contra PostgreSQL real (CA-07 y CA-08)', () => {
  let database: TestDatabase;
  let pool: Pool;
  let prisma: PrismaClient;
  let app: INestApplication;
  let currentActor: ActorContext;
  let vacancy: SeededVacancy;
  const userByCase = {} as Record<CaseId, string>;
  const applicationByCase = {} as Record<CaseId, string>;

  jest.setTimeout(60_000);

  beforeAll(async () => {
    database = await startTestDatabase();
    pool = new Pool({ connectionString: database.connectionString });
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: database.connectionString }) });

    // Todos los casos comparan contra los mismos requisitos de la vacante.
    const requirements = vacancyMatchingCases[0].requiredSkills;
    await seedKeywordDictionary(pool, requirements);
    vacancy = await seedCompanyVacancy(pool, requirements);
    for (const { id, profileSkills } of vacancyMatchingCases) {
      const graduate = await seedGraduate(pool, `Desarrollo de aplicaciones con ${profileSkills.join(' y ')}`);
      userByCase[id] = graduate.userId;
      applicationByCase[id] = await seedApplication(pool, graduate.userId, vacancy.vacancyId);
    }

    const moduleRef = await Test.createTestingModule({
      controllers: [JobPostingAffinityBatchController],
      providers: [...nlpProviders, ...jobPostingAffinityProviders, { provide: PrismaService, useValue: prisma }],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalGuards({
      canActivate(context: ExecutionContext) {
        context.switchToHttp().getRequest().auth = { actor: currentActor };
        return true;
      },
    });
    await app.init();
  }, 180_000);

  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
    await pool?.end();
    await database?.stop();
  }, 60_000);

  function post(actor: ActorContext, body: object) {
    currentActor = actor;
    return request(app.getHttpServer()).post(ROUTE).send(body);
  }

  const graduateActor = (id: CaseId) => buildActor(userByCase[id], 'titulado', ['perfil:self:read']);
  const companyActor = () => buildActor(vacancy.companyUserId, 'empresa', ['empresas:self:read']);

  it('calcula en modo vacancies el 100 %, 50 % y 0 % de los tres titulados', async () => {
    const percentages = {} as Record<CaseId, number>;
    for (const { id } of vacancyMatchingCases) {
      const response = await post(graduateActor(id), { mode: 'vacancies', vacancyIds: [vacancy.vacancyId] }).expect(200);
      const [item] = response.body.data;
      expect(item.vacancyId).toBe(vacancy.vacancyId);
      expect(item.error).toBeNull();
      expect(item.result.status).toBe('ready');
      expect(typeof item.result.calculatedAt).toBe('string');
      percentages[id] = item.result.percentage;
    }

    expect(percentages).toEqual(EXPECTED_PERCENTAGES);
    expect(passesMatchingRegression(percentages)).toBe(true);
  });

  it('detalla en comparison qué requisito cumple el perfil parcial', async () => {
    const response = await post(graduateActor('parcial'), { mode: 'vacancies', vacancyIds: [vacancy.vacancyId] }).expect(200);

    expect(response.body.data[0].result.comparison).toEqual(
      expect.arrayContaining([
        { requirement: 'SQL', matchedSkill: 'sql', result: 'exact' },
        { requirement: 'Python', matchedSkill: null, result: 'not-found' },
      ]),
    );
  });

  it('entrega a la empresa los mismos porcentajes en modo applicants', async () => {
    const applicationIds = vacancyMatchingCases.map(({ id }) => applicationByCase[id]);
    const response = await post(companyActor(), {
      mode: 'applicants',
      vacancyId: vacancy.vacancyId,
      applicationIds,
    }).expect(200);

    const percentages = {} as Record<CaseId, number>;
    for (const { id } of vacancyMatchingCases) {
      const item = response.body.data.find(
        (candidate: { applicationId: string }) => candidate.applicationId === applicationByCase[id],
      );
      expect(item.error).toBeNull();
      expect(item.result.status).toBe('ready');
      percentages[id] = item.result.percentage;
    }

    expect(percentages).toEqual(EXPECTED_PERCENTAGES);
    expect(passesMatchingRegression(percentages)).toBe(true);
  });

  it('rechaza con 403 a una empresa ajena a la vacante', async () => {
    const other = await seedCompanyVacancy(pool, ['SQL']);
    const stranger = buildActor(other.companyUserId, 'empresa', ['empresas:self:read']);

    await post(stranger, {
      mode: 'applicants',
      vacancyId: vacancy.vacancyId,
      applicationIds: [applicationByCase.exacta],
    }).expect(403);
  });

  it('rechaza con 403 a un titulado que intenta el modo applicants', async () => {
    await post(graduateActor('exacta'), {
      mode: 'applicants',
      vacancyId: vacancy.vacancyId,
      applicationIds: [applicationByCase.exacta],
    }).expect(403);
  });
});
