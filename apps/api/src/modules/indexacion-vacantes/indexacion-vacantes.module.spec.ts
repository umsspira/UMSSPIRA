import 'reflect-metadata';
import type { FactoryProvider, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Client } from '@elastic/elasticsearch';
import request from 'supertest';
import { PrismaModule } from '../../shared/infrastructure/database/prisma.module';
import { PrismaService } from '../../shared/infrastructure/database/prisma.service';
import type { ActorContext } from '../../shared/security/contexts/actor-context';
import { IndexacionVacantesModule } from './indexacion-vacantes.module';
import { IndexacionVacantesService } from './indexacion-vacantes.service';
import { VACANTE_INDEXACION_SELECT } from './interfaces/vacante-indexable.interface';
import { PrismaVacanteIndexacionReader } from './prisma-vacante-indexacion.reader';
import { VacanteIndexacionCoordinator } from './vacante-indexacion.coordinator';
import {
  ELASTICSEARCH_CLIENT,
  ELASTICSEARCH_INDEX,
} from './indexacion-vacantes.constants';

jest.mock('@elastic/elasticsearch', () => ({ Client: jest.fn() }));

function factory(token: FactoryProvider['provide']): FactoryProvider {
  const providers = Reflect.getMetadata(
    'providers',
    IndexacionVacantesModule,
  ) as unknown[];
  const provider = providers.find(
    (value) =>
      typeof value === 'object' &&
      value !== null &&
      'provide' in value &&
      value.provide === token,
  );
  if (!provider) {
    throw new Error('Fabrica no encontrada');
  }
  return provider as FactoryProvider;
}

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
const vacante = {
  id: idVacante,
  id_empresa: idEmpresa,
  titulo: 'Backend oficial',
  empresa: { razon_social: 'Empresa oficial' },
  estado: 'PUBLICADO',
  created_at: null,
  fecha_cierre: null,
};

function escenario() {
  const settings: Record<string, unknown> = {
    ELASTICSEARCH_NODE: 'http://elasticsearch.invalid:9200',
    ELASTICSEARCH_INDEX_VACANTES: 'vacantes',
    ELASTICSEARCH_API_KEY: 'clave-simulada',
  };
  // No lee archivos .env ni modifica las variables del proceso.
  const config = { get: (key: string) => settings[key] } as ConfigService;
  const prisma = {
    vacante: { findFirst: jest.fn().mockResolvedValue(vacante) },
  };
  const elastic = {
    indices: {
      exists: jest.fn().mockResolvedValue(true),
      create: jest.fn(),
    },
    index: jest.fn().mockResolvedValue({
      _id: idVacante,
      _index: 'job-postings-v1',
      result: 'created',
    }),
    delete: jest.fn(),
    ping: jest.fn(),
  };
  jest.mocked(Client).mockImplementation(() => elastic as unknown as Client);

  const compile = (providers: Provider[] = []) =>
    Test.createTestingModule({ imports: [IndexacionVacantesModule], providers })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(ConfigService)
      .useValue(config)
      .compile();

  return { settings, config, prisma, elastic, compile };
}

