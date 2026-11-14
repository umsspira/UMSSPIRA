import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { CREDENTIAL_REPOSITORY } from '../src/modules/auth/application/ports/credential-repository.port';
import { RATE_LIMITER } from '../src/modules/auth/application/ports/rate-limiter.port';
import { SESSION_REPOSITORY } from '../src/modules/auth/application/ports/session-repository.port';
import { Argon2PasswordHasher } from '../src/modules/auth/infrastructure/security/argon2-password.hasher';
import { KEYWORD_DICTIONARY_PORT } from '../src/modules/nlp/application/ports/keyword-dictionary.port';
import { RADAR_AREA_WEIGHT_READER_PORT } from '../src/modules/radar/application/ports/area-weight-reader.port';
import { RADAR_CERTIFICATION_READER_PORT } from '../src/modules/radar/application/ports/certification-reader.port';
import { PROFILE_TEXT_READER_PORT } from '../src/modules/radar/application/ports/profile-text-reader.port';
import { RADAR_REPOSITORY_PORT } from '../src/modules/radar/application/ports/radar-repository.port';
import { RADAR_AREA_IDS } from '../src/modules/radar/domain/entities/radar-area';
import { USER_READER } from '../src/modules/user/application/ports/user-reader.port';
import { PrismaService } from '../src/shared/infrastructure/database/prisma.service';
import { configureHttp } from '../src/shared/http/configuration/configure-http';
import { RedisService } from '../src/shared/infrastructure/redis/redis.service';
import { DEMO_ACCOUNTS } from '../scripts/seed/demo-accounts';
import { InMemoryAuthStore } from './adapters/in-memory-auth.store';
import { InMemoryKeywordDictionary } from './adapters/in-memory-keyword-dictionary';
import { InMemoryRadarRepository } from './adapters/in-memory-radar.repository';
import { StubProfileTextReader } from './adapters/in-memory-radar-ports';

const SOFTWARE = RADAR_AREA_IDS['software-development'];

const T9_3_PERMISSIONS = ['nlp:extract', 'radar:self:read', 'radar:self:write'] as const;

type Role = 'titulado' | 'empresa' | 'administrador';

function account(role: Role) {
  const found = DEMO_ACCOUNTS.find((candidate) => candidate.role === role);

  if (!found) {
    throw new Error(`No existe la cuenta de prueba para ${role}`);
  }

  return found;
}

const certificationReader = { getCertifications: jest.fn().mockResolvedValue([]) };
const radarRepository = new InMemoryRadarRepository();
const profileReader = new StubProfileTextReader();
const dictionary = new InMemoryKeywordDictionary();

async function createApp(): Promise<INestApplication> {
  const passwords = new Argon2PasswordHasher();
  const hashes = new Map(
    await Promise.all(
      DEMO_ACCOUNTS.map(async (demo) => [demo.email, await passwords.hash(demo.password)] as const),
    ),
  );
  const auth = new InMemoryAuthStore(hashes);
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(RADAR_CERTIFICATION_READER_PORT)
    .useValue(certificationReader)
    .overrideProvider(PrismaService)
    .useValue({})
    .overrideProvider(RedisService)
    .useValue({})
    .overrideProvider(CREDENTIAL_REPOSITORY)
    .useValue(auth)
    .overrideProvider(SESSION_REPOSITORY)
    .useValue(auth)
    .overrideProvider(USER_READER)
    .useValue(auth)
    .overrideProvider(RATE_LIMITER)
    .useValue({
      consume: async () => ({ allowed: true, retryAfterSeconds: 0 }),
    })
    .overrideProvider(KEYWORD_DICTIONARY_PORT)
    .useValue(dictionary)
    .overrideProvider(RADAR_REPOSITORY_PORT)
    .useValue(radarRepository)
    .overrideProvider(RADAR_AREA_WEIGHT_READER_PORT)
    .useValue({
      getAreaWeights: async () => radarRepository.areaWeights,
    })
    .overrideProvider(PROFILE_TEXT_READER_PORT)
    .useValue(profileReader)
    .compile();

  const app = module.createNestApplication();
  app.useLogger(false);
  configureHttp(app);
  await app.init();

  return app;
}

