import { jest } from '@jest/globals';
import { Client } from '@elastic/elasticsearch';
import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VacantesService } from '../vacantes.service';
import { ElasticsearchService } from './elasticsearch.service';
import { VacantesIndexService } from './vacantes-index.service';
import {
  VACANCY_INDEX_MAPPINGS,
  type VacancyIndexDocument,
} from './vacancy-index.types';

const VACANCY_ID = '00000000-0000-4000-8000-000000000001';
const COMPANY_ID = '11111111-1111-4111-8111-111111111111';

function vacancySource() {
  return {
    id: VACANCY_ID,
    idEmpresa: COMPANY_ID,
    empresa: 'TecnoAndes S.R.L.',
    titulo: 'Analista de Datos Junior',
    modalidad: 'Híbrido',
    estado: 'Disponible',
    fechaCreacion: '2026-10-15T10:00:00.000Z',
    descripcion: 'Analiza datos para apoyar decisiones.',
    ubicacion: 'Cochabamba',
    area: 'Datos y Analítica',
    condiciones: 'Jornada completa.',
    requisitos: [
      { id: '00000000-0000-4000-8000-000000000002', nombre: 'SQL' },
      { id: '00000000-0000-4000-8000-000000000003', nombre: 'Python' },
    ],
  };
}

class FakeElasticsearchClient {
  indexExists = false;
  failIndexing = false;
  readonly documents = new Map<string, VacancyIndexDocument>();
  readonly createRequests: unknown[] = [];
  readonly indexRequests: Array<{
    index: string;
    id: string;
    document: VacancyIndexDocument;
  }> = [];

  readonly indices = {
    exists: jest.fn(async () => this.indexExists),
    create: jest.fn(async (request: unknown) => {
      this.createRequests.push(request);
      this.indexExists = true;
      return { acknowledged: true };
    }),
  };

  readonly index = jest.fn(
    async (request: {
      index: string;
      id: string;
      document: VacancyIndexDocument;
    }) => {
      if (this.failIndexing) throw new Error('cluster privado');
      this.indexRequests.push(request);
      this.documents.set(`${request.index}/${request.id}`, request.document);
      return { result: 'created' };
    },
  );

  readonly search = jest.fn(async (request: Record<string, unknown>) => {
    const query = request.query as {
      match_all?: object;
      bool?: {
        should: Array<{
          term?: { id: string };
          match?: { titulo: { query: string } };
        }>;
      };
    };
    const documents = [...this.documents.values()];
    const matched = query.match_all
      ? documents
      : documents.filter((document) => {
          const clauses = query.bool?.should ?? [];
          return clauses.some((clause) => {
            if (clause.term) return document.id === clause.term.id;
            const titleQuery = clause.match?.titulo.query.toLowerCase();
            return titleQuery
              ? document.titulo.toLowerCase().includes(titleQuery)
              : false;
          });
        });

    return { hits: { hits: matched.map((document) => ({ _source: document })) } };
  });
}

function createServices() {
  const fakeClient = new FakeElasticsearchClient();
  const elasticsearchService = new ElasticsearchService(
    new ConfigService({ ELASTICSEARCH_INDEX_VACANTES: 'vacantes-test' }),
    fakeClient as unknown as Client,
  );
  const obtenerPorId = jest.fn(async () => vacancySource());
  const vacantesService = { obtenerPorId } as unknown as VacantesService;
  const indexService = new VacantesIndexService(
    vacantesService,
    elasticsearchService,
  );

  return { fakeClient, elasticsearchService, indexService, obtenerPorId };
}

