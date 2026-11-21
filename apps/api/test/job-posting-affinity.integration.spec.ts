import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import type { PrismaService } from '../src/shared/infrastructure/database/prisma.service';
import { PrismaJobPostingAffinityDataAdapter } from '../src/modules/job-postings/infrastructure/adapters/prisma-job-posting-affinity-data.adapter';
import { applyMigrations } from './integration/support/test-database';

const serverUrl = process.env.TEST_DATABASE_URL;
const integration = serverUrl ? describe : describe.skip;

integration('HU10: Adaptador de datos de afinidad laboral contra PostgreSQL real (opt-in)', () => {
  let db: PrismaClient;
  let admin: Pool;
  let adapter: PrismaJobPostingAffinityDataAdapter;
  const database = `affinity_it_${randomUUID().replaceAll('-', '')}`;
  let connectionString: string;

  beforeAll(async () => {
    const source = new URL(serverUrl!);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(source.hostname)) {
      throw new Error('Solo PostgreSQL local para esta prueba de integración');
    }
    admin = new Pool({ connectionString: source.toString() });
    await admin.query(`CREATE DATABASE "${database}"`);
    source.pathname = `/${database}`;
    connectionString = source.toString();

    const bootstrap = new Pool({ connectionString });
    await bootstrap.query('CREATE SCHEMA IF NOT EXISTS extensions');
    await bootstrap.end();

    await applyMigrations(connectionString);

    db = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
    await db.$connect();

    adapter = new PrismaJobPostingAffinityDataAdapter(db as unknown as PrismaService);
  }, 120000);

  afterAll(async () => {
    if (db) {
      await db.$disconnect();
    }
    if (admin) {
      await admin.query(`DROP DATABASE IF EXISTS "${database}"`);
      await admin.end();
    }
  });

  it('lee perfiles y requisitos de vacantes reales en PostgreSQL respetando constraints', async () => {
    const userId = randomUUID();
    const graduateId = randomUUID();
    const companyUserId = randomUUID();
    const companyId = randomUUID();
    const vacancyId = randomUUID();
    const applicationId = randomUUID();

    // 1. Crear usuario y titulado
    await db.usuario.create({
      data: {
        id: userId,
        correo: `grad-${randomUUID()}@example.com`,
        nombre: 'Candidato Integración',
        rol: 'titulado',
        estado: 'ACTIVO',
        titulado: {
          create: {
            id: graduateId,
            nombre: 'Candidato Integración',
            formacion_academica_registros: {
              create: [{ titulo: 'Ingeniería de Sistemas', institucion: 'UMSS' }],
            },
            experiencia_laboral_registros: {
              create: [{ cargo: 'Backend Developer', empresa: 'Tech Corp' }],
            },
            certificacion_registros: {
              create: [{ nombre: 'AWS Certified', entidad_emisora: 'Amazon' }],
            },
            proyecto_registros: {
              create: [{ nombre: 'Portal Empleos', descripcion: 'Microservicios', tecnologias: 'Java, TypeScript' }],
            },
            perfil_area_registros: {
              create: [{ descripcion_profesional: 'Especialista en desarrollo backend Java y SQL' }],
            },
          },
        },
      },
    });

    // 2. Crear empresa y vacante con requisitos técnicos estructurados
    await db.usuario.create({
      data: {
        id: companyUserId,
        correo: `company-${randomUUID()}@example.com`,
        nombre: 'Empresa Integración',
        rol: 'empresa',
        estado: 'ACTIVO',
        empresa: {
          create: {
            id: companyId,
            nombre: 'Empresa SA',
            nit: `NIT-${randomUUID().slice(0, 8)}`,
            vacantes: {
              create: {
                id: vacancyId,
                id_usuario_creador: companyUserId,
                titulo: 'Desarrollador Senior Java',
                descripcion: 'Buscamos desarrollador senior con experiencia',
                estado: 'PUBLICADO',
                fecha_limite: new Date(Date.now() + 86400000),
                vacante_requisitos_tecnicos: {
                  create: [
                    { nombre: 'Java', anos_experiencia: 3, excluyente: true },
                    { nombre: 'SQL', anos_experiencia: 2, excluyente: false },
                  ],
                },
              },
            },
          },
        },
      },
    });

    // 3. Crear postulación
    await db.postulacion.create({
      data: {
        id: applicationId,
        id_usuario: userId,
        id_vacante: vacancyId,
        estado: 'postulado',
        porcentaje_match: 100,
        fecha_match: new Date(),
      },
    });

    // 4. Probar readProfiles del adaptador
    const profiles = await adapter.readProfiles([userId]);
    expect(profiles).toHaveLength(1);
    expect(profiles[0]).toMatchObject({
      userId,
      tituladoId: graduateId,
      hasEducation: true,
      hasExperience: true,
      hasCertification: true,
      hasProject: true,
    });
    expect(profiles[0].texts).toContain('Especialista en desarrollo backend Java y SQL');
    expect(profiles[0].texts).toContain('Java, TypeScript');

    // 5. Probar readRequirements del adaptador
    const requirements = await adapter.readRequirements([vacancyId]);
    expect(requirements).toHaveLength(1);
    expect(requirements[0].requirements).toEqual(expect.arrayContaining(['Java', 'SQL']));

    // 6. Probar readPublicVacancies
    const publicVacancies = await adapter.readPublicVacancies([vacancyId], new Date());
    expect(publicVacancies).toHaveLength(1);
    expect(publicVacancies[0].requirements).toEqual(expect.arrayContaining(['Java', 'SQL']));

    // 7. Probar readCompanyVacancyApplications
    const companyScope = await adapter.readCompanyVacancyApplications(vacancyId, companyUserId, [applicationId]);
    expect(companyScope).not.toBeNull();
    expect(companyScope?.vacancy.vacancyId).toBe(vacancyId);
    expect(companyScope?.applications).toEqual([{ applicationId, userId }]);

    // 8. Verificar la restricción CHECK de fecha_match y porcentaje_match
    // No debe permitir porcentaje_match sin fecha_match
    await expect(
      db.postulacion.create({
        data: {
          id: randomUUID(),
          id_usuario: userId,
          id_vacante: vacancyId,
          estado: 'postulado',
          porcentaje_match: 50,
          fecha_match: null,
        },
      }),
    ).rejects.toThrow();
  });
});
