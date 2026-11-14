import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import type { KeywordExtractorPort } from '../../src/modules/radar/application/ports/keyword-extractor.port';
import { RecalculateRadarUseCase } from '../../src/modules/radar/application/use-cases/recalculate-radar.use-case';
import { calculateInputHash } from '../../src/modules/radar/domain/policies/input-hash';
import { RADAR_AREA_IDS } from '../../src/modules/radar/domain/entities/radar-area';
import { PrismaAreaWeightReaderAdapter } from '../../src/modules/radar/infrastructure/adapters/prisma-area-weight-reader.adapter';
import { PrismaCertificationReaderAdapter } from '../../src/modules/radar/infrastructure/adapters/prisma-certification-reader.adapter';
import { PrismaProfileTextReaderAdapter } from '../../src/modules/radar/infrastructure/adapters/prisma-profile-text-reader.adapter';
import { PrismaRadarRepository } from '../../src/modules/radar/infrastructure/repositories/prisma-radar.repository';
import { PrismaProfileRepository } from '../../src/modules/profile/infrastructure/repositories/prisma-profile.repository';
import type { PrismaService } from '../../src/shared/infrastructure/database/prisma.service';
import { startTestDatabase, type TestDatabase } from './support/test-database';

jest.mock('../../src/shared/infrastructure/database/prisma.service', () => ({
  PrismaService: class {},
}));

const SOFTWARE = RADAR_AREA_IDS['software-development'];

// Extractor falso: encuentra «typescript» si algún texto lo menciona, como lo haría el motor NLP
const extractor: KeywordExtractorPort = {
  extractFromTexts: async (texts: string[]) => {
    const count = texts.filter((text) => /typescript/i.test(text)).length;
    return { keywords: count ? [{ term: 'typescript', count }] : [], unmapped: [] };
  },
};

