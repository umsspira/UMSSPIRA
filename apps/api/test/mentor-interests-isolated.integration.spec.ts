import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import request from 'supertest';
import { PrismaClient } from '../src/generated/prisma/client';
import { configureHttp } from '../src/shared/http/configuration/configure-http';
import { AuthenticationGuard } from '../src/shared/http/auth/guards/authentication.guard';
import { PermissionsGuard } from '../src/shared/http/auth/guards/permissions.guard';
import { AccessError } from '../src/shared/security/errors/access-error';
import type { ActorContext } from '../src/shared/security/contexts/actor-context';
import { PrismaMentorCatalogRepository } from '../src/modules/mentorship/infrastructure/repositories/prisma-mentor-catalog.repository';
import { GetMyMentorInterestsUseCase } from '../src/modules/mentorship/application/use-cases/get-my-mentor-interests.use-case';
import { GetMentorInterestCatalogUseCase } from '../src/modules/mentorship/application/use-cases/get-mentor-interest-catalog.use-case';
import { SaveMentorInterestsUseCase } from '../src/modules/mentorship/application/use-cases/save-mentor-interests.use-case';
import { GetMyMentorInterestsController } from '../src/modules/mentorship/http/controllers/get-my-mentor-interests.controller';
import { GetMentorInterestCatalogController } from '../src/modules/mentorship/http/controllers/get-mentor-interest-catalog.controller';
import { SaveMentorInterestsController } from '../src/modules/mentorship/http/controllers/save-mentor-interests.controller';