describe('T9.3 - revalidación de /auth/me, GET /radar y POST /radar/recalculate', () => {
  let app: INestApplication;
  const tokens: Record<Role, string> = { titulado: '', empresa: '', administrador: '' };

  beforeAll(async () => {
    app = await createApp();
    tokens.titulado = await login('titulado');
    tokens.empresa = await login('empresa');
    tokens.administrador = await login('administrador');
  });

  afterAll(async () => app?.close());

  beforeEach(() => {
    radarRepository.reset();
    profileReader.reset();
    dictionary.fail = false;
    radarRepository.areaWeights = {
      [SOFTWARE]: [{ term: 'javascript', peso: 5 }],
    };
  });

  async function login(role: Role): Promise<string> {
    const demo = account(role);
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: demo.email, password: demo.password, remember: false })
      .expect(200);

    return response.body.data.accessToken as string;
  }

  function me(token?: string) {
    const pending = request(app.getHttpServer()).get('/api/v1/auth/me');
    return token ? pending.auth(token, { type: 'bearer' }) : pending;
  }

  function getRadar(token?: string) {
    const pending = request(app.getHttpServer()).get('/api/v1/radar');
    return token ? pending.auth(token, { type: 'bearer' }) : pending;
  }

  function recalculate(token?: string) {
    const pending = request(app.getHttpServer()).post('/api/v1/radar/recalculate');
    return token ? pending.auth(token, { type: 'bearer' }) : pending;
  }

  it('CA-HU9-05: POST /radar/recalculate responde 503 si el diccionario no carga', async () => {
    profileReader.texts = ['javascript'];
    dictionary.fail = true;

    const response = await recalculate(tokens.titulado);

    expect(response.status).not.toBe(404);
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('NLP_DICTIONARY_UNAVAILABLE');
    expect(radarRepository.saveCalls).toBe(0);
  });

  it('CA-HU9-02: /auth/me del titulado incluye nlp:extract, radar:self:read y radar:self:write', async () => {
    const response = await me(tokens.titulado).expect(200);

    expect(response.body.data.role).toBe('titulado');
    expect(response.body.data.permissions).toEqual(expect.arrayContaining([...T9_3_PERMISSIONS]));
  });

  it('CA-HU9-02: /auth/me de la empresa carece de nlp:extract, radar:self:read y radar:self:write', async () => {
    const response = await me(tokens.empresa).expect(200);

    expect(response.body.data.role).toBe('empresa');
    for (const permission of T9_3_PERMISSIONS) {
      expect(response.body.data.permissions).not.toContain(permission);
    }
  });

  it('administrador: /auth/me incluye nlp:extract y carece de los permisos de radar (observado en código)', async () => {
    const response = await me(tokens.administrador).expect(200);

    expect(response.body.data.role).toBe('administrador');
    expect(response.body.data.permissions).toContain('nlp:extract');
    expect(response.body.data.permissions).not.toContain('radar:self:read');
    expect(response.body.data.permissions).not.toContain('radar:self:write');
  });

  it('CA-HU9-03: GET /radar responde 200 al titulado y nunca 404', async () => {
    profileReader.texts = ['javascript'];

    const response = await getRadar(tokens.titulado);

    expect(response.status).not.toBe(404);
    expect(response.status).toBe(200);
  });

  it('CA-HU9-03: GET /radar responde 403 a una cuenta sin radar:self:read y nunca 404', async () => {
    const empresa = await getRadar(tokens.empresa);
    const administrador = await getRadar(tokens.administrador);

    for (const response of [empresa, administrador]) {
      expect(response.status).not.toBe(404);
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    }
  });

  it('CA-HU9-03: GET /radar responde 401 sin token y nunca 404', async () => {
    const response = await getRadar();

    expect(response.status).not.toBe(404);
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('CA-HU9-04: POST /radar/recalculate responde 200 al titulado y nunca 404', async () => {
    profileReader.texts = ['javascript'];

    const response = await recalculate(tokens.titulado);

    expect(response.status).not.toBe(404);
    expect(response.status).toBe(200);
  });

  it('CA-HU9-04: POST /radar/recalculate responde 403 sin radar:self:write y nunca 404', async () => {
    const empresa = await recalculate(tokens.empresa);
    const administrador = await recalculate(tokens.administrador);

    for (const response of [empresa, administrador]) {
      expect(response.status).not.toBe(404);
      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('FORBIDDEN');
    }
  });

  it('CA-HU9-04: POST /radar/recalculate responde 401 sin token y nunca 404', async () => {
    const response = await recalculate();

    expect(response.status).not.toBe(404);
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });
});
