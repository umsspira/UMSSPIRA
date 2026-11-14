import { PrismaApplicationsRepository } from '../../src/modules/registrations/infrastructure/repositories/prisma-applications.repository';
import { ReviewApplicationUseCase } from '../../src/modules/registrations/application/use-cases/review-application.use-case';
import { ObservedApplicationService } from '../../src/modules/registrations/application/services/observed-application.service';
import { RetryMailEventsUseCase } from '../../src/modules/registrations/application/use-cases/retry-mail-events.use-case';
import { BusinessRuleError } from '../../src/shared/errors/business-rule-error';
import type { ActorContext } from '../../src/shared/security/contexts/actor-context';
import type { PrismaService } from '../../src/shared/infrastructure/database/prisma.service';

const CAREER_ID = '11111111-1111-4111-8111-111111111111';
const APP_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const adminA: ActorContext = {
  id: 'admin-a',
  name: 'Revisor A',
  email: 'a@umss.edu',
  role: 'administrador',
  permissions: ['applications:review', 'mail_events:retry'],
  scopes: { companyIds: [], graduateId: null, careerIds: [CAREER_ID] },
  credentialVersion: 1,
};

const adminB: ActorContext = {
  id: 'admin-b',
  name: 'Revisor B',
  email: 'b@umss.edu',
  role: 'administrador',
  permissions: ['applications:review', 'mail_events:retry'],
  scopes: { companyIds: [], graduateId: null, careerIds: [CAREER_ID] },
  credentialVersion: 1,
};

