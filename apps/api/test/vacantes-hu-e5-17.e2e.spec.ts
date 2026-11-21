import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { VacantesController } from '../src/modules/vacantes/vacantes.controller';
import { VacantesService } from '../src/modules/vacantes/vacantes.service';
import { JOB_POSTING_AFFINITY_DATA } from '../src/modules/job-postings/application/ports/job-posting-affinity-data.port';
import { CalculateJobPostingAffinity } from '../src/modules/job-postings/application/use-cases/calculate-job-posting-affinity.use-case';
import { ErrorHandlerFilter } from '../src/shared/http/filters/error-handler.filter';
import { PrismaService } from '../src/shared/infrastructure/database/prisma.service';

const vacancy = '44500000-0000-4000-8000-000000000001';
const application = '44800000-0000-4000-8000-000000000001';
const route = `/api/v1/vacantes/${vacancy}`;
const profile = {
  formacion_academica_registros: [{}], experiencia_laboral_registros: [{}],
  certificacion_registros: [{}], proyecto_registros: [{}],
  perfil_area_registros: [{ descripcion_profesional: 'Analista' }],
};
const applications = { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn(), update: jest.fn() };
const transaction = { postulacion: applications, $queryRaw: jest.fn(), $executeRaw: jest.fn() };
// HU-10: VacantesService calcula la afinidad inicial al postular; aquí no hay perfil que calcular
const affinityData = { readProfiles: jest.fn(), readRequirements: jest.fn() };
const calculateAffinity = { execute: jest.fn() };
const db = {
  postulacion: applications, titulado: { findFirst: jest.fn() },
  vacante: { findUnique: jest.fn(), findFirst: jest.fn(), count: jest.fn() }, empresa: { count: jest.fn() },
  $transaction: (work: (tx: typeof transaction) => Promise<unknown>) => work(transaction),
};

