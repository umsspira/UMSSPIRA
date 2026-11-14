import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { StatusQueryController } from '../../src/modules/registrations/http/controllers/status-query.controller';
import { StatusQueryService } from '../../src/modules/registrations/application/services/status-query.service';
import { StatusMailService } from '../../src/modules/registrations/application/services/status-mail.service';
import { PrismaStatusQueryReader } from '../../src/modules/registrations/infrastructure/repositories/prisma-status-query.reader';
import { ActivationAccessService } from '../../src/modules/registrations/application/services/activation-access.service';
import { CorrectionTokenService } from '../../src/modules/registrations/application/services/correction-token.service';
import { NodeRegistrationSecurity } from '../../src/modules/registrations/infrastructure/security/registration-security';
import { PrismaService } from '../../src/shared/infrastructure/database/prisma.service';
import { RATE_LIMITER, type RateLimiter } from '../../src/modules/auth/application/ports/rate-limiter.port';
import { REGISTRATION_SECURITY } from '../../src/modules/registrations/application/ports/registration-security.port';
import { STATUS_MAIL_DISPATCHER, STATUS_QUERY_GENERIC_MESSAGE, STATUS_QUERY_READER } from '../../src/modules/registrations/application/contracts/request-status.dto';
import { CORRECTION_TOKEN_PORT } from '../../src/modules/registrations/application/ports/correction-token.port';
import { APPLICATIONS_REPOSITORY } from '../../src/modules/registrations/application/ports/applications-repository.port';

interface AppRecord {
  id: string; estado: string; activada_en: Date | null; fecha_creacion: Date; email: string; nombre: string;
  review: { id: string; categoria: string; justificacion: string; motivos: Array<{ motivo: { id: number; etiqueta: string } }> } | null;
}
interface MailPayload { to: string; subject: string; text: string; html: string }

