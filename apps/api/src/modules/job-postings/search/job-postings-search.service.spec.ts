import {
  BadRequestException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { JobPostingSearchDocument } from '../../../shared/infrastructure/search/job-posting-search-document';
import { JobPostingsSearchService } from './job-postings-search.service';
import type { JobPostingsSearchOptions } from './job-postings-search.types';

const now = new Date('2026-11-14T12:00:00.000Z');
const document: JobPostingSearchDocument = {
  schema_version: 1,
  id: '10000000-0000-4000-8000-000000000001',
  titulo: 'Backend',
  id_empresa: '20000000-0000-4000-8000-000000000001',
  razon_social: 'Empresa de prueba',
  estado: 'PUBLICADO',
  disponible: true,
  created_at: '2026-11-01T12:00:00.000Z',
  fecha_cierre: '2026-11-15T12:00:00.000Z',
};

function body(
  sources: unknown[] = [document],
  total: unknown = { value: sources.length, relation: 'eq' },
) {
  return {
    timed_out: false,
    _shards: { failed: 0 },
    hits: {
      total,
      hits: sources.map((source) => ({
        _id:
          typeof source === 'object' && source !== null && 'id' in source
            ? source.id
            : document.id,
        _source: source,
      })),
    },
  };
}

function response(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status });
}

function service(values: Record<string, unknown> = {}) {
  return new JobPostingsSearchService(
    new ConfigService({
      ELASTICSEARCH_NODE: 'http://elasticsearch.invalid:9200/',
      ELASTICSEARCH_INDEX_VACANTES: 'vacantes',
      ELASTICSEARCH_INDEX_JOB_POSTINGS: 'ofertas-v1',
      ...values,
    }),
  );
}

