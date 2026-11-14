import type { INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Prisma } from '../src/generated/prisma/client';
import { JobPostingsModule } from '../src/modules/job-postings/job-postings.module';
import { ElasticsearchService } from '../src/modules/vacantes/indexacion/elasticsearch.service';
import { AuthenticationGuard } from '../src/shared/http/auth/guards/authentication.guard';
import { PermissionsGuard } from '../src/shared/http/auth/guards/permissions.guard';
import { ErrorHandlerFilter } from '../src/shared/http/filters/error-handler.filter';
import { PrismaService } from '../src/shared/infrastructure/database/prisma.service';
import { toJobPostingSearchDocument } from '../src/shared/infrastructure/search/job-posting-search-document';
import type { JobPostingSearchDocument } from '../src/shared/infrastructure/search/job-posting-search-document';
import type { AuthenticatedContext } from '../src/shared/security/contexts/actor-context';
import { AccessError } from '../src/shared/security/errors/access-error';
import {
  AUTHENTICATOR,
  type Authenticator,
} from '../src/shared/security/ports/authenticator.port';

const idA = '10000000-0000-4000-8000-000000000001';
const idB = '10000000-0000-4000-8000-000000000002';
const idMissing = '10000000-0000-4000-8000-000000000003';
const companyId = '20000000-0000-4000-8000-000000000001';
const session: AuthenticatedContext = {
  sessionId: 'test-session',
  actor: {
    id: 'graduate-user',
    email: 'graduate@example.test',
    name: null,
    role: 'titulado',
    permissions: [],
    credentialVersion: 1,
    scopes: { companyIds: [], graduateId: 'graduate-own', careerIds: [] },
  },
};

function vacancy(id: string) {
  return {
    id,
    titulo: `Titulo oficial ${id}`,
    modalidad: 'REMOTO',
    nivel_experiencia: 'Junior',
    descripcion_tecnica: 'Descripcion oficial',
    fecha_publicacion: null,
    created_at: new Date('2026-11-01T12:00:00.000Z'),
    estado: 'PUBLICADO',
    fecha_cierre: null as Date | null,
    empresa: {
      razon_social: 'Empresa oficial',
      descripcion: null,
      descripcion_larga: null,
      logo_url: null,
      banner_url: null,
    },
    vacante_requerimiento_laboral_registros: [
      {
        requerimiento_laboral: {
          requerimiento_habilidad_registros: [
            {
              id_area: 'area-backend',
              nivel_requerimiento: null,
              area: { nombre: 'Backend' },
            },
          ],
        },
      },
    ],
  };
}

function indexed(id: string): JobPostingSearchDocument {
  return toJobPostingSearchDocument(
    {
      id,
      titulo: 'Titulo obsoleto del indice',
      id_empresa: companyId,
      empresa: { razon_social: 'Empresa obsoleta' },
      estado: 'PUBLICADO',
      created_at: new Date('2026-11-01T12:00:00.000Z'),
      fecha_cierre: null,
    },
    new Date('2026-11-14T12:00:00.000Z'),
  );
}

interface OfficialWhere {
  id?: string | { in: string[] };
  estado: { in: string[] };
  OR: [{ fecha_cierre: null }, { fecha_cierre: { gt: Date } }];
}

