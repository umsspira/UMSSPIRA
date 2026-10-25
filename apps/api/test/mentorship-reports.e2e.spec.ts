import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureHttp } from '../src/shared/http/configuration/configure-http';
import { PrismaService } from '../src/shared/infrastructure/database/prisma.service';
import { AUTHENTICATOR } from '../src/shared/security/ports/authenticator.port';
import type { ActorContext } from '../src/shared/security/contexts/actor-context';
import { MENTOR_REPOSITORY } from '../src/modules/mentorship/application/ports/mentor-repository.port';
import { MENTOR_CATALOG_REPOSITORY } from '../src/modules/mentorship/application/ports/mentor-catalog-repository.port';
import { MENTOR_AVAILABILITY_REPOSITORY } from '../src/modules/mentorship/application/ports/mentor-availability-repository.port';
import { REPORT_REPOSITORY } from '../src/modules/reports/application/ports/report-repository.port';
import { RATE_LIMITER } from '../src/modules/auth/application/ports/rate-limiter.port';
import type { Mentor } from '../src/modules/mentorship/domain/entities/mentor';
import type { GraduateReportRecord } from '../src/modules/reports/domain/entities/graduate-report';

const careerId = randomUUID();
const mentorId = randomUUID();
const graduate: ActorContext = {
  id: randomUUID(),
  email: 'titulado@example.com',
  name: 'María Pérez',
  role: 'titulado',
  credentialVersion: 1,
  permissions: ['mentores:self:write'],
  scopes: { graduateId: randomUUID(), companyIds: [], careerIds: [] },
};
const admin: ActorContext = {
  ...graduate,
  id: randomUUID(),
  role: 'administrador',
  permissions: ['mentores:manage', 'reportes:read'],
  scopes: { graduateId: null, companyIds: [], careerIds: [careerId] },
};
const mentor: Mentor = {
  id: mentorId,
  graduateId: graduate.scopes.graduateId!,
  graduateName: graduate.name ?? '',
  careerId,
  active: true,
  description: 'Mentora',
  experience: 'Desarrollo de software',
  relevantInformation: 'Dato reservado',
  photoUrl: null,
  experienceYears: 2,
  createdAt: new Date('2026-10-18'),
  updatedAt: new Date('2026-10-18'),
};
const record: GraduateReportRecord = {
  id: randomUUID(),
  careerId,
  careerName: 'Ingeniería de Sistemas',
  firstName: 'María',
  lastName: 'Pérez',
  email: 'maria@example.com',
  phone: '70000000',
  identityNumber: '1234567',
  identityComplement: '',
  issuedIn: 'CB',
  sisCode: '202012345',
  graduationYear: null,
  admissionDate: new Date('2020-02-01'),
  graduationDate: new Date('2025-05-01'),
  submittedAt: new Date('2026-10-18'),
  reviewedAt: null,
  justification: null,
  wantsMentorship: true,
  status: 'APROBADA',
};