describe('Composicion HU4 aislada, con Prisma y Elasticsearch simulados', () => {
  beforeEach(() => jest.clearAllMocks());

  it('declara sus dependencias y no registra controladores HTTP', () => {
    expect(Reflect.getMetadata('imports', IndexacionVacantesModule)).toEqual([
      ConfigModule,
      PrismaModule,
    ]);
    expect(
      Reflect.getMetadata('controllers', IndexacionVacantesModule),
    ).toEqual([]);
    expect(Reflect.getMetadata('exports', IndexacionVacantesModule)).toEqual([
      VacanteIndexacionCoordinator,
    ]);
    expect(factory(PrismaVacanteIndexacionReader).inject).toEqual([
      PrismaService,
    ]);
    expect(factory(VacanteIndexacionCoordinator).inject).toEqual([
      PrismaVacanteIndexacionReader,
      IndexacionVacantesService,
      ConfigService,
    ]);
  });

  it('resuelve el nuevo indice sin crear un cliente', () => {
    const { config, settings } = escenario();
    expect(factory(ELASTICSEARCH_INDEX).inject).toEqual([ConfigService]);
    expect(factory(ELASTICSEARCH_INDEX).useFactory(config)).toBe(
      'job-postings-v1',
    );
    settings.ELASTICSEARCH_INDEX_JOB_POSTINGS = 'ofertas-v1';
    expect(factory(ELASTICSEARCH_INDEX).useFactory(config)).toBe('ofertas-v1');
    expect(Client).not.toHaveBeenCalled();
  });

  it('configura solamente un cliente simulado con el nodo y autenticacion compartidos', () => {
    const { config } = escenario();
    factory(ELASTICSEARCH_CLIENT).useFactory(config);
    expect(Client).toHaveBeenCalledWith({
      node: 'http://elasticsearch.invalid:9200',
      auth: { apiKey: 'clave-simulada' },
      maxRetries: 2,
      requestTimeout: 5000,
    });
  });

  it.each(['vacantes', '', ' ', '*', 'uno,dos'])(
    'rechaza el indice inseguro %p antes de crear el cliente',
    (indice) => {
      const { config, settings } = escenario();
      settings.ELASTICSEARCH_INDEX_JOB_POSTINGS = indice;
      expect(() => factory(ELASTICSEARCH_INDEX).useFactory(config)).toThrow();
      expect(() => factory(ELASTICSEARCH_CLIENT).useFactory(config)).toThrow();
      expect(Client).not.toHaveBeenCalled();
    },
  );

  it('rechaza la ausencia de nodo sin crear clientes ni consultar Prisma', () => {
    const { config, settings, prisma } = escenario();
    delete settings.ELASTICSEARCH_NODE;
    expect(() => factory(ELASTICSEARCH_CLIENT).useFactory(config)).toThrow(
      'ELASTICSEARCH_NODE',
    );
    expect(Client).not.toHaveBeenCalled();
    expect(prisma.vacante.findFirst).not.toHaveBeenCalled();
  });

  it('resuelve el coordinador exportado y sus dependencias sin operaciones durante la inicializacion', async () => {
    const { compile, prisma, elastic } = escenario();
    const consumer = Symbol('CONSUMIDOR_HU4');
    const module = await compile([
      {
        provide: consumer,
        inject: [VacanteIndexacionCoordinator],
        useFactory: (coordinator: VacanteIndexacionCoordinator) => coordinator,
      },
    ]);
    try {
      await module.init();
      const internal = module.select(IndexacionVacantesModule);
      expect(module.get(consumer)).toBe(
        internal.get(VacanteIndexacionCoordinator, { strict: true }),
      );
      expect(
        internal.get(PrismaVacanteIndexacionReader, { strict: true }),
      ).toBeInstanceOf(PrismaVacanteIndexacionReader);
      expect(
        internal.get(IndexacionVacantesService, { strict: true }).indice,
      ).toBe('job-postings-v1');
      expect(Client).toHaveBeenCalledTimes(1);
      expect(prisma.vacante.findFirst).not.toHaveBeenCalled();
      expect(elastic.indices.exists).not.toHaveBeenCalled();
      expect(elastic.indices.create).not.toHaveBeenCalled();
      expect(elastic.index).not.toHaveBeenCalled();
      expect(elastic.delete).not.toHaveBeenCalled();
      expect(elastic.ping).not.toHaveBeenCalled();
    } finally {
      await module.close();
    }
  });

  it('el coordinador compuesto lee Prisma y usa solamente el indice separado al invocarlo', async () => {
    const { compile, prisma, elastic } = escenario();
    const module = await compile();
    try {
      const now = new Date('2026-11-14T12:00:00.000Z');
      await module
        .get(VacanteIndexacionCoordinator)
        .indexarVacante(actor, idVacante, now);
      expect(prisma.vacante.findFirst).toHaveBeenCalledWith({
        where: { id: idVacante, id_empresa: { in: [idEmpresa] } },
        select: VACANTE_INDEXACION_SELECT,
      });
      expect(elastic.index).toHaveBeenCalledTimes(1);
      expect(elastic.index).toHaveBeenCalledWith({
        index: 'job-postings-v1',
        id: idVacante,
        refresh: 'wait_for',
        document: {
          schema_version: 1,
          id: idVacante,
          id_empresa: idEmpresa,
          titulo: 'Backend oficial',
          razon_social: 'Empresa oficial',
          estado: 'PUBLICADO',
          disponible: true,
          created_at: null,
          fecha_cierre: null,
        },
      });
    } finally {
      await module.close();
    }
  });

  it('no permite inyectar el escritor privado desde un modulo consumidor', async () => {
    const { compile } = escenario();
    await expect(
      compile([
        {
          provide: 'CONSUMIDOR_ESCRITOR',
          inject: [IndexacionVacantesService],
          useFactory: (writer: IndexacionVacantesService) => writer,
        },
      ]),
    ).rejects.toThrow(/IndexacionVacantesService/);
  });

  it('las rutas provisionales responden 404 sin leer Prisma ni escribir en Elasticsearch', async () => {
    const { compile, prisma, elastic } = escenario();
    const module = await compile();
    const app = module.createNestApplication();
    app.useLogger(false);
    app.setGlobalPrefix('api/v1');
    try {
      await app.init();
      await request(app.getHttpServer())
        .get('/api/v1/indexacion-vacantes/estado')
        .expect(404);
      await request(app.getHttpServer())
        .post(`/api/v1/indexacion-vacantes/${idVacante}`)
        .send({ titulo: 'Documento enviado por cliente', estado: 'PUBLICADO' })
        .expect(404);
      expect(prisma.vacante.findFirst).not.toHaveBeenCalled();
      expect(elastic.indices.exists).not.toHaveBeenCalled();
      expect(elastic.index).not.toHaveBeenCalled();
      expect(elastic.delete).not.toHaveBeenCalled();
      expect(elastic.ping).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
});