describe('JobPostingsSearchService (fetch simulado, sin Elasticsearch)', () => {
  let http: jest.SpyInstance<
    ReturnType<typeof fetch>,
    Parameters<typeof fetch>
  >;
  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    http = jest.spyOn(globalThis, 'fetch').mockResolvedValue(response(body()));
  });
  afterEach(() => jest.restoreAllMocks());

  it('conserva data y total y aplica version, disponibilidad, estados, cierre y orden estable', async () => {
    await expect(
      service({ ELASTICSEARCH_API_KEY: 'clave-simulada' }).findActive(
        { search: ' Backend ' },
        now,
      ),
    ).resolves.toEqual({ data: [document], total: 1 });
    const [url, init] = http.mock.calls[0];
    expect(url).toBe('http://elasticsearch.invalid:9200/ofertas-v1/_search');
    expect(init?.headers).toMatchObject({
      Authorization: 'ApiKey clave-simulada',
    });
    const query: unknown = JSON.parse(String(init?.body));
    expect(query).toEqual({
      track_total_hits: true,
      from: 0,
      size: 10,
      query: {
        bool: {
          filter: [
            { term: { schema_version: 1 } },
            { term: { disponible: true } },
            {
              terms: {
                estado: [
                  'PUBLICADO',
                  'PUBLICADA',
                  'ACTIVA',
                  'ACTIVO',
                  'ACTIVE',
                  'PUBLISHED',
                ],
              },
            },
            {
              bool: {
                should: [
                  {
                    bool: { must_not: [{ exists: { field: 'fecha_cierre' } }] },
                  },
                  {
                    range: { fecha_cierre: { gt: '2026-11-14T12:00:00.000Z' } },
                  },
                ],
                minimum_should_match: 1,
              },
            },
          ],
          must: [
            {
              multi_match: {
                query: 'Backend',
                fields: ['titulo^3', 'razon_social^2'],
                fuzziness: 'AUTO',
              },
            },
          ],
        },
      },
      sort: [
        {
          created_at: {
            order: 'desc',
            missing: '_last',
            unmapped_type: 'date',
          },
        },
        { id: { order: 'asc' } },
      ],
    });
  });

  it('omite la condicion textual para una consulta vacia y acepta total numerico exacto', async () => {
    http.mockResolvedValue(response(body([], 0)));
    await expect(service().findActive({ search: ' ' }, now)).resolves.toEqual({
      data: [],
      total: 0,
    });
    const query: { query: { bool: object } } = JSON.parse(
      String(http.mock.calls[0][1]?.body),
    );
    expect(query.query.bool).not.toHaveProperty('must');
  });

  it.each([
    'PUBLICADO',
    'PUBLICADA',
    'ACTIVA',
    'ACTIVO',
    'ACTIVE',
    'PUBLISHED',
  ])('acepta el estado publicado %s sin fecha de cierre', async (estado) => {
    const source = { ...document, estado, fecha_cierre: null };
    http.mockResolvedValue(response(body([source])));
    await expect(service().findActive({}, now)).resolves.toEqual({
      data: [source],
      total: 1,
    });
  });

  it.each([
    { schema_version: 2 },
    { disponible: false },
    { estado: 'CERRADA' },
    { estado: 'Publicada' },
    { estado: null },
    { fecha_cierre: now.toISOString() },
    { fecha_cierre: '2026-11-13T12:00:00.000Z' },
    { fecha_cierre: 'invalida' },
    { fecha_cierre: undefined },
    { id: 'no-uuid' },
    { id_empresa: 'no-uuid' },
    { created_at: undefined },
    { titulo: 3 },
  ])(
    'rechaza documentos incompatibles, cerrados o vencidos sin reducir silenciosamente el total',
    async (patch) => {
      http.mockResolvedValue(response(body([{ ...document, ...patch }])));
      await expect(service().findActive({}, now)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    },
  );

  it('captura una sola referencia temporal aunque el parametro cambie durante fetch', async () => {
    const reference = new Date(now);
    http.mockImplementation(async () => {
      reference.setTime(Date.parse('2026-12-01T12:00:00.000Z'));
      return response(body());
    });
    await expect(service().findActive({}, reference)).resolves.toEqual({
      data: [document],
      total: 1,
    });
  });

  it('no deduplica una pagina conservando un total inconsistente', async () => {
    http.mockResolvedValue(response(body([document, document])));
    await expect(service().findActive({}, now)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('exige que _id corresponda al identificador canonico', async () => {
    const result = body();
    result.hits.hits[0]._id = 'otro-id';
    http.mockResolvedValue(response(result));
    await expect(service().findActive({}, now)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('respeta el orden recibido y calcula from/size sin repaginar localmente', async () => {
    const source = { ...document, id: '10000000-0000-4000-8000-000000000003' };
    http.mockResolvedValue(
      response(body([source], { value: 3, relation: 'eq' })),
    );
    await expect(
      service().findActive({ page: 2, limit: 2 }, now),
    ).resolves.toEqual({ data: [source], total: 3 });
    expect(JSON.parse(String(http.mock.calls[0][1]?.body))).toMatchObject({
      from: 2,
      size: 2,
    });
  });

  it('admite una pagina posterior al total como vacia conservando el total exacto', async () => {
    http.mockResolvedValue(response(body([], { value: 1, relation: 'eq' })));
    await expect(
      service().findActive({ page: 2, limit: 2 }, now),
    ).resolves.toEqual({ data: [], total: 1 });
  });

  it.each([
    { page: 0 },
    { page: -1 },
    { page: 1.5 },
    { page: Infinity },
    { page: NaN },
    { limit: 0 },
    { limit: 101 },
    { limit: 1.5 },
    { limit: NaN },
    { page: 1001, limit: 10 },
    { page: Number.MAX_SAFE_INTEGER, limit: 100 },
    { page: '1' },
    { limit: null },
    { search: 1 },
  ])(
    'rechaza parametros invalidos antes de efectuar solicitudes',
    async (options) => {
      await expect(
        service().findActive(options as JobPostingsSearchOptions, now),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(http).not.toHaveBeenCalled();
    },
  );

  it.each([
    {},
    { hits: { hits: [] } },
    body([], { value: 0, relation: 'gte' }),
    body([], -1),
    body([], 0.5),
    body([], { value: 1, relation: 'eq' }),
    { ...body(), timed_out: true },
    { ...body(), _shards: { failed: 1 } },
  ])(
    'rechaza respuestas parciales y totales ausentes, aproximados o inconsistentes',
    async (result) => {
      http.mockResolvedValue(response(result));
      await expect(service().findActive({}, now)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    },
  );

  it.each([404, 500, 503])(
    'traduce HTTP %i a error controlado',
    async (status) => {
      http.mockResolvedValue(response({ error: 'detalle interno' }, status));
      await expect(service().findActive({}, now)).rejects.toThrow(
        'No fue posible consultar las vacantes. Intenta nuevamente.',
      );
    },
  );

  it('traduce fallos de red sin devolver resultados vacios', async () => {
    http.mockRejectedValue(new Error('fallo simulado'));
    await expect(service().findActive({}, now)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('rechaza JSON malformado', async () => {
    http.mockResolvedValue(new Response('{'));
    await expect(service().findActive({}, now)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it.each([
    { ELASTICSEARCH_NODE: '' },
    { ELASTICSEARCH_INDEX_JOB_POSTINGS: 'vacantes' },
    { ELASTICSEARCH_INDEX_JOB_POSTINGS: '*' },
  ])(
    'rechaza configuracion insegura sin efectuar solicitudes',
    async (config) => {
      await expect(service(config).findActive({}, now)).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(http).not.toHaveBeenCalled();
    },
  );
});
