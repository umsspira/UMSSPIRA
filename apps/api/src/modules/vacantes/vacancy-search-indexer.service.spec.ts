import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { VacancySearchIndexerService } from './vacancy-search-indexer.service';

describe('VacancySearchIndexerService', () => {
  const document = {
    id: '30000000-0000-4000-8000-000000000001',
    titulo: 'Desarrollador web',
    modalidad: 'Híbrido',
    nivel_experiencia: 'Junior',
    descripcion_tecnica: 'TypeScript y PostgreSQL',
    estado: 'PUBLICADO',
    fecha_actualizacion: new Date('2026-01-02T00:00:00.000Z'),
    requisitos_tecnicos: [{ nombre: 'TypeScript', nivel: 'Intermedio' }],
    ubicaciones: ['Cochabamba'],
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('actualiza el documento usando el ID de la vacante como ID del índice', async () => {
    const config = new ConfigService({
      ELASTICSEARCH_URL: 'http://localhost:9200',
      ELASTICSEARCH_INDEX: 'vacantes-test',
      ELASTICSEARCH_API_KEY: 'test-api-key',
    });
    const indexer = new VacancySearchIndexerService(config);
    const fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }));

    await indexer.upsert(document);

    const [url, options] = fetchSpy.mock.calls[0];
    expect(String(url)).toBe(
      `http://localhost:9200/vacantes-test/_doc/${document.id}?refresh=wait_for`,
    );
    expect(options?.method).toBe('PUT');
    expect(options?.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'ApiKey test-api-key',
    });
    expect(JSON.parse(String(options?.body))).toEqual({
      ...document,
      fecha_actualizacion: document.fecha_actualizacion.toISOString(),
    });
  });

  it('falla explícitamente si el índice no está configurado', async () => {
    const indexer = new VacancySearchIndexerService(new ConfigService({}));

    await expect(indexer.upsert(document)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('informa si Elasticsearch rechaza la actualización', async () => {
    const config = new ConfigService({ ELASTICSEARCH_URL: 'http://localhost:9200' });
    const indexer = new VacancySearchIndexerService(config);
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 503 }));

    await expect(indexer.upsert(document)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