// Opt-in. No usa AppModule, .env, DATABASE_URL ni DIRECT_URL.
const isolated = process.env.HU621_ISOLATED_DB === '1' ? describe : describe.skip;
const uid = (n: number) => `62110000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const ids = {
  root: uid(1),
  qa: uid(2),
  rest: uid(11),
  node: uid(12),
  inactive: uid(13),
  qaTopic: uid(14),
  user: uid(100),
  graduate: uid(101),
  mentor: uid(102),
  otherUser: uid(200),
  otherGraduate: uid(201),
  otherMentor: uid(202),
  custom: uid(301),
  removedCustom: uid(302),
};

isolated('HU 6.21: HTTP + Prisma + PostgreSQL desechable', () => {
  let container: string;
  let connectionString: string;
  let app: INestApplication;
  let prisma: PrismaClient;
  const evidence: string[] = [];
  const report = { postgres: '', migrations: 0, passed: evidence, cleanup: false };

  function docker(args: string[], input?: string) {
    const result = spawnSync('docker', args, {
      input,
      encoding: 'utf8',
      timeout: 60000,
      maxBuffer: 8 * 1024 * 1024,
    });
    if (result.error) {
      throw result.error;
    }
    if (result.status !== 0) {
      throw new Error(result.stderr);
    }
    return result.stdout.trim();
  }
  function sql(text: string) {
    return docker(
      [
        'exec',
        '-i',
        container,
        'psql',
        '-X',
        '-qAt',
        '-v',
        'ON_ERROR_STOP=1',
        '-U',
        'postgres',
        '-d',
        'hu621_isolated',
      ],
      text,
    );
  }
  const actor: ActorContext = {
    id: ids.user,
    email: 'isolated@example.test',
    name: 'Mentor aislado',
    role: 'titulado',
    credentialVersion: 1,
    permissions: ['mentores:self:write'],
    scopes: { graduateId: ids.graduate, careerIds: [], companyIds: [] },
  };

  async function openApplication() {
    // Única conexión posible: puerto loopback del contenedor recién creado.
    if (!/^postgresql:\/\/postgres@127\.0\.0\.1:\d+\/hu621_isolated$/.test(connectionString)) {
      throw new Error('La conexión no pertenece a la base aislada');
    }
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString, max: 4, connectionTimeoutMillis: 5000 }),
    });
    const repository = new PrismaMentorCatalogRepository(prisma as never);
    const module = await Test.createTestingModule({
      controllers: [
        GetMyMentorInterestsController,
        GetMentorInterestCatalogController,
        SaveMentorInterestsController,
      ],
      providers: [
        {
          provide: ConfigService,
          useValue: new ConfigService({ CORS_ORIGINS: ['http://localhost:3001'] }),
        },
        {
          provide: GetMyMentorInterestsUseCase,
          useValue: new GetMyMentorInterestsUseCase(repository),
        },
        {
          provide: GetMentorInterestCatalogUseCase,
          useValue: new GetMentorInterestCatalogUseCase(repository),
        },
        {
          provide: SaveMentorInterestsUseCase,
          useValue: new SaveMentorInterestsUseCase(repository),
        },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useLogger(false);
    // Solo el autenticador es un doble: los guards, controllers, casos de uso,
    // repositorio, transacciones y consultas son los reales del proyecto.
    const authenticator = {
      execute: async (token: string) => {
        if (token !== 'isolated-mentor') {
          throw new AccessError('UNAUTHENTICATED');
        }
        return { actor, sessionId: uid(999) };
      },
    };
    const reflector = module.get(Reflector);
    app.useGlobalGuards(
      new AuthenticationGuard(reflector, authenticator),
      new PermissionsGuard(reflector),
    );
    configureHttp(app);
    await app.listen(0, '127.0.0.1');
  }
  async function closeApplication() {
    if (app) {
      await app.close();
    }
    if (prisma) {
      await prisma.$disconnect();
    }
  }
  const get = (path: string) =>
    request(app.getHttpServer())
      .get(`/api/v1/mentorship/interests/${path}`)
      .set('Authorization', 'Bearer isolated-mentor');
  const save = (topicIds: string[]) =>
    request(app.getHttpServer())
      .put('/api/v1/mentorship/interests')
      .set('Authorization', 'Bearer isolated-mentor')
      .send({ areaIds: [ids.root], topicIds });
  const snapshot = () =>
    sql(`SELECT jsonb_build_object(
    'links',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM mentor_area t),
    'custom',(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM mentor_interes_personalizado t));`);

  beforeAll(async () => {
    container = docker([
      'run',
      '--detach',
      '--rm',
      '--pull=never',
      '--label',
      'umsspira.test=hu621-persistence',
      '--publish',
      '127.0.0.1::5432',
      '--tmpfs',
      '/var/lib/postgresql/data',
      '-e',
      'POSTGRES_HOST_AUTH_METHOD=trust',
      '-e',
      'POSTGRES_DB=hu621_isolated',
      'postgres:15-alpine',
    ]);
    let ready = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        docker(['exec', container, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres']);
        ready = true;
        break;
      } catch {
        await new Promise((done) => setTimeout(done, 500));
      }
    }
    if (!ready) {
      throw new Error('PostgreSQL aislado no inició');
    }
    const port = docker(['port', container, '5432/tcp']);
    if (!/^127\.0\.0\.1:\d+$/.test(port)) {
      throw new Error('El puerto no está restringido a loopback');
    }
    connectionString = `postgresql://postgres@${port}/hu621_isolated`;
    sql('CREATE SCHEMA extensions;');
    const migrationRoot = resolve(__dirname, '../prisma/migrations');
    for (const entry of readdirSync(migrationRoot, { withFileTypes: true })
      .filter((item) => item.isDirectory())
      .sort((a, b) => a.name.localeCompare(b.name))) {
      sql(readFileSync(resolve(migrationRoot, entry.name, 'migration.sql'), 'utf8'));
      report.migrations++;
    }
    report.postgres = sql('SHOW server_version;');
    await openApplication();
  }, 180000);

  beforeEach(() => {
    sql(`TRUNCATE area, usuario CASCADE;
      INSERT INTO usuario(usuario_id,nombre,rol,estado) VALUES ('${ids.user}','Mentor prueba','titulado','ACTIVO'),('${ids.otherUser}','Otro mentor prueba','titulado','ACTIVO');
      INSERT INTO titulado(id,id_usuario) VALUES ('${ids.graduate}','${ids.user}'),('${ids.otherGraduate}','${ids.otherUser}');
      INSERT INTO mentor(id,id_titulado,esta_activo) VALUES ('${ids.mentor}','${ids.graduate}',true),('${ids.otherMentor}','${ids.otherGraduate}',true);
      INSERT INTO area(id,nombre,padre_id,esta_activo) VALUES
      ('${ids.root}','Tecnología',null,true),('${ids.qa}','QA',null,true),
      ('${ids.rest}','APIs REST','${ids.root}',true),('${ids.node}','Node.js','${ids.root}',true),
      ('${ids.inactive}','Legado inactivo','${ids.root}',false),('${ids.qaTopic}','Pruebas de API','${ids.qa}',true);
      INSERT INTO mentor_area(id_mentor,id_area) VALUES
      ('${ids.mentor}','${ids.root}'),('${ids.mentor}','${ids.qa}'),('${ids.mentor}','${ids.node}'),
      ('${ids.mentor}','${ids.inactive}'),('${ids.mentor}','${ids.qaTopic}'),
      ('${ids.otherMentor}','${ids.qa}'),('${ids.otherMentor}','${ids.qaTopic}');
      INSERT INTO mentor_interes_personalizado(id,id_mentor,id_area,nombre,nombre_normalizado) VALUES
      ('${ids.custom}','${ids.mentor}','${ids.root}','Tema propio','tema propio'),
      ('${ids.removedCustom}','${ids.mentor}','${ids.qa}','Tema QA propio','tema qa propio');`);
  }, 30000);

  afterAll(async () => {
    try {
      await closeApplication();
    } finally {
      if (container) {
        docker(['stop', '--time', '5', container]);
        report.cleanup = true;
      }
      const directory = resolve(__dirname, '../../../docs/qa');
      mkdirSync(directory, { recursive: true });
      writeFileSync(
        resolve(directory, 'hu-6.21-persistence-isolated-results.json'),
        JSON.stringify(report, null, 2) + '\n',
      );
    }
  }, 30000);

  it('GET mine omite tópicos inactivos sin borrar su selección histórica', async () => {
    const response = await get('mine').expect(200);
    expect(response.body.data.map((item: { id: string }) => item.id)).not.toContain(ids.inactive);
    expect(response.body.data.map((item: { id: string }) => item.id)).toContain(ids.node);
    expect(
      sql(
        `SELECT count(*) FROM mentor_area WHERE id_mentor='${ids.mentor}' AND id_area='${ids.inactive}';`,
      ),
    ).toBe('1');
    evidence.push('GET mine filtra tópico inactivo sin borrar el vínculo');
  });

  it('PUT guardar → nueva aplicación y conexión → GET recargar conserva áreas y tópicos', async () => {
    const otherBefore = sql(
      `SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM mentor_area t WHERE id_mentor='${ids.otherMentor}';`,
    );
    const saved = await save([ids.rest, ids.custom]).expect(200);
    expect(saved.body.data.selectedIds).toEqual([ids.root]);
    expect(saved.body.data.intereses.map((item: { id: string }) => item.id).sort()).toEqual(
      [ids.rest, ids.custom].sort(),
    );
    await closeApplication();
    await openApplication();
    const reloaded = await get('mine').expect(200);
    expect(reloaded.body.data.map((item: { id: string }) => item.id).sort()).toEqual(
      [ids.rest, ids.custom].sort(),
    );
    const catalog = await get('catalog').expect(200);
    const root = catalog.body.data.find(
      (group: { area: { id: string } }) => group.area.id === ids.root,
    );
    expect(root.area.seleccionada).toBe(true);
    expect(root.intereses.find((item: { id: string }) => item.id === ids.rest).seleccionado).toBe(
      true,
    );
    expect(root.intereses.find((item: { id: string }) => item.id === ids.node).seleccionado).toBe(
      false,
    );
    expect(root.intereses.map((item: { id: string }) => item.id)).not.toContain(ids.inactive);
    expect(
      catalog.body.data.find((group: { area: { id: string } }) => group.area.id === ids.qa).area
        .bloqueada,
    ).toBe(true);
    expect(
      sql(`SELECT count(*) FROM mentor_interes_personalizado WHERE id='${ids.removedCustom}';`),
    ).toBe('0');
    expect(
      sql(
        `SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM mentor_area t WHERE id_mentor='${ids.otherMentor}';`,
      ),
    ).toBe(otherBefore);
    evidence.push(
      'Guardar y recargar desde nueva aplicación/conexión conserva selección; limpia área retirada y sus personalizados; preserva otro mentor',
    );
  }, 30000);

  it('rechaza guardar un tópico inactivo sin cambiar la configuración', async () => {
    const before = snapshot();
    const response = await save([ids.inactive]).expect(400);
    expect(response.body.error.code).toBe('INTEREST_INVALID');
    expect(snapshot()).toBe(before);
    evidence.push('Guardar tópico inactivo responde 400 sin escrituras persistidas');
  });

  it('dos guardados concurrentes de la misma selección no duplican vínculos', async () => {
    await Promise.all([
      save([ids.rest, ids.custom]).expect(200),
      save([ids.rest, ids.custom]).expect(200),
    ]);
    expect(sql(`SELECT count(*) FROM mentor_area WHERE id_mentor='${ids.mentor}';`)).toBe('2');
    expect(
      sql(`SELECT count(DISTINCT id_area) FROM mentor_area WHERE id_mentor='${ids.mentor}';`),
    ).toBe('2');
    expect(
      (await get('mine').expect(200)).body.data.map((item: { id: string }) => item.id).sort(),
    ).toEqual([ids.rest, ids.custom].sort());
    evidence.push('Concurrencia real: dos PUT confirman la misma selección sin duplicados');
  });

  it('un fallo de inserción revierte también las bajas y la eliminación de personalizados', async () => {
    sql(`CREATE FUNCTION reject_test_topic() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id_area='${ids.rest}'::uuid THEN RAISE EXCEPTION 'Fallo aislado de inserción'; END IF; RETURN NEW; END $$;
      CREATE TRIGGER reject_test_topic BEFORE INSERT ON mentor_area FOR EACH ROW EXECUTE FUNCTION reject_test_topic();`);
    try {
      const before = snapshot();
      await save([ids.rest, ids.custom]).expect(500);
      expect(snapshot()).toBe(before);
      evidence.push(
        'Rollback PostgreSQL real: fallo al insertar restaura vínculos y personalizados eliminados dentro de la transacción',
      );
    } finally {
      sql('DROP TRIGGER reject_test_topic ON mentor_area; DROP FUNCTION reject_test_topic();');
    }
  });
});