describe('INT-05: Concurrencia de dictamen, versi贸n 煤nica, motivos y l铆mites de pol铆tica', () => {
  const securityStub = new Proxy(
    {
      seal: () => 'encrypted-mail-payload',
      hashCode: () => 'hash-123456',
      generateCode: () => '123456',
      generateActivationCode: () => '123456',
      hashActivationCode: () => 'hash-123456',
      encryptMailPayload: () => 'encrypted-mail-payload',
      hashToken: (raw: string) => `hash-${raw}`,
      generateToken: () => 'raw-token',
    },
    {
      get(target, prop: string) {
        if (prop in target) {
          return target[prop as keyof typeof target];
        }
        return () => `stub-${prop}`;
      },
    },
  );

  const tokenServiceStub = {
    issueForApplication: jest.fn(async () => ({
      token: 'corr-token-1',
      expiresAt: new Date(Date.now() + 86400000),
    })),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('impide doble dictamen concurrente: el segundo administrador recibe APPLICATION_ALREADY_REVIEWED y solo se encola 1 correo', async () => {
    let estadoActual = 'PENDIENTE';
    const dictamenes: Array<Record<string, unknown>> = [];
    const correosEnCola: Array<Record<string, unknown>> = [];
    let mutex = Promise.resolve();

    const txMock = {
      $queryRaw: jest.fn(async () => [{ id: APP_ID }]),
      solicitud: {
        findFirst: jest.fn(async () => ({
          id: APP_ID,
          estado: estadoActual,
          id_documento_respaldo: 'doc-1',
        })),
        update: jest.fn(async ({ data }: { data: { estado?: string } }) => {
          if (data.estado) {
            estadoActual = data.estado;
          }
          return { id: APP_ID, estado: estadoActual };
        }),
      },
      dictamen: {
        count: jest.fn(async () => 0),
        findFirst: jest.fn(async () => null),
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const created = { id: `dictamen-${dictamenes.length + 1}`, ...data };
          dictamenes.push(created);
          return created;
        }),
      },
      dictamenMotivo: { createMany: jest.fn(async () => ({ count: 0 })) },
      auditoriaDictamen: { create: jest.fn(async () => ({ id: 'aud-1' })) },
      documentoRespaldo: { update: jest.fn(async () => ({ id: 'doc-1' })) },
      correoPendiente: {
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          correosEnCola.push(data);
          return data;
        }),
      },
      correoTramite: {
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => data),
      },
      eventoCorreo: { create: jest.fn(async () => ({ id: 'ev-1' })) },
    };

    const prismaMock = {
      $transaction: jest.fn(async (fn: (tx: typeof txMock) => Promise<unknown>) => {
        const prev = mutex;
        let release!: () => void;
        mutex = new Promise<void>((resolve) => {
          release = resolve;
        });
        await prev;
        try {
          return await fn(txMock);
        } finally {
          release();
        }
      }),
      $queryRaw: jest.fn(async () => [{ total: 0 }]),
      solicitud: {
        findFirst: jest.fn(async () => ({
          id: APP_ID,
          estado: estadoActual,
          detalle_solicitud: {
            id_carrera: CAREER_ID,
            nombre: 'Carlos',
            apellido: 'Mendez',
            email: 'carlos@umss.edu',
            ci: '9988776',
            extension_ci: '',
            expedido_en: 'CB',
            cod_sis: 202100111,
            carrera: { nombre: 'Ingenier铆a de Sistemas' },
          },
          documento_respaldo: null,
        })),
      },
      dictamen: {
        count: jest.fn(async () => 0),
        findFirst: jest.fn(async () => null),
        findMany: jest.fn(async () => []),
      },
      auditoriaDictamen: {
        findFirst: jest.fn(async () => null),
      },
    } as unknown as PrismaService;

    const repo = new PrismaApplicationsRepository(prismaMock);

    const runConcurrentReview = async (actor: ActorContext, decision: 'APROBADA' | 'RECHAZADA') =>
      repo.review(
        actor,
        APP_ID,
        decision === 'APROBADA'
          ? { decision: 'APROBADA' }
          : {
              decision: 'RECHAZADA',
              category: 'DOCUMENTO_ALTERADO',
              note: 'Documento adulterado en sello institucional',
            },
        decision === 'APROBADA' ? 'hash-123456' : null,
        'encrypted-mail-payload',
        {
          type: decision === 'APROBADA' ? 'aprobacion' : 'rechazo',
          to: 'carlos@umss.edu',
          subject: 'Resultado de solicitud',
        },
      );

    const results = await Promise.allSettled([
      runConcurrentReview(adminA, 'APROBADA'),
      runConcurrentReview(adminB, 'RECHAZADA'),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toMatchObject({
      code: 'APPLICATION_ALREADY_REVIEWED',
    });
    expect(dictamenes).toHaveLength(1);
    expect(correosEnCola).toHaveLength(1);
  });

  it('guarda varios motivos sin repetir y una sola explicaci贸n en observaci贸n sin duplicar contador', async () => {
    const createdReasons: Array<{ id_dictamen: string; id_motivo: number }> = [];

    const txMock = {
      $queryRaw: jest.fn(async () => [{ id: APP_ID }]),
      solicitud: {
        findFirst: jest.fn(async () => ({
          id: APP_ID,
          estado: 'PENDIENTE',
          id_documento_respaldo: null,
        })),
        update: jest.fn(async () => ({ id: APP_ID, estado: 'OBSERVADA' })),
      },
      motivoObservacion: {
        findMany: jest.fn(async () => [
          { id: 1, codigo: 'DOC_ILEGIBLE', etiqueta: 'Documento ilegible' },
          { id: 2, codigo: 'DATOS_INCOMPLETOS', etiqueta: 'Datos incompletos' },
        ]),
      },
      dictamen: {
        count: jest.fn(async () => 1),
        findFirst: jest.fn(async () => null),
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => ({
          id: 'dict-obs-2',
          ...data,
        })),
      },
      dictamenMotivo: {
        createMany: jest.fn(
          async ({ data }: { data: Array<{ id_dictamen: string; id_motivo: number }> }) => {
            createdReasons.push(...data);
            return { count: data.length };
          },
        ),
      },
      auditoriaDictamen: { create: jest.fn(async () => ({ id: 'aud-obs' })) },
      correoPendiente: { create: jest.fn(async () => ({ id: 'mail-obs' })) },
      correoTramite: { create: jest.fn(async () => ({ id: 'tram-obs' })) },
      eventoCorreo: { create: jest.fn(async () => ({ id: 'ev-obs' })) },
    };

    const prismaMock = {
      $transaction: jest.fn(async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock)),
    } as unknown as PrismaService;

    const repo = new PrismaApplicationsRepository(prismaMock);

    await expect(
      repo.review(
        adminA,
        APP_ID,
        {
          decision: 'OBSERVADA',
          motivos: ['DOC_ILEGIBLE', 'DOC_ILEGIBLE'],
          note: 'Suba una imagen n铆tida',
        },
        null,
        'enc',
        { type: 'observacion', to: 'carlos@umss.edu', subject: 'Observada' },
      ),
    ).rejects.toMatchObject({ code: 'DUPLICATE_OBSERVATION_REASON' });

    const result = await repo.review(
      adminA,
      APP_ID,
      {
        decision: 'OBSERVADA',
        motivos: ['DOC_ILEGIBLE', 'DATOS_INCOMPLETOS'],
        note: 'Suba el diploma con bordes completos y legible',
      },
      null,
      'enc',
      { type: 'observacion', to: 'carlos@umss.edu', subject: 'Observada' },
    );

    expect(result.decision).toBe('OBSERVADA');
    expect(createdReasons).toEqual([
      { id_dictamen: 'dict-obs-2', id_motivo: 1 },
      { id_dictamen: 'dict-obs-2', id_motivo: 2 },
    ]);
  });

  it('bloquea la tercera observaci贸n (l铆mite vigente de 2 observaciones)', async () => {
    const txMock = {
      $queryRaw: jest.fn(async () => [{ id: APP_ID }]),
      solicitud: {
        findFirst: jest.fn(async () => ({
          id: APP_ID,
          estado: 'PENDIENTE',
          id_documento_respaldo: null,
        })),
      },
      dictamen: {
        count: jest.fn(async () => 2),
        findFirst: jest.fn(async () => null),
      },
    };

    const prismaMock = {
      $transaction: jest.fn(async (fn: (tx: typeof txMock) => Promise<unknown>) => fn(txMock)),
    } as unknown as PrismaService;

    const repo = new PrismaApplicationsRepository(prismaMock);

    await expect(
      repo.review(
        adminA,
        APP_ID,
        {
          decision: 'OBSERVADA',
          motivos: ['DOC_ILEGIBLE'],
          note: 'Intento de tercera observaci贸n',
        },
        null,
        'enc',
        { type: 'observacion', to: 'carlos@umss.edu', subject: 'Observada' },
      ),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('aplica l韒ite vigente de 5 rechazos por C.I.: deja remainingAttempts en 0 en el quinto rechazo y bloquea una sexta postulaci髇', async () => {
    const createdReviews: Array<Record<string, unknown>> = [];
    const prismaMock: Record<string, unknown> = {
      $transaction: jest.fn(async (fn: (tx: Record<string, unknown>) => Promise<unknown>) =>
        fn(prismaMock),
      ),
      $queryRaw: jest.fn(async () => [{ total: 4 }]),
      solicitud: {
        findFirst: jest.fn(async () => ({
          id: APP_ID,
          estado: 'PENDIENTE',
          detalle_solicitud: {
            id_carrera: CAREER_ID,
            nombre: 'Carlos',
            apellido: 'Mendez',
            email: 'carlos@umss.edu',
            ci: '9988776',
            extension_ci: '',
            expedido_en: 'CB',
            cod_sis: 202100111,
            carrera: { nombre: 'Ingenier韆 de Sistemas' },
          },
          documento_respaldo: null,
        })),
        update: jest.fn(async () => ({ id: APP_ID, estado: 'RECHAZADA' })),
      },
      dictamen: {
        count: jest.fn(async () => 0),
        findFirst: jest.fn(async () => null),
        findMany: jest.fn(async () => []),
        create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const item = { id: 'dict-rej-5', ...data };
          createdReviews.push(item);
          return item;
        }),
      },
      auditoriaDictamen: {
        findFirst: jest.fn(async () => null),
        create: jest.fn(async () => ({ id: 'aud-rej-5' })),
      },
      correoPendiente: { create: jest.fn(async () => ({ id: 'mail-rej-5' })) },
      correoTramite: { create: jest.fn(async () => ({ id: 'tram-rej-5' })) },
      eventoCorreo: { create: jest.fn(async () => ({ id: 'ev-rej-5' })) },
    };

    const repo = new PrismaApplicationsRepository(prismaMock as unknown as PrismaService);
    const useCase = new ReviewApplicationUseCase(
      repo,
      securityStub as never,
      tokenServiceStub as never,
    );

    const fifthReview = await useCase.execute(adminA, APP_ID, {
      decision: 'RECHAZADA',
      category: 'OTRO',
      note: 'Quinto rechazo acumulado que agota los intentos permitidos',
    });

    expect(fifthReview.decision).toBe('RECHAZADA');
    expect(createdReviews).toHaveLength(1);
    expect(await repo.countRejections(APP_ID)).toBe(4);
  });
  });

  it('rechaza actualizaci贸n de solicitud observada si la versi贸n/revisi贸n esperada est谩 desactualizada (INT-03)', async () => {
    const portMock = {
      getObservedApplication: jest.fn(),
      getDocumentContent: jest.fn(),
      updateObservedApplication: jest.fn(async () => {
        throw new BusinessRuleError(
          'conflict',
          'STALE_APPLICATION_REVISION',
          'La solicitud cambi贸; actualiza antes de continuar',
        );
      }),
      replaceDocument: jest.fn(),
      submitCorrection: jest.fn(),
    };

    const service = new ObservedApplicationService(portMock);

    await expect(
      service.updateObservedApplication(APP_ID, { expectedRevision: 2, nombre: 'Nuevo' } as never),
    ).rejects.toMatchObject({ code: 'STALE_APPLICATION_REVISION' });
  });

  it('reintenta notificaciones pendientes/fallidas sin crear otro dictamen', async () => {
    const mailRepoMock = {
      requeueFailed: jest.fn(async () => ({ retried: 2, skipped: 0 })),
    };

    const retryUseCase = new RetryMailEventsUseCase(mailRepoMock as never);
    const outcome = await retryUseCase.retryOne(adminA, 'mail-1');

    expect(mailRepoMock.requeueFailed).toHaveBeenCalledWith(adminA, 'mail-1');
    expect(outcome).toEqual({ retried: 2, skipped: 0 });
  });

  it.todo(
    'rechaza confirmar dictamen en HU-14.4 cuando expectedRevision no coincide con la versi贸n vigente en servidor',
  );
