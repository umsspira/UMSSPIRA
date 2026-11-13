import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import type { ProfileTextSources } from '../../src/modules/radar/application/ports/profile-text-reader.port';
import { GetRadarUseCase } from '../../src/modules/radar/application/use-cases/get-radar.use-case';
import { RecalculateRadarUseCase } from '../../src/modules/radar/application/use-cases/recalculate-radar.use-case';
import { calculateInputHash } from '../../src/modules/radar/domain/policies/input-hash';
import { RADAR_AREA_IDS } from '../../src/modules/radar/domain/entities/radar-area';
import { PrismaProfileTextReaderAdapter } from '../../src/modules/radar/infrastructure/adapters/prisma-profile-text-reader.adapter';
import { PrismaRadarRepository } from '../../src/modules/radar/infrastructure/repositories/prisma-radar.repository';
import { PrismaProfileRepository } from '../../src/modules/profile/infrastructure/repositories/prisma-profile.repository';
import type { PrismaService } from '../../src/shared/infrastructure/database/prisma.service';
import { StubKeywordExtractor } from '../adapters/in-memory-radar-ports';
import { startTestDatabase, type TestDatabase } from './support/test-database';

jest.mock('../../src/shared/infrastructure/database/prisma.service', () => ({
  PrismaService: class {},
}));

