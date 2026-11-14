import {
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Client } from '@elastic/elasticsearch';
import type { Prisma } from '../../generated/prisma/client';
import type { PrismaService } from '../../shared/infrastructure/database/prisma.service';
import type { JobPostingSearchDocument } from '../../shared/infrastructure/search/job-posting-search-document';
import type { ActorContext } from '../../shared/security/contexts/actor-context';
import { VACANTE_INDEXACION_SELECT } from './interfaces/vacante-indexable.interface';
import { IndexacionVacantesService } from './indexacion-vacantes.service';
import { PrismaVacanteIndexacionReader } from './prisma-vacante-indexacion.reader';
import { VacanteIndexacionCoordinator } from './vacante-indexacion.coordinator';

const ahora = new Date('2026-11-14T12:00:00.000Z');
const idVacante = '10000000-0000-4000-8000-000000000001';
const idEmpresa = '20000000-0000-4000-8000-000000000001';
const actor: ActorContext = {
  id: '30000000-0000-4000-8000-000000000001',
  email: 'empresa@example.test',
  name: null,
  role: 'empresa',
  permissions: ['vacantes:create'],
  scopes: { companyIds: [idEmpresa], graduateId: null, careerIds: [] },
  credentialVersion: 1,
};
type Proyeccion = Prisma.VacanteGetPayload<{
  select: typeof VACANTE_INDEXACION_SELECT;
}>;

function preparar(indice = 'job-postings-v1') {
  const vacante: Proyeccion = {
    id: idVacante,
    id_empresa: idEmpresa,
    titulo: 'Backend',
    estado: 'PUBLICADO',
    empresa: { razon_social: 'Empresa oficial' },
    created_at: new Date('2026-11-01T12:00:00.000Z'),
    fecha_cierre: new Date('2026-11-15T12:00:00.000Z'),
  };
  const findFirst = jest.fn<
    Promise<Proyeccion | null>,
    [Prisma.VacanteFindFirstArgs]
  >();
  findFirst.mockImplementation(async ({ where }) =>
    where?.id === idVacante &&
    JSON.stringify(where.id_empresa) === JSON.stringify({ in: [idEmpresa] })
      ? { ...vacante, empresa: vacante.empresa && { ...vacante.empresa } }
      : null,
  );
  const reader = new PrismaVacanteIndexacionReader({
    vacante: { findFirst },
  } as unknown as Pick<PrismaService, 'vacante'>);
  const documentos = new Map<string, JobPostingSearchDocument>();
  const elastic = {
    indices: {
      exists: jest.fn(async (_params: unknown) => true),
      create: jest.fn(async (_params: unknown) => ({})),
    },
    index: jest.fn(
      async (params: {
        index: string;
        id: string;
        document: JobPostingSearchDocument;
      }) => {
        const existia = documentos.has(params.id);
        documentos.set(params.id, params.document);
        return {
          _id: params.id,
          _index: params.index,
          result: existia ? 'updated' : 'created',
        };
      },
    ),
    delete: jest.fn(async (params: { index: string; id: string }) => ({
      _id: params.id,
      _index: params.index,
      result: documentos.delete(params.id) ? 'deleted' : 'not_found',
    })),
  };
  const settings: Record<string, unknown> = {
    ELASTICSEARCH_INDEX_VACANTES: 'vacantes',
  };
  // Doble aislado: ConfigService.set tambien modifica process.env.
  const config = {
    get: jest.fn((key: string) => settings[key]),
  } as unknown as Pick<ConfigService, 'get'>;
  const indexador = new IndexacionVacantesService(
    elastic as unknown as Client,
    indice,
  );
  const coordinator = () =>
    new VacanteIndexacionCoordinator(reader, indexador, config);
  return {
    vacante,
    findFirst,
    reader,
    documentos,
    elastic,
    config,
    settings,
    indexador,
    coordinator,
  };
}

