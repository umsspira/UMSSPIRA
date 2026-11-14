import type { Client } from '@elastic/elasticsearch';
import { ConfigService } from '@nestjs/config';
import type { Prisma } from '../src/generated/prisma/client';
import { IndexacionVacantesService } from '../src/modules/indexacion-vacantes/indexacion-vacantes.service';
import { VACANTE_INDEXACION_SELECT } from '../src/modules/indexacion-vacantes/interfaces/vacante-indexable.interface';
import { JobPostingsSearchService } from '../src/modules/job-postings/search/job-postings-search.service';
import { getJobPostingSearchConfig } from '../src/shared/infrastructure/search/job-posting-search.config';
import type { JobPostingSearchDocument } from '../src/shared/infrastructure/search/job-posting-search-document';

type Source = Prisma.VacanteGetPayload<{
  select: typeof VACANTE_INDEXACION_SELECT;
}>;
type Entry = { index: string; id: string; document: JobPostingSearchDocument };
type Query = {
  from: number;
  size: number;
  query: {
    bool: {
      filter: [
        { term: { schema_version: number } },
        { term: { disponible: boolean } },
        { terms: { estado: string[] } },
        {
          bool: {
            should: [unknown, { range: { fecha_cierre: { gt: string } } }];
          };
        },
      ];
      must?: [{ multi_match: { query: string } }];
    };
  };
};

const now = new Date('2026-11-14T12:00:00.000Z');
function source(number: number, changes: Partial<Source> = {}): Source {
  return {
    id: `10000000-0000-4000-8000-${String(number).padStart(12, '0')}`,
    titulo: 'Desarrollador backend',
    id_empresa: '20000000-0000-4000-8000-000000000001',
    empresa: { razon_social: 'Empresa de prueba' },
    estado: 'PUBLICADO',
    created_at: new Date('2026-11-01T12:00:00.000Z'),
    fecha_cierre: new Date('2026-11-15T12:00:00.000Z'),
    ...changes,
  };
}

describe('HU4 -> HU7 (composicion simulada, sin registrar modulos ni consultar servicios)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('comparte documentos, aísla el indice antiguo, filtra vigencia y pagina sin perder el total', async () => {
    const config = new ConfigService({
      ELASTICSEARCH_NODE: 'http://elasticsearch.invalid:9200',
      ELASTICSEARCH_INDEX_VACANTES: 'vacantes',
      ELASTICSEARCH_INDEX_JOB_POSTINGS: 'job-postings-v1',
    });
    const { index } = getJobPostingSearchConfig(config);
    const documents = new Map<string, Entry>();
    const indices = new Set<string>(['vacantes']);
    const client = {
      indices: {
        exists: jest.fn(async ({ index: name }: { index: string }) =>
          indices.has(name),
        ),
        create: jest.fn(async ({ index: name }: { index: string }) => {
          indices.add(name);
          return {};
        }),
      },
      index: jest.fn(async (entry: Entry) => {
        documents.set(`${entry.index}/${entry.id}`, entry);
        return { _id: entry.id, _index: entry.index, result: 'created' };
      }),
    };
    const hu4 = new IndexacionVacantesService(
      client as unknown as Client,
      index,
    );
    const hu7 = new JobPostingsSearchService(config);
    const legacy: Entry = {
      index: 'vacantes',
      id: source(99).id,
      document: hu4.construirDocumento(source(99), now),
    };
    documents.set(`vacantes/${legacy.id}`, legacy);

    // Este doble evalua solo el subconjunto de consulta del ensayo, no el motor Elasticsearch.
    const http = jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        const name = decodeURIComponent(
          new URL(String(input)).pathname.split('/')[1],
        );
        const query: Query = JSON.parse(String(init?.body));
        const [version, availability, states, closing] =
          query.query.bool.filter;
        const reference = Date.parse(
          closing.bool.should[1].range.fecha_cierre.gt,
        );
        const text = query.query.bool.must?.[0].multi_match.query.toLowerCase();
        const matches = [...documents.values()]
          .filter((entry) => {
            const doc = entry.document;
            return (
              entry.index === name &&
              doc.schema_version === version.term.schema_version &&
              doc.disponible === availability.term.disponible &&
              states.terms.estado.includes(doc.estado ?? '') &&
              (doc.fecha_cierre === null ||
                Date.parse(doc.fecha_cierre) > reference) &&
              (!text ||
                [doc.titulo, doc.razon_social].some((value) =>
                  value?.toLowerCase().includes(text),
                ))
            );
          })
          .sort((a, b) => {
            const left =
              a.document.created_at === null
                ? -Infinity
                : Date.parse(a.document.created_at);
            const right =
              b.document.created_at === null
                ? -Infinity
                : Date.parse(b.document.created_at);
            return (
              (left === right ? 0 : right - left) || a.id.localeCompare(b.id)
            );
          });
        return new Response(
          JSON.stringify({
            hits: {
              total: { value: matches.length, relation: 'eq' },
              hits: matches
                .slice(query.from, query.from + query.size)
                .map((entry) => ({
                  _id: entry.id,
                  _source: entry.document,
                })),
            },
          }),
        );
      });

    // Se insertan en orden inverso para comprobar el desempate por identificador.
    await hu4.indexarVacante(source(2), now);
    await hu4.indexarVacante(source(1), now);
    await hu4.indexarVacante(source(3, { estado: 'CERRADA' }), now);
    await hu4.indexarVacante(
      source(4, { fecha_cierre: new Date(now.getTime() - 1) }),
      now,
    );
    await hu4.indexarVacante(
      source(5, { fecha_cierre: new Date(now.getTime() - 1) }),
      new Date(now.getTime() - 3_600_000),
    );
    expect(documents.get(`${index}/${source(5).id}`)?.document.disponible).toBe(
      true,
    );

    const first = await hu7.findActive(
      { search: 'Empresa', page: 1, limit: 1 },
      now,
    );
    const second = await hu7.findActive(
      { search: 'Empresa', page: 2, limit: 1 },
      now,
    );
    expect(first).toEqual({
      data: [documents.get(`${index}/${source(1).id}`)?.document],
      total: 2,
    });
    expect(second).toEqual({
      data: [documents.get(`${index}/${source(2).id}`)?.document],
      total: 2,
    });
    await expect(
      hu7.findActive({ search: 'Inexistente' }, now),
    ).resolves.toEqual({ data: [], total: 0 });

    await hu4.indexarVacante(source(1, { estado: 'CERRADA' }), now);
    const afterClosing = await hu7.findActive({}, now);
    expect(afterClosing.total).toBe(1);
    expect(afterClosing.data.map((doc) => doc.id)).toEqual([source(2).id]);
    expect(documents.get(`vacantes/${legacy.id}`)).toBe(legacy);
    expect(
      client.index.mock.calls.every(([entry]) => entry.index === index),
    ).toBe(true);
    expect(
      http.mock.calls.every(([url]) =>
        String(url).endsWith('/job-postings-v1/_search'),
      ),
    ).toBe(true);
  });
});