describe('StatusQuery (HU-18 · E2E Integration)', () => {
  let app: INestApplication;
  let security: NodeRegistrationSecurity;
  const queuedMails: Array<{ id: string; contenido: string; expira_en: Date }> = [];
  const rateCounts = new Map<string, number>();
  const tokensSubsanacion: Array<{ id: string; id_solicitud: string; created_at: Date }> = [];
  let activationCooldownActive = false;

  const store: { apps: AppRecord[] } = {
    apps: [
      { id: 'app-pend', estado: 'PENDIENTE', activada_en: null, fecha_creacion: new Date('2026-11-10T10:00:00Z'), email: 'pendiente@umss.edu', nombre: 'Carlos Pendiente', review: null },
      { id: 'app-obs', estado: 'OBSERVADA', activada_en: null, fecha_creacion: new Date('2026-11-10T10:00:00Z'), email: 'observada@umss.edu', nombre: 'Elena Observada', review: { id: 'rev-obs', categoria: 'DOCUMENTO', justificacion: 'Documento borroso', motivos: [{ motivo: { id: 1, etiqueta: 'Título ilegible' } }] } },
      { id: 'app-rech', estado: 'RECHAZADA', activada_en: null, fecha_creacion: new Date('2026-11-10T10:00:00Z'), email: 'rechazada@umss.edu', nombre: 'Raul Rechazado', review: { id: 'rev-rech', categoria: 'IDENTIDAD', justificacion: 'CI no corresponde', motivos: [] } },
      { id: 'app-poract', estado: 'APROBADA', activada_en: null, fecha_creacion: new Date('2026-11-10T10:00:00Z'), email: 'poractivar@umss.edu', nombre: 'Ana PorActivar', review: null },
      { id: 'app-act', estado: 'APROBADA', activada_en: new Date('2026-11-12T10:00:00Z'), fecha_creacion: new Date('2026-11-10T10:00:00Z'), email: 'activa@umss.edu', nombre: 'Mario Activo', review: null },
      { id: 'app-cambio', estado: 'PENDIENTE', activada_en: null, fecha_creacion: new Date('2026-11-10T10:00:00Z'), email: 'verificado@umss.edu', nombre: 'Sofia Verificada', review: null },
      { id: 'app-mult-old', estado: 'RECHAZADA', activada_en: null, fecha_creacion: new Date('2026-10-01T10:00:00Z'), email: 'reiterada@umss.edu', nombre: 'Pedro Reiterado', review: { id: 'rev-old', categoria: 'DATOS', justificacion: 'Antigua rechazada', motivos: [] } },
      { id: 'app-mult-new', estado: 'PENDIENTE', activada_en: null, fecha_creacion: new Date('2026-11-11T10:00:00Z'), email: 'reiterada@umss.edu', nombre: 'Pedro Reiterado', review: null },
    ],
  };

  const createPrismaMock = () => {
    const mock: Record<string, unknown> = {
      $transaction: jest.fn(async (cb: (tx: unknown) => Promise<unknown>) => cb(mock)),
      $queryRaw: jest.fn(async () => []),
      solicitud: {
        findFirst: jest.fn(async ({ where }: { where: { detalle_solicitud?: { is?: { email?: { equals?: string } } } } }) => {
          const email = where.detalle_solicitud?.is?.email?.equals?.toLowerCase();
          const matches = store.apps.filter((a) => a.email.toLowerCase() === email);
          if (!matches.length) { return null; }
          matches.sort((a, b) => b.fecha_creacion.getTime() - a.fecha_creacion.getTime());
          const target = matches[0];
          return { id: target.id, estado: target.estado, activada_en: target.activada_en, detalle_solicitud: { email: target.email, nombre: target.nombre, apellido: '' } };
        }),
        findUnique: jest.fn(async ({ where }: { where: { id: string } }) => {
          const a = store.apps.find((x) => x.id === where.id);
          if (!a) { return null; }
          return {
            id: a.id, estado: a.estado, activada_en: a.activada_en,
            detalle_solicitud: { id: 'det-' + a.id, email: a.email, nombre: a.nombre },
            dictamen_registros: a.review ? [{ id: a.review.id, categoria: a.review.categoria, justificacion: a.review.justificacion, motivos: a.review.motivos.map((m) => ({ motivo: m.motivo })) }] : [],
          };
        }),
        update: jest.fn(async () => ({})),
      },
      tokenSubsanacion: {
        findMany: jest.fn(async ({ where }: { where: { id_solicitud: string } }) => tokensSubsanacion.filter((t) => t.id_solicitud === where.id_solicitud)),
      },
      controlReenvioOtp: {
        findUnique: jest.fn(async () => activationCooldownActive ? { bloqueado_hasta: null, enfriamiento_hasta: new Date(Date.now() + 30000), generaciones_ciclo: 1 } : null),
        upsert: jest.fn(async () => ({})),
      },
      correoPendiente: {
        create: jest.fn(async ({ data }: { data: { id: string; contenido: string; expira_en: Date } }) => {
          queuedMails.push(data);
          return data;
        }),
      },
      correoTramite: { create: jest.fn(async () => ({})) },
      dictamen: { create: jest.fn() },
    };
    return mock;
  };

  const prismaMock = createPrismaMock();

  const limiterMock: RateLimiter = {
    consume: jest.fn(async (key: string, _win: number, limit: number) => {
      const c = (rateCounts.get(key) ?? 0) + 1;
      rateCounts.set(key, c);
      return { allowed: c <= limit, remaining: Math.max(0, limit - c), retryAfterSeconds: 60 };
    }),
  };

  const correctionTokenMock = { saveToken: jest.fn(async (appId: string) => { tokensSubsanacion.push({ id: 'tok-' + Date.now(), id_solicitud: appId, created_at: new Date() }); }) };
  const appsRepoMock = { countRejections: jest.fn(async () => 1) };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => ({ WEB_BASE_URL: 'https://umsspira.bo', AUTH_JWT_SECRET: 'test-secret-key-at-least-32-chars-long' })] })],
      controllers: [StatusQueryController],
      providers: [
        StatusQueryService, StatusMailService, PrismaStatusQueryReader, ActivationAccessService, CorrectionTokenService, NodeRegistrationSecurity,
        { provide: PrismaService, useValue: prismaMock },
        { provide: RATE_LIMITER, useValue: limiterMock },
        { provide: REGISTRATION_SECURITY, useExisting: NodeRegistrationSecurity },
        { provide: STATUS_QUERY_READER, useExisting: PrismaStatusQueryReader },
        { provide: STATUS_MAIL_DISPATCHER, useExisting: StatusMailService },
        { provide: CORRECTION_TOKEN_PORT, useValue: correctionTokenMock },
        { provide: APPLICATIONS_REPOSITORY, useValue: appsRepoMock },
      ],
    }).compile();

    security = mod.get<NodeRegistrationSecurity>(NodeRegistrationSecurity);
    app = mod.createNestApplication();
    await app.init();
  });

  afterAll(async () => { await app.close(); });
  beforeEach(() => { queuedMails.length = 0; rateCounts.clear(); tokensSubsanacion.length = 0; activationCooldownActive = false; jest.clearAllMocks(); });

  const postStatus = (email: string) => request(app.getHttpServer()).post('/registrations/status-query').send({ email });
  const waitAsync = () => new Promise((r) => setTimeout(r, 35));

  it('1. pendiente: encola aviso institucional de revision sin datos internos', async () => {
    const res = await postStatus('pendiente@umss.edu').expect(202);
    expect(res.body.data.message).toBe(STATUS_QUERY_GENERIC_MESSAGE);
    await waitAsync();
    expect(queuedMails).toHaveLength(1);
    const m = security.open(queuedMails[0].contenido) as MailPayload;
    expect(m.to).toBe('pendiente@umss.edu');
    expect(m.html).toContain('en proceso de revisión');
    expect((prismaMock.dictamen as { create: jest.Mock }).create).not.toHaveBeenCalled();
  });

  it('2. observada: encola correo con motivos comunicables y enlace de correccion', async () => {
    await postStatus('observada@umss.edu').expect(202);
    await waitAsync();
    expect(queuedMails).toHaveLength(1);
    const m = security.open(queuedMails[0].contenido) as MailPayload;
    expect(m.html).toContain('Título ilegible');
    expect(m.html).toContain('https://umsspira.bo/register/correction/');
    expect((prismaMock.dictamen as { create: jest.Mock }).create).not.toHaveBeenCalled();
  });

  it('3. rechazada: encola correo con justificacion e intentos restantes', async () => {
    await postStatus('rechazada@umss.edu').expect(202);
    await waitAsync();
    expect(queuedMails).toHaveLength(1);
    const m = security.open(queuedMails[0].contenido) as MailPayload;
    expect(m.html).toContain('CI no corresponde');
    expect(m.html).toContain('intentos de registro disponibles');
  });

  it('4. aprobada por activar: invoca reenvio con codigo OTP', async () => {
    await postStatus('poractivar@umss.edu').expect(202);
    await waitAsync();
    expect(queuedMails).toHaveLength(1);
    const m = security.open(queuedMails[0].contenido) as MailPayload;
    expect(m.to).toBe('poractivar@umss.edu');
    expect(m.html).toContain('¡Tu solicitud fue aprobada!');
    expect(m.text).toMatch(/\b\d{6}\b/);
  });

  it('5. aprobada activa: correo de cuenta activa sin codigo ni activacion', async () => {
    await postStatus('activa@umss.edu').expect(202);
    await waitAsync();
    expect(queuedMails).toHaveLength(1);
    const m = security.open(queuedMails[0].contenido) as MailPayload;
    expect(m.to).toBe('activa@umss.edu');
    expect(m.html).toContain('https://umsspira.bo/login');
    expect(m.html).toContain('https://umsspira.bo/forgot-password');
    expect(m.html).not.toMatch(/\b\d{6}\b/);
  });

  it('6. sin coincidencia: 202 identico y cola vacia', async () => {
    const res = await postStatus('inexistente@umss.edu').expect(202);
    expect(res.body.data.message).toBe(STATUS_QUERY_GENERIC_MESSAGE);
    await waitAsync();
    expect(queuedMails).toHaveLength(0);
  });

  it('7. direccion vinculada: envia a la direccion verificada de la solicitud', async () => {
    await postStatus('verificado@umss.edu').expect(202);
    await waitAsync();
    expect(queuedMails).toHaveLength(1);
    const m = security.open(queuedMails[0].contenido) as MailPayload;
    expect(m.to).toBe('verificado@umss.edu');
  });

  it('8. varias solicitudes: resuelve la mas reciente (pendiente)', async () => {
    await postStatus('reiterada@umss.edu').expect(202);
    await waitAsync();
    expect(queuedMails).toHaveLength(1);
    const m = security.open(queuedMails[0].contenido) as MailPayload;
    expect(m.html).toContain('en proceso de revisión');
  });

  it('9. cooldown de consulta: suprime segundo envio sin variar 202', async () => {
    await postStatus('pendiente@umss.edu').expect(202);
    await postStatus('pendiente@umss.edu').expect(202);
    await waitAsync();
    expect(queuedMails).toHaveLength(1);
  });

  it('10. limites de subsanacion: omite generar token si cooldown activo', async () => {
    tokensSubsanacion.push({ id: 'tok-rec', id_solicitud: 'app-obs', created_at: new Date() });
    await postStatus('observada@umss.edu').expect(202);
    await waitAsync();
    expect(queuedMails).toHaveLength(0);
  });

  it('11. control de activacion seguro: captura cooldown sin exponer error', async () => {
    activationCooldownActive = true;
    await postStatus('poractivar@umss.edu').expect(202);
    await waitAsync();
    expect(queuedMails).toHaveLength(0);
  });
});