describe('Radar con la sección Proyectos (HU-19, PostgreSQL real)', () => {
  let database: TestDatabase;
  let pool: Pool;
  let prisma: PrismaClient;
  let profileRepository: PrismaProfileRepository;
  let textReader: PrismaProfileTextReaderAdapter;
  let certificationReader: PrismaCertificationReaderAdapter;
  let recalculate: RecalculateRadarUseCase;

  jest.setTimeout(60_000);

  beforeAll(async () => {
    database = await startTestDatabase();
    pool = new Pool({ connectionString: database.connectionString });
    prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: database.connectionString }) });
    const service = prisma as unknown as PrismaService;
    profileRepository = new PrismaProfileRepository(service);
    textReader = new PrismaProfileTextReaderAdapter(service);
    certificationReader = new PrismaCertificationReaderAdapter(service);
    recalculate = new RecalculateRadarUseCase(
      extractor,
      new PrismaRadarRepository(service),
      new PrismaAreaWeightReaderAdapter(service),
    );

    for (const [slug, id] of Object.entries(RADAR_AREA_IDS)) {
      await pool.query(
        'INSERT INTO area (id, nombre, esta_activo) VALUES ($1, $2, true) ON CONFLICT (id) DO NOTHING',
        [id, slug],
      );
    }
    // Catálogo mínimo: «typescript» pesa en Desarrollo de Software
    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO palabra_clave (nombre, termino_normalizado) VALUES ('TypeScript', 'typescript')
       ON CONFLICT (termino_normalizado) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id`,
    );
    await pool.query(
      `INSERT INTO palabra_clave_area (id_palabra_clave, id_area, peso) VALUES ($1, $2, 5)
       ON CONFLICT (id_palabra_clave, id_area) DO UPDATE SET peso = EXCLUDED.peso`,
      [rows[0].id, SOFTWARE],
    );
  }, 180_000);

  afterAll(async () => {
    await prisma?.$disconnect();
    await pool?.end();
    await database?.stop();
  }, 60_000);

  async function crearTitulado() {
    const userId = randomUUID();
    const graduateId = randomUUID();
    await pool.query('INSERT INTO usuario (usuario_id, nombre) VALUES ($1, $2)', [userId, 'Titulado de prueba']);
    await pool.query('INSERT INTO titulado (id, id_usuario) VALUES ($1, $2)', [graduateId, userId]);
    return { graduateId, userId };
  }

  // Lee los textos del perfil y recalcula como lo hace el radar; devuelve el % de Software y el hash
  async function recalcularSoftware(graduateId: string) {
    const fuentes = await textReader.getProfileTexts(graduateId);
    await recalculate.execute(graduateId, fuentes.texts, fuentes.hasLaborHistory);
    const { rows } = await pool.query<{ porcentaje: string }>(
      `SELECT a.porcentaje FROM afinidad_radar a JOIN calculo_radar c ON c.id = a.id_calculo_radar
        WHERE c.id_titulado = $1 AND a.id_area = $2 ORDER BY c.fecha_calculo DESC NULLS LAST LIMIT 1`,
      [graduateId, SOFTWARE],
    );
    return { software: Number(rows[0]?.porcentaje ?? 0), hash: calculateInputHash(fuentes.texts) };
  }

  it('un proyecto con «React, TypeScript» sube Software y al eliminarlo vuelve a bajar', async () => {
    const { graduateId, userId } = await crearTitulado();
    const scope = { graduateId, userId };
    const antes = await recalcularSoftware(graduateId);
    expect(antes.software).toBe(0);

    const proyecto = await profileRepository.createProject(scope, {
      nombre: 'Portafolio',
      enlace: 'https://mi-sitio.dev',
      descripcion: 'Sitio personal',
      tecnologias: 'React, TypeScript',
    });
    const conProyecto = await recalcularSoftware(graduateId);
    expect(conProyecto.software).toBeGreaterThan(0);
    expect(conProyecto.hash).not.toBe(antes.hash);

    await profileRepository.remove(scope, 'proyectos', proyecto.id);
    const sinProyecto = await recalcularSoftware(graduateId);
    expect(sinProyecto.software).toBe(0);
    expect(sinProyecto.hash).toBe(antes.hash);
  });

  it('editar el proyecto cambia los textos y el hash, así el radar sabe que debe recalcular', async () => {
    const { graduateId, userId } = await crearTitulado();
    const scope = { graduateId, userId };
    const proyecto = await profileRepository.createProject(scope, {
      nombre: 'Portafolio',
      enlace: 'https://mi-sitio.dev',
      descripcion: 'Sitio personal',
      tecnologias: 'React',
    });
    const antes = calculateInputHash((await textReader.getProfileTexts(graduateId)).texts);

    await profileRepository.update(scope, proyecto.id, {
      section: 'proyectos',
      data: { nombre: 'Portafolio', enlace: 'https://mi-sitio.dev', descripcion: 'Sitio personal', tecnologias: 'TypeScript' },
    });
    const textos = (await textReader.getProfileTexts(graduateId)).texts;

    expect(textos).toContain('TypeScript');
    expect(calculateInputHash(textos)).not.toBe(antes);
  });

  it('un proyecto sin tecnologías se lee sin romper y solo aporta nombre y descripción', async () => {
    const { graduateId, userId } = await crearTitulado();
    await profileRepository.createProject(
      { graduateId, userId },
      { nombre: 'Blog', enlace: 'https://blog.dev', descripcion: 'Notas técnicas', tecnologias: null },
    );

    const fuentes = await textReader.getProfileTexts(graduateId);

    expect(fuentes.texts).toEqual(expect.arrayContaining(['Blog', 'Notas técnicas']));
    expect(fuentes.texts).toHaveLength(2);
  });

  it('los proyectos no cuentan como respaldos del radar', async () => {
    const { graduateId, userId } = await crearTitulado();
    await profileRepository.createProject(
      { graduateId, userId },
      { nombre: 'App', enlace: 'https://app.dev', descripcion: 'TypeScript', tecnologias: 'TypeScript' },
    );

    expect(await certificationReader.getCertifications(graduateId)).toEqual([]);
  });

  it('un proyecto de otro titulado no se puede eliminar (403) y no cambia su radar', async () => {
    const duenio = await crearTitulado();
    const otro = await crearTitulado();
    const proyecto = await profileRepository.createProject(duenio, {
      nombre: 'Privado',
      enlace: 'https://privado.dev',
      descripcion: 'Solo del dueño',
      tecnologias: null,
    });

    await expect(profileRepository.remove(otro, 'proyectos', proyecto.id)).rejects.toMatchObject({
      code: 'PROFILE_RECORD_FORBIDDEN',
    });
    expect((await textReader.getProfileTexts(duenio.graduateId)).texts).toContain('Privado');
  });
});