describe('VacantesIndexService - HU5-S1-04', () => {
  it('AC1 indexa una vacante previamente persistida', async () => {
    const { fakeClient, indexService, obtenerPorId } = createServices();

    const response = await indexService.indexarVacante(VACANCY_ID);

    expect(obtenerPorId).toHaveBeenCalledWith(VACANCY_ID);
    expect(fakeClient.documents.size).toBe(1);
    expect(response).toEqual({
      indexed: true,
      id: VACANCY_ID,
      index: 'vacantes-test',
    });
  });

  it('AC2 utiliza vacante.id como _id de Elasticsearch', async () => {
    const { fakeClient, indexService } = createServices();

    await indexService.indexarVacante(VACANCY_ID);

    expect(fakeClient.indexRequests[0]).toMatchObject({
      index: 'vacantes-test',
      id: VACANCY_ID,
    });
  });

  it('AC3 mapea únicamente el contrato definido para el documento', async () => {
    const { fakeClient, indexService } = createServices();

    await indexService.indexarVacante(VACANCY_ID);

    expect(fakeClient.indexRequests[0]?.document).toEqual(vacancySource());
    expect(VACANCY_INDEX_MAPPINGS.properties.requisitos.type).toBe('nested');
  });

  it('AC4 incluye los requisitos asociados en el documento', async () => {
    const { fakeClient, indexService } = createServices();

    await indexService.indexarVacante(VACANCY_ID);

    expect(fakeClient.indexRequests[0]?.document.requisitos).toEqual([
      { id: '00000000-0000-4000-8000-000000000002', nombre: 'SQL' },
      { id: '00000000-0000-4000-8000-000000000003', nombre: 'Python' },
    ]);
  });

  it('AC5 reprocesa con el mismo índice e ID sin duplicar documentos', async () => {
    const { fakeClient, indexService } = createServices();

    await indexService.indexarVacante(VACANCY_ID);
    await indexService.indexarVacante(VACANCY_ID);

    expect(fakeClient.indexRequests).toHaveLength(2);
    expect(fakeClient.indexRequests[0]?.id).toBe(
      fakeClient.indexRequests[1]?.id,
    );
    expect(fakeClient.indexRequests[0]?.index).toBe(
      fakeClient.indexRequests[1]?.index,
    );
    expect(fakeClient.documents.size).toBe(1);
  });

  it('crea el índice con mapping cuando no existe', async () => {
    const { fakeClient, indexService } = createServices();

    await indexService.indexarVacante(VACANCY_ID);

    expect(fakeClient.indices.create).toHaveBeenCalledWith({
      index: 'vacantes-test',
      mappings: VACANCY_INDEX_MAPPINGS,
    });
  });

  it('no recrea el índice cuando ya existe', async () => {
    const { fakeClient, indexService } = createServices();
    fakeClient.indexExists = true;

    await indexService.indexarVacante(VACANCY_ID);

    expect(fakeClient.indices.create).not.toHaveBeenCalled();
  });

  it('conserva el 404 cuando la vacante fuente no existe', async () => {
    const { fakeClient, indexService, obtenerPorId } = createServices();
    obtenerPorId.mockRejectedValueOnce(
      new NotFoundException('La vacante no existe.'),
    );

    await expect(indexService.indexarVacante(VACANCY_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(fakeClient.index).not.toHaveBeenCalled();
  });

  it('transforma fallos técnicos de Elasticsearch en 503 controlado', async () => {
    const { fakeClient, indexService } = createServices();
    fakeClient.failIndexing = true;

    await expect(indexService.indexarVacante(VACANCY_ID)).rejects.toEqual(
      expect.objectContaining({
        status: 503,
        message: 'El servicio de búsqueda no está disponible temporalmente.',
      }),
    );
  });

  it('busca documentos por título', async () => {
    const { indexService } = createServices();
    await indexService.indexarVacante(VACANCY_ID);

    await expect(indexService.buscar('Analista')).resolves.toEqual([
      vacancySource(),
    ]);
  });

  it('busca documentos por identificador exacto', async () => {
    const { indexService } = createServices();
    await indexService.indexarVacante(VACANCY_ID);

    await expect(indexService.buscar(VACANCY_ID)).resolves.toEqual([
      vacancySource(),
    ]);
  });

  it('devuelve un arreglo vacío cuando no hay coincidencias', async () => {
    const { indexService } = createServices();
    await indexService.indexarVacante(VACANCY_ID);

    await expect(indexService.buscar('Sin coincidencias')).resolves.toEqual([]);
  });

  it('permite construir Nest sin configurar ni conectar Elasticsearch', async () => {
    const service = new ElasticsearchService(new ConfigService({}));

    await expect(service.searchVacancies('')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