describe('Mentorías y reportería: contratos HTTP y autorización', () => {
  let app: INestApplication;
  const mentors = {
    directory: jest.fn(),
    eligible: jest.fn(),
    own: jest.fn(),
    participate: jest.fn(),
    updateInformation: jest.fn(),
    clearInformation: jest.fn(),
    deactivate: jest.fn(),
  };
  const catalog = {
    areas: jest.fn(),
    setAreas: jest.fn(),
    interestCatalog: jest.fn(),
    interests: jest.fn(),
    addInterests: jest.fn(),
    removeInterest: jest.fn(),
  };
  const availability = { own: jest.fn(), update: jest.fn(), canReceiveRequests: jest.fn() };
  const reports = { metrics: jest.fn(), list: jest.fn(), exportData: jest.fn() };
  const limiter = { consume: jest.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(MENTOR_REPOSITORY)
      .useValue(mentors)
      .overrideProvider(MENTOR_CATALOG_REPOSITORY)
      .useValue(catalog)
      .overrideProvider(MENTOR_AVAILABILITY_REPOSITORY)
      .useValue(availability)
      .overrideProvider(REPORT_REPOSITORY)
      .useValue(reports)
      .overrideProvider(RATE_LIMITER)
      .useValue(limiter)
      .overrideProvider(AUTHENTICATOR)
      .useValue({
        execute: async (token: string) => ({
          actor:
            token === 'admin'
              ? admin
              : token === 'unassigned'
                ? { ...admin, scopes: { ...admin.scopes, careerIds: [] } }
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
    mentors.own.mockResolvedValue(mentor);
    mentors.participate.mockResolvedValue(mentor);
    mentors.deactivate.mockResolvedValue({ ...mentor, active: false });
    mentors.directory.mockResolvedValue([{ mentor, areas: [], availability: null }]);
    reports.metrics.mockResolvedValue({
      totalApplications: 2,
      approvedApplications: 1,
      observedApplications: 0,
      activeMentors: 1,
    });
    reports.list.mockResolvedValue({ records: [record], total: 1, page: 1, limit: 10 });
    reports.exportData.mockResolvedValue({ records: [record], careerNames: [record.careerName] });
    limiter.consume.mockResolvedValue({ allowed: true, retryAfterSeconds: 0 });
  });
  afterAll(async () => app?.close());

  it('publica únicamente la información pública del directorio', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/mentorship/profiles')
      .expect(200);
    expect(response.body.data[0].nombre).toBe(graduate.name);
    expect(JSON.stringify(response.body)).not.toContain('Dato reservado');
    expect(JSON.stringify(response.body)).not.toContain(graduate.id);
  });
  it('exige sesión y permiso para gestionar la participación', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/mentorship/my-profile/participation')
      .send({ esta_activo: true })
      .expect(401);
    await request(app.getHttpServer())
      .patch('/api/v1/mentorship/my-profile/participation')
      .set('Authorization', 'Bearer admin')
      .send({ esta_activo: true })
      .expect(403);
    expect(mentors.participate).not.toHaveBeenCalled();
  });
  it('deriva la identidad de la sesión y valida el cuerpo', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/mentorship/my-profile/participation')
      .set('Authorization', 'Bearer graduate')
      .set('x-user-id', admin.id)
      .send({ esta_activo: true, experiencia: 'Experiencia', anios_exp: 3 })
      .expect(200);
    expect(mentors.participate).toHaveBeenCalledWith(graduate.id, {
      esta_activo: true,
      experiencia: 'Experiencia',
      anios_exp: 3,
    });
    await request(app.getHttpServer())
      .patch('/api/v1/mentorship/my-profile/participation')
      .set('Authorization', 'Bearer graduate')
      .send({ esta_activo: 'true' })
      .expect(400);
  });
  it('devuelve 404 si todavía no existe el perfil', async () => {
    mentors.own.mockResolvedValue(null);
    const response = await request(app.getHttpServer())
      .get('/api/v1/mentorship/my-profile')
      .set('Authorization', 'Bearer graduate')
      .expect(404);
    expect(response.body.error.code).toBe('MENTOR_NOT_FOUND');
  });
  it('rechaza UUID inválidos e intereses repetidos antes de persistir', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/mentorship/my-profile/areas')
      .set('Authorization', 'Bearer graduate')
      .send({ areaIds: ['id-inválido'] })
      .expect(400);
    const id = randomUUID();
    await request(app.getHttpServer())
      .post('/api/v1/mentorship/interests')
      .set('Authorization', 'Bearer graduate')
      .send({ ids: [id, id] })
      .expect(409);
    expect(catalog.setAreas).not.toHaveBeenCalled();
    expect(catalog.addInterests).not.toHaveBeenCalled();
  });
  it('limita la desactivación administrativa a las carreras de la sesión', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/mentorship/profiles/' + mentorId + '/deactivate')
      .set('Authorization', 'Bearer admin')
      .expect(200);
    expect(mentors.deactivate).toHaveBeenCalledWith(mentorId, [careerId]);
  });
  it('valida el estado de disponibilidad y permite pausarlo', async () => {
    availability.update.mockResolvedValue({ status: 'EN_PAUSA', updatedAt: new Date() });
    await request(app.getHttpServer())
      .patch('/api/v1/mentorship/availability')
      .set('Authorization', 'Bearer graduate')
      .send({ availabilityStatus: 'EN_PAUSA' })
      .expect(200);
    expect(availability.update).toHaveBeenCalledWith(graduate.id, 'EN_PAUSA');
    await request(app.getHttpServer())
      .patch('/api/v1/mentorship/availability')
      .set('Authorization', 'Bearer graduate')
      .send({ availabilityStatus: 'OTHER' })
      .expect(400);
    await request(app.getHttpServer())
      .patch('/api/v1/mentorship/availability')
      .set('Authorization', 'Bearer graduate')
      .send({ availabilityStatus: 'AVAILABLE' })
      .expect(400);
  });
  it('protege los reportes por permiso y por alcance de carrera', async () => {
    await request(app.getHttpServer()).get('/api/v1/reports/metrics').expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/reports/metrics')
      .set('Authorization', 'Bearer graduate')
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/v1/reports/metrics')
      .set('Authorization', 'Bearer unassigned')
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/v1/reports/metrics')
      .query({ careerId: randomUUID() })
      .set('Authorization', 'Bearer admin')
      .expect(403);
    expect(reports.metrics).not.toHaveBeenCalled();
  });
  it('entrega indicadores reales y limita las consultas a las carreras asignadas', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/reports/metrics')
      .set('Authorization', 'Bearer admin')
      .expect(200);
    expect(response.body.data).toEqual({
      totalGraduates: 2,
      verifiedGraduates: 1,
      observedGraduates: 0,
      activeMentors: 1,
    });
    expect(reports.metrics).toHaveBeenCalledWith([careerId]);
  });
  it('pagina, filtra por estado y no inventa datos faltantes', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/reports/graduates?status=APROBADA')
      .set('Authorization', 'Bearer admin')
      .expect(200);
    expect(response.body.data.items[0].anioEgreso).toBeNull();
    expect(response.body.data.items[0].fechaRevision).toBeNull();
    expect(reports.list).toHaveBeenCalledWith([careerId], {
      page: 1,
      limit: 10,
      status: 'APROBADA',
    });
    await request(app.getHttpServer())
      .get('/api/v1/reports/graduates?limit=1001')
      .set('Authorization', 'Bearer admin')
      .expect(400);
    await request(app.getHttpServer())
      .get('/api/v1/reports/metrics?status=APROBADA')
      .set('Authorization', 'Bearer admin')
      .expect(400);
  });
  it('produce CSV con el mismo filtro y nombre de archivo descargable', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/reports/graduates/csv?status=APROBADA')
      .set('Authorization', 'Bearer admin')
      .expect(200);
    expect(response.headers['content-type']).toContain('text/csv');
    expect(response.headers['content-disposition']).toContain('.csv');
    expect(response.text).toContain('María');
    expect(reports.exportData).toHaveBeenCalledWith([careerId], { status: 'APROBADA' });
  });
  it('no exporta datos ficticios si no hay resultados', async () => {
    reports.exportData.mockResolvedValue({ records: [], careerNames: ['Sistemas'] });
    const response = await request(app.getHttpServer())
      .get('/api/v1/reports/graduates/pdf?status=RECHAZADA')
      .set('Authorization', 'Bearer admin')
      .expect(404);
    expect(response.body.error.code).toBe('REPORT_EMPTY');
  });
  it('aplica el límite de descargas antes de leer la base de datos', async () => {
    limiter.consume.mockResolvedValue({ allowed: false, retryAfterSeconds: 30 });
    const response = await request(app.getHttpServer())
      .get('/api/v1/reports/graduates/pdf')
      .set('Authorization', 'Bearer admin')
      .expect(429);
    expect(response.headers['retry-after']).toBe('30');
    expect(reports.exportData).not.toHaveBeenCalled();
  });
});