describe('VacanteIndexacionCoordinator (Prisma y Elasticsearch simulados)', () => {
  beforeEach(() =>
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined),
  );
  afterEach(() => jest.restoreAllMocks());

  it('publica desde Prisma al indice separado y reintenta sin duplicar', async () => {
    const { coordinator, documentos, elastic, findFirst } = preparar();
    const servicio = coordinator();
    await expect(
      servicio.indexarVacante(actor, idVacante, ahora),
    ).resolves.toMatchObject({
      resultado: 'created',
      indice: 'job-postings-v1',
    });
    await expect(
      servicio.indexarVacante(actor, idVacante, ahora),
    ).resolves.toMatchObject({ resultado: 'updated' });
    expect(documentos.size).toBe(1);
    expect(documentos.get(idVacante)).toEqual({
      schema_version: 1,
      id: idVacante,
      id_empresa: idEmpresa,
      titulo: 'Backend',
      razon_social: 'Empresa oficial',
      estado: 'PUBLICADO',
      disponible: true,
      created_at: '2026-11-01T12:00:00.000Z',
      fecha_cierre: '2026-11-15T12:00:00.000Z',
    });
    expect(findFirst).toHaveBeenCalledTimes(2);
    for (const [params] of elastic.index.mock.calls) {
      expect(params.index).toBe('job-postings-v1');
      expect(params.id).toBe(idVacante);
    }
  });

  it('actualiza desde una nueva lectura oficial, reemplazando titulo y empresa', async () => {
    const { coordinator, vacante, documentos, findFirst } = preparar();
    const servicio = coordinator();
    await servicio.indexarVacante(actor, idVacante, ahora);
    vacante.titulo = null;
    vacante.empresa = { razon_social: 'Nueva razon social oficial' };
    vacante.created_at = null;
    await servicio.actualizarVacante(actor, idVacante, ahora);
    expect(documentos.size).toBe(1);
    expect(documentos.get(idVacante)).toMatchObject({
      titulo: null,
      razon_social: 'Nueva razon social oficial',
      created_at: null,
    });
    expect(findFirst).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['CERRADA', new Date('2026-11-15T12:00:00.000Z')],
    ['BORRADOR', null],
    ['PUBLICADO', new Date(ahora.getTime() - 1)],
    ['PUBLICADO', ahora],
  ])(
    'retira la disponibilidad al actualizar estado %s y cierre %s',
    async (estado, cierre) => {
      const { coordinator, vacante, documentos } = preparar();
      const servicio = coordinator();
      await servicio.indexarVacante(actor, idVacante, ahora);
      vacante.estado = estado;
      vacante.fecha_cierre = cierre;
      await servicio.actualizarVacante(actor, idVacante, ahora);
      expect(documentos.size).toBe(1);
      expect(documentos.get(idVacante)).toMatchObject({
        estado,
        disponible: false,
      });
    },
  );

  it('elimina por UUID y repite el borrado sin crear indices ni tocar el indice anterior', async () => {
    const { coordinator, documentos, elastic } = preparar();
    const servicio = coordinator();
    await servicio.indexarVacante(actor, idVacante, ahora);
    elastic.indices.exists.mockClear();
    await expect(
      servicio.eliminarVacante(actor, idVacante),
    ).resolves.toMatchObject({ resultado: 'deleted' });
    await expect(
      servicio.eliminarVacante(actor, idVacante),
    ).resolves.toMatchObject({ resultado: 'not_found' });
    expect(documentos.size).toBe(0);
    expect(elastic.delete).toHaveBeenNthCalledWith(1, {
      index: 'job-postings-v1',
      id: idVacante,
      refresh: 'wait_for',
    });
    expect(elastic.delete).toHaveBeenNthCalledWith(2, {
      index: 'job-postings-v1',
      id: idVacante,
      refresh: 'wait_for',
    });
    expect(elastic.indices.exists).not.toHaveBeenCalled();
    expect(elastic.indices.create).not.toHaveBeenCalled();
  });

  it.each([
    { result: 'not_found' },
    { error: { type: 'index_not_found_exception' } },
  ])(
    'acepta solamente los 404 de ausencia reconocida al borrar: %p',
    async (body) => {
      const { coordinator, elastic } = preparar();
      elastic.delete.mockRejectedValue({ meta: { statusCode: 404, body } });
      await expect(
        coordinator().eliminarVacante(actor, idVacante),
      ).resolves.toMatchObject({ resultado: 'not_found' });
      expect(elastic.indices.create).not.toHaveBeenCalled();
    },
  );

  it.each(['indexarVacante', 'actualizarVacante', 'eliminarVacante'] as const)(
    '%s no escribe para una vacante inexistente, ajena o ya eliminada de Prisma',
    async (operacion) => {
      const { coordinator, findFirst, elastic } = preparar();
      findFirst.mockResolvedValue(null);
      await expect(
        coordinator()[operacion](actor, idVacante),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(elastic.index).not.toHaveBeenCalled();
      expect(elastic.delete).not.toHaveBeenCalled();
      expect(elastic.indices.exists).not.toHaveBeenCalled();
    },
  );

  it('una empresa ajena no puede borrar el documento de otra', async () => {
    const { coordinator, elastic, documentos } = preparar();
    const servicio = coordinator();
    await servicio.indexarVacante(actor, idVacante, ahora);
    const otroActor = {
      ...actor,
      scopes: { ...actor.scopes, companyIds: [actor.id] },
    };
    await expect(
      servicio.eliminarVacante(otroActor, idVacante),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(documentos.has(idVacante)).toBe(true);
    expect(elastic.delete).not.toHaveBeenCalled();
  });

  it('rechaza una dependencia que apunte al indice antiguo o a otro distinto del configurado', () => {
    expect(() => preparar('vacantes').coordinator()).toThrow('indice separado');
    expect(() => preparar('otro-indice').coordinator()).toThrow(
      'indice separado',
    );
  });

  it('admite otro indice separado configurado y rechaza coincidencias con el antiguo', async () => {
    const { coordinator, settings, elastic } = preparar('empleos-v2');
    settings.ELASTICSEARCH_INDEX_JOB_POSTINGS = 'empleos-v2';
    await coordinator().indexarVacante(actor, idVacante, ahora);
    expect(elastic.index.mock.calls[0][0].index).toBe('empleos-v2');
    settings.ELASTICSEARCH_INDEX_VACANTES = 'empleos-v2';
    expect(() => coordinator()).toThrow('distinto del indice anterior');
  });

  it.each(['indexarVacante', 'actualizarVacante', 'eliminarVacante'] as const)(
    '%s no llega a Elasticsearch si Prisma falla',
    async (operacion) => {
      const { coordinator, findFirst, elastic } = preparar();
      findFirst.mockRejectedValue(new Error('Prisma no disponible'));
      await expect(
        coordinator()[operacion](actor, idVacante),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(elastic.index).not.toHaveBeenCalled();
      expect(elastic.delete).not.toHaveBeenCalled();
      expect(elastic.indices.exists).not.toHaveBeenCalled();
    },
  );

  it('controla fallos de preparacion del indice sin escribir', async () => {
    const { coordinator, elastic } = preparar();
    elastic.indices.exists.mockRejectedValue(
      new Error('Elasticsearch no disponible'),
    );
    await expect(
      coordinator().indexarVacante(actor, idVacante, ahora),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(elastic.index).not.toHaveBeenCalled();
  });

  it('permite reintentar una escritura fallida con el mismo UUID', async () => {
    const { coordinator, elastic, documentos } = preparar();
    elastic.index.mockRejectedValueOnce(
      new Error('Elasticsearch no disponible'),
    );
    const servicio = coordinator();
    await expect(
      servicio.indexarVacante(actor, idVacante, ahora),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    await servicio.indexarVacante(actor, idVacante, ahora);
    expect(documentos.size).toBe(1);
    expect(documentos.get(idVacante)?.disponible).toBe(true);
  });

  it.each([
    new Error('Elasticsearch no disponible'),
    {
      meta: {
        statusCode: 403,
        body: { error: { type: 'security_exception' } },
      },
    },
    {
      meta: { statusCode: 404, body: { error: { type: 'ruta_desconocida' } } },
    },
    { meta: { statusCode: 500, body: { result: 'not_found' } } },
  ])(
    'propaga como 503 fallos de borrado distintos de una ausencia reconocida',
    async (error) => {
      const { coordinator, elastic } = preparar();
      elastic.delete.mockRejectedValue(error);
      await expect(
        coordinator().eliminarVacante(actor, idVacante),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    },
  );
});
