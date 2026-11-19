import { ConfigModule } from '@nestjs/config';
import { type CanActivate, type ExecutionContext, type INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { ErrorHandlerFilter } from '../../src/shared/http/filters/error-handler.filter';
import type {
  ActorContext,
  AuthenticatedContext,
} from '../../src/shared/security/contexts/actor-context';
import { ListApplicationsController } from '../../src/modules/registrations/http/controllers/list-applications.controller';
import { GetApplicationController } from '../../src/modules/registrations/http/controllers/get-application.controller';
import { GetApplicationDocumentController } from '../../src/modules/registrations/http/controllers/get-application-document.controller';
import { ReviewApplicationController } from '../../src/modules/registrations/http/controllers/review-application.controller';
import { StatusQueryController } from '../../src/modules/registrations/http/controllers/status-query.controller';
import { RegistrationTrafficGuard } from '../../src/modules/registrations/http/guards/registration-traffic.guard';
import { ListApplicationsUseCase } from '../../src/modules/registrations/application/use-cases/list-applications.use-case';
import { GetApplicationUseCase } from '../../src/modules/registrations/application/use-cases/get-application.use-case';
import { GetApplicationDocumentUseCase } from '../../src/modules/registrations/application/use-cases/get-application-document.use-case';
import { ReviewApplicationUseCase } from '../../src/modules/registrations/application/use-cases/review-application.use-case';
import { StatusQueryService } from '../../src/modules/registrations/application/services/status-query.service';
import { STATUS_QUERY_GENERIC_MESSAGE } from '../../src/modules/registrations/application/contracts/request-status.dto';
import { PrismaApplicationsRepository } from '../../src/modules/registrations/infrastructure/repositories/prisma-applications.repository';
import { PrismaService } from '../../src/shared/infrastructure/database/prisma.service';
import { BusinessRuleError } from '../../src/shared/errors/business-rule-error';

const SYSTEMS_CAREER_ID = '11111111-1111-4111-8111-111111111111';
const INFORMATICS_CAREER_ID = '22222222-2222-4222-8222-222222222222';
const SYSTEMS_APP_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const INFORMATICS_APP_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const systemsAdmin: ActorContext = {
  id: 'admin-sys-1',
  name: 'Admin Sistemas',
  email: 'admin.sis@umss.edu',
  role: 'administrador',
  permissions: ['applications:read', 'applications:review', 'mail_events:retry'],
  scopes: { companyIds: [], graduateId: null, careerIds: [SYSTEMS_CAREER_ID] },
  credentialVersion: 1,
};

function extractCareerIds(node: unknown): string[] {
  if (!node || typeof node !== 'object') {
    return [];
  }
  const obj = node as Record<string, unknown>;
  const detail = obj.detalle_solicitud as
    | { is?: { id_carrera?: { in?: string[] } } }
    | undefined;
  if (detail?.is?.id_carrera?.in) {
    return detail.is.id_carrera.in;
  }
  if (Array.isArray(obj.AND)) {
    for (const child of obj.AND) {
      const found = extractCareerIds(child);
      if (found.length > 0) {
        return found;
      }
    }
  }
  return [];
}

function hasNotPendingFilter(node: unknown): boolean {
  if (!node || typeof node !== 'object') {
    return false;
  }
  const obj = node as Record<string, unknown>;
  if ((obj.estado as { not?: string } | undefined)?.not === 'PENDIENTE') {
    return true;
  }
  if (Array.isArray(obj.AND)) {
    return obj.AND.some(hasNotPendingFilter);
  }
  return false;
}

describe('INT-05: Permisos por carrera y consulta pública protegida (integration)', () => {
  let app: INestApplication;
  let currentActor: ActorContext = systemsAdmin;

  const solicitudesStore = [
    {
      id: SYSTEMS_APP_ID,
      estado: 'PENDIENTE',
      fecha_creacion: new Date('2026-11-10T10:00:00Z'),
      detalle_solicitud: {
        id: 'det-sys',
        id_carrera: SYSTEMS_CAREER_ID,
        nombre: 'Ana',
        apellido: 'Perez',
        email: 'ana@umss.edu',
        ci: '1234567',
        extension_ci: '',
        expedido_en: 'CB',
        cod_sis: 202001234,
        carrera: { id: SYSTEMS_CAREER_ID, nombre: 'Ingeniería de Sistemas' },
      },
      documento_respaldo: { ruta_storage: 'file-sys-1' },
    },
    {
      id: INFORMATICS_APP_ID,
      estado: 'PENDIENTE',
      fecha_creacion: new Date('2026-11-10T10:05:00Z'),
      detalle_solicitud: {
        id: 'det-inf',
        id_carrera: INFORMATICS_CAREER_ID,
        nombre: 'Luis',
        apellido: 'Gomez',
        email: 'luis@umss.edu',
        ci: '7654321',
        extension_ci: '',
        expedido_en: 'LP',
        cod_sis: 202005678,
        carrera: { id: INFORMATICS_CAREER_ID, nombre: 'Ingeniería Informática' },
      },
      documento_respaldo: { ruta_storage: 'file-inf-1' },
    },
  ];

  const prismaMock: Record<string, unknown> = {
    $transaction: jest.fn(async (arg: unknown): Promise<unknown> => {
      if (typeof arg === 'function') {
        return (arg as (tx: Record<string, unknown>) => Promise<unknown>)(prismaMock);
      }
      return Promise.all(arg as Promise<unknown>[]);
    }),
    $queryRaw: jest.fn(async () => [{ total: 0 }]),
    solicitud: {
      count: jest.fn(async ({ where }: { where?: unknown }) => {
        if (hasNotPendingFilter(where)) {
          return 0;
        }
        const allowedCareers = extractCareerIds(where);
        return solicitudesStore.filter((s) =>
          allowedCareers.includes(s.detalle_solicitud.id_carrera),
        ).length;
      }),
      findMany: jest.fn(async ({ where }: { where?: unknown }) => {
        if (hasNotPendingFilter(where)) {
          return [];
        }
        const allowedCareers = extractCareerIds(where);
        return solicitudesStore.filter((s) =>
          allowedCareers.includes(s.detalle_solicitud.id_carrera),
        );
      }),
      findFirst: jest.fn(
        async ({
          where,
        }: {
          where: { id?: string; detalle_solicitud?: { is?: { id_carrera?: { in?: string[] } } } };
        }) => {
          const allowed = where.detalle_solicitud?.is?.id_carrera?.in ?? [];
          return (
            solicitudesStore.find(
              (s) =>
                (!where.id || s.id === where.id) &&
                allowed.includes(s.detalle_solicitud.id_carrera),
            ) ?? null
          );
        },
      ),
    },
    archivoRegistro: {
      findUnique: jest.fn(async ({ where }: { where: { id: string } }) => ({
        id: where.id,
        nombre: 'respaldo.pdf',
        mime: 'application/pdf',
        tamano_bytes: 1024,
        ruta: 'private/respaldo.pdf',
      })),
    },
    dictamen: {
      count: jest.fn(async () => 0),
      findMany: jest.fn(async () => []),
    },
    auditoriaDictamen: {
      findFirst: jest.fn(async () => null),
    },
  };

  const reviewUseCaseMock = {
    execute: jest.fn(async (actor: ActorContext, id: string) => {
      const found = solicitudesStore.find(
        (s) => s.id === id && actor.scopes.careerIds.includes(s.detalle_solicitud.id_carrera),
      );
      if (!found) {
        throw new BusinessRuleError(
          'missing',
          'APPLICATION_NOT_FOUND',
          'La solicitud no existe o no está a tu cargo',
        );
      }
      return { id: 'rev-1', applicationId: id, decision: 'APROBADA', status: 'APROBADA' };
    }),
  };

  const statusDispatches: Array<{ email: string; kind: string }> = [];
  const rateCounters = new Map<string, number>();

  const statusQueryService = new StatusQueryService(
    {
      consume: async (key: string, _windowMs: number, limit: number) => {
        const next = (rateCounters.get(key) ?? 0) + 1;
        rateCounters.set(key, next);
        return {
          allowed: next <= limit,
          remaining: Math.max(0, limit - next),
          retryAfterSeconds: 60,
        };
      },
    },
    {
      findLatestByEmail: async (email: string) => {
        const match = solicitudesStore.find((s) => s.detalle_solicitud.email === email);
        if (!match) {
          return null;
        }
        return {
          applicationId: match.id,
          email: match.detalle_solicitud.email,
          fullName: `${match.detalle_solicitud.nombre} ${match.detalle_solicitud.apellido}`,
          state: 'aprobada',
          activated: true,
        };
      },
    },
    {
      dispatch: async (payload) => {
        statusDispatches.push({ email: payload.email, kind: payload.kind });
      },
    },
  );

  beforeAll(async () => {
    const injectActorGuard: CanActivate = {
      canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest<{ auth?: AuthenticatedContext }>();
        req.auth = { actor: currentActor, sessionId: 'sess-int05' };
        return true;
      },
    };

    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ ignoreEnvFile: true, isGlobal: true })],
      controllers: [
        ListApplicationsController,
        GetApplicationController,
        GetApplicationDocumentController,
        ReviewApplicationController,
        StatusQueryController,
      ],
      providers: [
        { provide: APP_GUARD, useValue: injectActorGuard },
        { provide: PrismaService, useValue: prismaMock },
        PrismaApplicationsRepository,
        {
          provide: ListApplicationsUseCase,
          useFactory: (repo: PrismaApplicationsRepository) => new ListApplicationsUseCase(repo),
          inject: [PrismaApplicationsRepository],
        },
        {
          provide: GetApplicationUseCase,
          useFactory: (repo: PrismaApplicationsRepository) => new GetApplicationUseCase(repo),
          inject: [PrismaApplicationsRepository],
        },
        {
          provide: GetApplicationDocumentUseCase,
          useFactory: (repo: PrismaApplicationsRepository) =>
            new GetApplicationDocumentUseCase(repo),
          inject: [PrismaApplicationsRepository],
        },
        { provide: ReviewApplicationUseCase, useValue: reviewUseCaseMock },
        { provide: StatusQueryService, useValue: statusQueryService },
      ],
    })
      .overrideGuard(RegistrationTrafficGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new ErrorHandlerFilter());
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    currentActor = systemsAdmin;
    statusDispatches.length = 0;
    rateCounters.clear();
  });

  it('filtra la bandeja por carrera autorizada y oculta solicitudes de otras carreras', async () => {
    const res = await request(app.getHttpServer()).get('/applications').expect(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].id).toBe(SYSTEMS_APP_ID);
  });

  it('deniega abrir detalle o documento de una solicitud fuera de la carrera del administrador', async () => {
    await request(app.getHttpServer()).get(`/applications/${INFORMATICS_APP_ID}`).expect(404);
    await request(app.getHttpServer())
      .get(`/applications/${INFORMATICS_APP_ID}/document`)
      .expect(404);
  });

  it('deniega dictaminar una solicitud perteneciente a una carrera no autorizada', async () => {
    await request(app.getHttpServer())
      .post(`/applications/${INFORMATICS_APP_ID}/review`)
      .send({ decision: 'APROBADA' })
      .expect(404);
  });

  it('rechaza entradas inválidas con 400 en dictamen y consulta de estado sin mutar datos', async () => {
    await request(app.getHttpServer())
      .post(`/applications/${SYSTEMS_APP_ID}/review`)
      .send({ decision: 'RECHAZADA', note: 'corto' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/registrations/status-query')
      .send({ email: 'correo-invalido' })
      .expect(400);

    expect(statusDispatches).toHaveLength(0);
  });

  it('devuelve siempre la misma respuesta pública en status-query (202) y respeta límites sin duplicar dictamen ni activar cuentas', async () => {
    const resExisting = await request(app.getHttpServer())
      .post('/registrations/status-query')
      .send({ email: 'ana@umss.edu' })
      .expect(202);

    const resUnknown = await request(app.getHttpServer())
      .post('/registrations/status-query')
      .send({ email: 'noexiste@umss.edu' })
      .expect(202);

    expect(resExisting.body.data.message).toBe(STATUS_QUERY_GENERIC_MESSAGE);
    expect(resUnknown.body.data.message).toBe(STATUS_QUERY_GENERIC_MESSAGE);

    await new Promise((r) => setTimeout(r, 15));
    expect(statusDispatches).toEqual([{ email: 'ana@umss.edu', kind: 'aprobada_activa' }]);

    const resCooldown = await request(app.getHttpServer())
      .post('/registrations/status-query')
      .send({ email: 'ana@umss.edu' })
      .expect(202);

    expect(resCooldown.body.data.message).toBe(STATUS_QUERY_GENERIC_MESSAGE);
    await new Promise((r) => setTimeout(r, 15));
    expect(statusDispatches).toHaveLength(1);
  });

  it.todo(
    'deniega consultar historial de expediente (HU-17.2) a administrador de otra carrera',
  );
});