describe('HU7 -> listado oficial -> detalle HU8 (Prisma y fetch simulados)', () => {
  let app: INestApplication;
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();
  const authenticator: jest.Mocked<Authenticator> = { execute: jest.fn() };
  let sources: ReturnType<typeof vacancy>[];
  let documents: JobPostingSearchDocument[];
  const legacyIndex = {
    indexVacancy: jest.fn(),
    ensureVacancyIndex: jest.fn(),
  };
  const canonicalFindMany = jest.fn();
  const findMany = jest.fn();
  const findFirst = jest.fn();
  const findUnique = jest.fn();
  const configValues: Record<string, unknown> = {
    ELASTICSEARCH_NODE: 'http://search.invalid',
    ELASTICSEARCH_INDEX_JOB_POSTINGS: 'job-postings-v1',
    ELASTICSEARCH_INDEX_VACANTES: 'vacantes',
  };
  const prisma = {
    vacante: { findMany, findFirst },
    titulado: { findUnique },
    vacanteRequisitoTecnico: { findMany: canonicalFindMany },
  };

  function officialMatches(where: OfficialWhere) {
    return sources.filter(
      (row) =>
        (where.id === undefined ||
          (typeof where.id === 'string'
            ? row.id === where.id
            : where.id.in.includes(row.id))) &&
        where.estado.in.includes(row.estado) &&
        (row.fecha_cierre === null ||
          row.fecha_cierre > where.OR[1].fecha_cierre.gt),
    );
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [JobPostingsModule],
      providers: [
        { provide: AUTHENTICATOR, useValue: authenticator },
        { provide: APP_GUARD, useClass: AuthenticationGuard },
        { provide: APP_GUARD, useClass: PermissionsGuard },
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(ConfigService)
      .useValue({ get: (key: string) => configValues[key] })
      .overrideProvider(ElasticsearchService)
      .useValue(legacyIndex)
      .compile();
    app = module.createNestApplication();
    app.useLogger(false);
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new ErrorHandlerFilter());
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    sources = [vacancy(idA), vacancy(idB)];
    documents = [indexed(idB), indexed(idA)];
    authenticator.execute.mockReset().mockResolvedValue(session);
    findMany
      .mockReset()
      .mockImplementation(async ({ where }: Prisma.VacanteFindManyArgs) =>
        officialMatches(where as OfficialWhere),
      );
    findFirst
      .mockReset()
      .mockImplementation(
        async ({ where }: Prisma.VacanteFindFirstArgs) =>
          officialMatches(where as OfficialWhere)[0] ?? null,
      );
    findUnique.mockReset().mockResolvedValue({
      perfil_area_registros: [
        { area_id: 'area-backend', descripcion_profesional: null, area: null },
      ],
      experiencia_laboral_registros: [],
      certificacion_registros: [],
    });
    canonicalFindMany.mockReset().mockResolvedValue([
      {
        id: '30000000-0000-4000-8000-000000000001',
        id_vacante: idB,
        competencia_tecnica: 'PostgreSQL',
        nivel_esperado: 'AVANZADO',
        tipo: 'OBLIGATORIO',
        descripcion: null,
        creado_en: new Date('2026-11-01T12:00:00.000Z'),
      },
    ]);
    fetchMock
      .mockReset()
      .mockImplementation(async (_url: string, init: RequestInit) => {
        const query = JSON.parse(init.body as string) as {
          from: number;
          size: number;
        };
        return {
          ok: true,
          json: async () => ({
            hits: {
              total: { value: documents.length, relation: 'eq' },
              hits: documents
                .slice(query.from, query.from + query.size)
                .map((document) => ({ _id: document.id, _source: document })),
            },
          }),
        };
      });
    global.fetch = fetchMock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    expect(legacyIndex.indexVacancy).not.toHaveBeenCalled();
    expect(legacyIndex.ensureVacancyIndex).not.toHaveBeenCalled();
  });
  afterAll(async () => app?.close());

  function list(
    query: Record<string, string | number | undefined> = { search: 'Backend' },
  ) {
    return request(app.getHttpServer())
      .get('/api/v1/job-postings')
      .query(query)
      .set('Authorization', 'Bearer test-session');
  }

  it('exige sesion antes de buscar o consultar Prisma', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/job-postings?search=Backend')
      .expect(401);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(findMany).not.toHaveBeenCalled();
  });

  it('sin texto mantiene datos, orden, afinidad y ruta independiente de Elasticsearch', async () => {
    fetchMock.mockRejectedValue(new Error('No debe consultar Elasticsearch'));
    const response = await list({}).expect(200);
    expect(Object.keys(response.body)).toEqual(['data']);
    expect(response.body.data.map((row: { id: string }) => row.id)).toEqual([
      idA,
      idB,
    ]);
    expect(response.body.data[0].porcentajeAfinidad).toBe(100);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(findMany.mock.calls[0][0].where).not.toHaveProperty('id');
  });

  it('preserva el orden de candidatos, pero muestra datos y afinidad oficiales', async () => {
    const response = await list({
      search: 'Backend',
      graduateId: 'foreign-profile',
    }).expect(200);
    expect(Object.keys(response.body)).toEqual(['data']);
    expect(response.body.data.map((row: { id: string }) => row.id)).toEqual([
      idB,
      idA,
    ]);
    expect(response.body.data[0]).toMatchObject({
      titulo: `Titulo oficial ${idB}`,
      descripcionTecnica: 'Descripcion oficial',
      empresa: { razonSocial: 'Empresa oficial' },
      porcentajeAfinidad: 100,
    });
    expect(JSON.stringify(response.body)).not.toContain('obsoleto');
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'graduate-own' } }),
    );
    expect(fetchMock.mock.calls[0][0]).toBe(
      'http://search.invalid/job-postings-v1/_search',
    );
    const query = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(query.query.bool.must[0].multi_match).toMatchObject({
      query: 'Backend',
      fields: ['titulo^3', 'razon_social^2'],
    });
    expect(
      query.query.bool.filter[3].bool.should[1].range.fecha_cierre.gt,
    ).toBe(findMany.mock.calls[0][0].where.OR[1].fecha_cierre.gt.toISOString());
  });

  it.each(['CERRADA', 'BORRADOR', 'VENCIDA', 'CIERRE_EXACTO', 'INEXISTENTE'])(
    'Prisma descarta %s sin rellenar la pagina ni dar un total enganoso',
    async (caso) => {
      documents = [indexed(idMissing), indexed(idB)];
      const stale = vacancy(idMissing);
      if (caso === 'VENCIDA') {
        stale.fecha_cierre = new Date('2000-01-01T00:00:00.000Z');
      } else if (caso === 'CIERRE_EXACTO') {
        findMany.mockImplementation(
          async ({ where }: Prisma.VacanteFindManyArgs) => {
            stale.fecha_cierre = (where as OfficialWhere).OR[1].fecha_cierre.gt;
            return officialMatches(where as OfficialWhere);
          },
        );
      } else {
        stale.estado = caso;
      }
      if (caso !== 'INEXISTENTE') {
        sources.push(stale);
      }
      const response = await list({
        search: 'Backend',
        page: 1,
        limit: 2,
      }).expect(200);
      expect(response.body).toMatchObject({ data: [{ id: idB }] });
      expect(response.body.data).toHaveLength(1);
      expect(response.body).not.toHaveProperty('total');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    },
  );

  it('conserva la segunda ventana aunque la primera quede vacia en Prisma', async () => {
    documents = [indexed(idMissing), indexed(idB)];
    const first = await list({ search: 'Backend', page: 1, limit: 1 }).expect(
      200,
    );
    expect(first.body).toEqual({ data: [] });
    expect(findUnique).not.toHaveBeenCalled();
    const second = await list({ search: 'Backend', page: 2, limit: 1 }).expect(
      200,
    );
    expect(second.body.data.map((row: { id: string }) => row.id)).toEqual([
      idB,
    ]);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).from).toBe(1);
    expect(findMany.mock.calls[1][0].where.id).toEqual({ in: [idB] });
  });

  it('no inventa coincidencias para vacantes vigentes ausentes del indice', async () => {
    documents = [];
    await list().expect(200, { data: [] });
    expect(findMany).not.toHaveBeenCalled();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('conserva la lectura para otros roles sin consultar perfiles ajenos', async () => {
    authenticator.execute.mockResolvedValue({
      ...session,
      actor: { ...session.actor, role: 'empresa' },
    });
    const response = await list().expect(200);
    expect(
      response.body.data.map(
        (row: { porcentajeAfinidad: number | null }) => row.porcentajeAfinidad,
      ),
    ).toEqual([null, null]);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('navega del identificador oficial al detalle y a los requisitos canonicos HU2/HU8', async () => {
    const response = await list().expect(200);
    const id = response.body.data[0].id as string;
    await request(app.getHttpServer())
      .get(`/api/v1/job-postings/${id}`)
      .set('Authorization', 'Bearer test-session')
      .expect(200);
    const requirements = await request(app.getHttpServer())
      .get(`/api/v1/job-postings/${id}/requisitos`)
      .set('Authorization', 'Bearer test-session')
      .expect(200);
    expect(requirements.body).toMatchObject({
      idVacante: idB,
      requisitos: [{ competencia: 'PostgreSQL' }],
    });
    expect(canonicalFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id_vacante: idB } }),
    );
    sources[1].estado = 'CERRADA';
    canonicalFindMany.mockClear();
    await request(app.getHttpServer())
      .get(`/api/v1/job-postings/${id}/requisitos`)
      .set('Authorization', 'Bearer test-session')
      .expect(404);
    expect(canonicalFindMany).not.toHaveBeenCalled();
  });

  it.each([
    { page: '0' },
    { page: '-1' },
    { page: '1.5' },
    { page: 'NaN' },
    { page: '1001', limit: '10' },
    { limit: '0' },
    { limit: '101' },
    { search: 'x'.repeat(201) },
  ])('rechaza parametros invalidos antes de consultar: %p', async (query) => {
    await list({ search: 'Backend', ...query }).expect(400);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(findMany).not.toHaveBeenCalled();
  });

  it('rechaza parametros repetidos o estructurados', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/job-postings?search=a&search=b')
      .set('Authorization', 'Bearer test-session')
      .expect(400);
    await request(app.getHttpServer())
      .get('/api/v1/job-postings?search[x]=a')
      .set('Authorization', 'Bearer test-session')
      .expect(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('respeta una denegacion del autenticador sin llegar a los servicios', async () => {
    authenticator.execute.mockRejectedValue(new AccessError('FORBIDDEN'));
    await list().expect(403);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(findMany).not.toHaveBeenCalled();
  });

  it('devuelve 503 controlado sin consultar Prisma ni reemplazar la busqueda por todo el listado', async () => {
    fetchMock.mockRejectedValue(new Error('Elasticsearch no disponible'));
    await list().expect(503);
    expect(findMany).not.toHaveBeenCalled();
  });
});