describe('HU-E5-17 · contratos HTTP de Vacantes', () => {
  let app: INestApplication;
  let actorId: string;
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [VacantesController],
      providers: [
        VacantesService,
        { provide: PrismaService, useValue: db },
        { provide: CalculateJobPostingAffinity, useValue: calculateAffinity },
        { provide: JOB_POSTING_AFFINITY_DATA, useValue: affinityData },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalGuards({ canActivate(context: ExecutionContext) {
      context.switchToHttp().getRequest().auth = { actor: { id: actorId } };
      return true;
    } });
    app.useGlobalFilters(new ErrorHandlerFilter());
    await app.init();
  });
  afterAll(() => app.close());
  beforeEach(() => {
    jest.resetAllMocks();
    actorId = 'usuario-prueba';
    db.titulado.findFirst.mockResolvedValue(profile);
    db.vacante.findUnique.mockResolvedValue({ estado: 'PUBLICADA' });
  });

  it('CA-01 crea una sola fila al repetir la postulación', async () => {
    const rows: { id_usuario: string; id_vacante: string }[] = [];
    applications.findFirst.mockImplementation(({ where }) => rows.find(row =>
      row.id_usuario === where.id_usuario && row.id_vacante === where.id_vacante));
    applications.create.mockImplementation(({ data }) => rows.push(data));
    for (const yaExistia of [false, true]) {
      await request(app.getHttpServer()).post(`${route}/postulaciones`)
        .expect(201, { data: { postulada: true, yaExistia } });
    }
    expect(rows).toHaveLength(1);
  });

  it.each([
    ['CA-02', 'PUBLICADA', false, 'PROFILE_INCOMPLETE'],
    ['CA-03', 'CERRADA', true, 'JOB_POSTING_UNAVAILABLE'],
    ['CA-03', 'PAUSADA', true, 'JOB_POSTING_UNAVAILABLE'],
  ] as const)('%s rechaza estado %s con perfil completo=%s', async (_, estado, complete, code) => {
    db.vacante.findUnique.mockResolvedValue({ estado });
    if (!complete) { db.titulado.findFirst.mockResolvedValue({ ...profile, proyecto_registros: [] }); }
    const response = await request(app.getHttpServer()).post(`${route}/postulaciones`).expect(409);
    expect(response.body.error.code).toBe(code);
    expect(applications.create).not.toHaveBeenCalled();
  });

  it('CA-04 limita ambas consultas al usuario autenticado', async () => {
    applications.findMany.mockResolvedValue([]);
    await request(app.getHttpServer()).get(`${route}/postulaciones/mia`).expect(200, { data: { postulada: false } });
    await request(app.getHttpServer()).get('/api/v1/vacantes/mis-postulaciones').expect(200, { data: [] });
    expect(applications.findFirst.mock.calls[0][0].where).toEqual({ id_usuario: 'usuario-prueba', id_vacante: vacancy });
    expect(applications.findMany.mock.calls[0][0].where).toEqual({ id_usuario: 'usuario-prueba' });
  });

  it('CA-04 cada titulado ve exclusivamente su postulación en ambas rutas', async () => {
    const rows = [
      { id: application, id_usuario: 'titulado-a', id_vacante: vacancy },
      { id: '44800000-0000-4000-8000-000000000002', id_usuario: 'titulado-b', id_vacante: '44500000-0000-4000-8000-000000000002' },
    ];
    type Row = (typeof rows)[number];
    function selectRows(where: Partial<Row> = {}) {
      return rows.filter(row => Object.entries(where).every(([key, value]) => row[key as keyof Row] === value));
    }
    applications.findMany.mockImplementation(({ where }) => selectRows(where));
    applications.findFirst.mockImplementation(({ where }) => selectRows(where)[0] ?? null);

    for (const own of rows) {
      actorId = own.id_usuario;
      const list = await request(app.getHttpServer()).get('/api/v1/vacantes/mis-postulaciones').expect(200);
      expect(list.body.data.map((item: { id: string }) => item.id)).toEqual([own.id]);
      for (const candidate of rows) {
        await request(app.getHttpServer()).get(`/api/v1/vacantes/${candidate.id_vacante}/postulaciones/mia`)
          .expect(200, { data: { postulada: candidate.id === own.id } });
      }
    }
  });

  it('CA-05 devuelve exclusivamente los campos públicos de la oferta', async () => {
    db.vacante.findFirst.mockResolvedValue({ id: vacancy, titulo: 'Analista', estado: 'PUBLICADA',
      descripcion_tecnica: null, modalidad: null, nivel_experiencia: null, postulacion_registros: [{ correo: 'privado@example.test' }] });
    await request(app.getHttpServer()).get(`${route}/oferta`).expect(200, { data: {
      id: vacancy, title: 'Analista', companyName: null, description: null, modality: null,
      experienceLevel: null, publishedAt: null, isAvailable: true,
    } });
  });

  it.each([true, false])('CA-06 aplica el alcance de empresa al listar y cambiar etapa (acceso=%s)', async access => {
    db.vacante.count.mockResolvedValue(Number(access));
    db.empresa.count.mockResolvedValue(Number(access));
    applications.findMany.mockResolvedValue([]);
    applications.findFirst.mockResolvedValue({ id: application, vacante: { id_empresa: 'empresa-prueba' } });
    applications.update.mockResolvedValue({ id: application, estado: 'entrevista' });
    await request(app.getHttpServer()).get(`${route}/postulantes`).expect(access ? 200 : 404);
    await request(app.getHttpServer()).patch(`${route}/postulantes/${application}/etapa`)
      .send({ etapa: 'entrevista' }).expect(access ? 200 : 403);
    expect(db.vacante.count.mock.calls[0][0].where).toMatchObject({ id: vacancy, empresa: { OR: expect.arrayContaining([{ id_usuario: 'usuario-prueba' }]) } });
    expect(db.empresa.count.mock.calls[0][0].where).toMatchObject({ id: 'empresa-prueba', OR: expect.arrayContaining([{ id_usuario: 'usuario-prueba' }]) });
    expect(applications.update).toHaveBeenCalledTimes(Number(access));
  });
});