describe('Radar y descripción vigente de perfil_area', () => {
  let database: TestDatabase;
  let pool: Pool;
  let prisma: PrismaClient;
  let profileRepository: PrismaProfileRepository;
  let textReader: PrismaProfileTextReaderAdapter;
  let radarRepository: PrismaRadarRepository;
  let extractor: StubKeywordExtractor;
  let recalculate: RecalculateRadarUseCase;

  jest.setTimeout(60_000);

  beforeAll(async () => {
    database = await startTestDatabase();
    pool = new Pool({ connectionString: database.connectionString });
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: database.connectionString }),
    });
    profileRepository = new PrismaProfileRepository(prisma as unknown as PrismaService);
    textReader = new PrismaProfileTextReaderAdapter(prisma as unknown as PrismaService);
    radarRepository = new PrismaRadarRepository(prisma as unknown as PrismaService);
    extractor = new StubKeywordExtractor();
    recalculate = new RecalculateRadarUseCase(extractor, radarRepository);

    for (const [slug, id] of Object.entries(RADAR_AREA_IDS)) {
      await pool.query(
        'INSERT INTO area (id, nombre, esta_activo) VALUES ($1, $2, true) ON CONFLICT (id) DO NOTHING',
        [id, slug],
      );
    }
  }, 180_000);

  afterAll(async () => {
    await prisma?.$disconnect();
    await pool?.end();
    await database?.stop();
  }, 60_000);

  async function crearTitulado() {
    const userId = randomUUID();
    const graduateId = randomUUID();
    await pool.query(
      'INSERT INTO usuario (usuario_id, nombre) VALUES ($1, $2)',
      [userId, 'Titulado de prueba'],
    );
    await pool.query(
      'INSERT INTO titulado (id, id_usuario) VALUES ($1, $2)',
      [graduateId, userId],
    );
    return { graduateId, userId };
  }

  async function insertarDescripcion(params: {
    graduateId: string;
    id: string;
    text: string;
    createdAt: string;
  }) {
    await pool.query(
      `INSERT INTO perfil_area
         (id, id_titulado, area_id, descripcion_profesional, fecha_creacion, fecha_actualizacion)
       VALUES ($1, $2, NULL, $3, $4, $4)`,
      [params.id, params.graduateId, params.text, params.createdAt],
    );
  }

  it('con varias filas usa solo la más antigua y no suma las demás', async () => {
    const { graduateId } = await crearTitulado();
    await insertarDescripcion({
      graduateId,
      id: '10000000-0000-4000-8000-000000000001',
      text: 'Descripción vigente',
      createdAt: '2026-01-01',
    });
    await insertarDescripcion({
      graduateId,
      id: '10000000-0000-4000-8000-000000000002',
      text: 'Descripción posterior',
      createdAt: '2026-02-01',
    });
    await insertarDescripcion({
      graduateId,
      id: '10000000-0000-4000-8000-000000000003',
      text: 'Descripción duplicada',
      createdAt: '2026-03-01',
    });

    const result = await textReader.getProfileTexts(graduateId);

    expect(result.texts).toEqual(['Descripción vigente']);
  });

  it('con una sola fila conserva el hash anterior del radar', async () => {
    const { graduateId } = await crearTitulado();
    await insertarDescripcion({
      graduateId,
      id: '20000000-0000-4000-8000-000000000001',
      text: 'Descripción única',
      createdAt: '2026-01-01',
    });

    const result = await textReader.getProfileTexts(graduateId);

    expect(calculateInputHash(result.texts)).toBe(
      calculateInputHash(['Descripción única']),
    );
  });

  it('sin filas devuelve textos vacíos', async () => {
    const { graduateId } = await crearTitulado();

    const result = await textReader.getProfileTexts(graduateId);

    expect(result.texts).toEqual([]);
  });

  it('con descripción vacía no agrega texto al radar', async () => {
    const { graduateId } = await crearTitulado();
    await insertarDescripcion({
      graduateId,
      id: '30000000-0000-4000-8000-000000000001',
      text: '',
      createdAt: '2026-01-01',
    });

    const result = await textReader.getProfileTexts(graduateId);

    expect(result.texts).toEqual([]);
  });

  it('desempata por id dos filas con la misma fecha_creacion', async () => {
    const { graduateId } = await crearTitulado();
    await insertarDescripcion({
      graduateId,
      id: '00000000-0000-4000-8000-000000000002',
      text: 'Descripción con id mayor',
      createdAt: '2026-01-01',
    });
    await insertarDescripcion({
      graduateId,
      id: '00000000-0000-4000-8000-000000000001',
      text: 'Descripción con id menor',
      createdAt: '2026-01-01',
    });

    const result = await textReader.getProfileTexts(graduateId);

    expect(result.texts).toEqual(['Descripción con id menor']);
  });

  it('dos guardados simultáneos mantienen una sola fila y la misma descripción que Perfil', async () => {
    const { graduateId, userId } = await crearTitulado();
    const scope = { graduateId, userId };

    await Promise.all([
      profileRepository.saveDescription(scope, 'Descripción desde guardado A'),
      profileRepository.saveDescription(scope, 'Descripción desde guardado B'),
    ]);

    const { rows } = await pool.query<{ total: number }>(
      'SELECT count(*)::int AS total FROM perfil_area WHERE id_titulado = $1',
      [graduateId],
    );
    const profile = await profileRepository.findDescription(scope);
    const radar = await textReader.getProfileTexts(graduateId);

    expect(rows[0].total).toBe(1);
    expect(['Descripción desde guardado A', 'Descripción desde guardado B']).toContain(
      profile.text,
    );
    expect(radar.texts).toEqual([profile.text]);
  });

  it('un guardado durante un recálculo no duplica filas ni mezcla descripciones', async () => {
    const { graduateId, userId } = await crearTitulado();
    const scope = { graduateId, userId };
    await insertarDescripcion({
      graduateId,
      id: '40000000-0000-4000-8000-000000000001',
      text: 'Descripción inicial',
      createdAt: '2026-01-01',
    });

    const observed: ProfileTextSources[] = [];
    const recordingReader = {
      async getProfileTexts(tituladoId: string): Promise<ProfileTextSources> {
        const result = await textReader.getProfileTexts(tituladoId);
        observed.push(result);
        return result;
      },
    };
    const getRadar = new GetRadarUseCase(
      recordingReader,
      radarRepository,
      recalculate,
    );

    await Promise.all([
      getRadar.execute(graduateId),
      profileRepository.saveDescription(scope, 'Descripción durante el recálculo'),
    ]);

    const { rows } = await pool.query<{ total: number }>(
      'SELECT count(*)::int AS total FROM perfil_area WHERE id_titulado = $1',
      [graduateId],
    );
    const profile = await profileRepository.findDescription(scope);
    const radar = await textReader.getProfileTexts(graduateId);

    expect(rows[0].total).toBe(1);
    expect(observed).toHaveLength(1);
    expect(observed[0].texts).toHaveLength(1);
    expect(['Descripción inicial', 'Descripción durante el recálculo']).toContain(
      observed[0].texts[0],
    );
    expect(radar.texts).toEqual([profile.text]);
  });
});
