import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import type { PrismaService } from '../src/shared/infrastructure/database/prisma.service';
import { PrismaJobPostingAffinityDataAdapter } from '../src/modules/job-postings/infrastructure/adapters/prisma-job-posting-affinity-data.adapter';
import { PrismaJobPostingAffinityRefreshRepository } from '../src/modules/job-postings/infrastructure/repositories/prisma-job-posting-affinity-refresh.repository';
import { jobPostingAffinityInputHash } from '../src/modules/job-postings/domain/policies/job-posting-affinity-input-hash';
import { applyMigrations } from './integration/support/test-database';

const serverUrl = process.env.TEST_DATABASE_URL;
const integration = serverUrl ? describe : describe.skip;

integration('HU-12: vigencia y concurrencia en PostgreSQL aislado', () => {
  let db: PrismaClient;
  let admin: Pool;
  let repository: PrismaJobPostingAffinityRefreshRepository;
  let adapter: PrismaJobPostingAffinityDataAdapter;
  const database = `affinity_hu12_${randomUUID().replaceAll('-', '')}`;

  beforeAll(async () => {
    const source = new URL(serverUrl!);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(source.hostname)) {
      throw new Error('HU-12 solo permite PostgreSQL local aislado en esta prueba');
    }
    admin = new Pool({ connectionString: source.toString() });
    await admin.query(`CREATE DATABASE "${database}"`);
    source.pathname = `/${database}`;
    const isolated = source.toString();
    const bootstrap = new Pool({ connectionString: isolated });
    await bootstrap.query('CREATE SCHEMA IF NOT EXISTS extensions');
    await bootstrap.end();
    await applyMigrations(isolated);
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString: isolated }) });
    await db.$connect();
    adapter = new PrismaJobPostingAffinityDataAdapter(db as unknown as PrismaService);
    repository = new PrismaJobPostingAffinityRefreshRepository(db as unknown as PrismaService, adapter);
  }, 120000);

  afterAll(async () => {
    if (db) {await db.$disconnect();}
    if (admin) {
      await admin.query(`DROP DATABASE IF EXISTS "${database}"`);
      await admin.end();
    }
  });

  it('persiste una sola versión y rechaza un hash viejo después de editar requisitos', async () => {
    const userId = randomUUID();
    const graduateId = randomUUID();
    const companyUserId = randomUUID();
    const companyId = randomUUID();
    const vacancyId = randomUUID();
    const applicationId = randomUUID();
    await db.usuario.create({ data: { usuario_id: userId, correo: `${userId}@example.com`, rol: 'titulado' } });
    await db.titulado.create({ data: { id: graduateId, id_usuario: userId } });
    await db.usuario.create({ data: { usuario_id: companyUserId, correo: `${companyUserId}@example.com`, rol: 'empresa' } });
    await db.empresa.create({ data: { id: companyId, id_usuario: companyUserId, razon_social: 'Empresa aislada' } });
    await db.vacante.create({ data: { id: vacancyId, id_empresa: companyId, titulo: 'Vacante', estado: 'PUBLICADO' } });
    await db.vacanteRequisitoTecnico.create({ data: { id_vacante: vacancyId, nombre: 'Java', nombre_normalizado: 'java' } });
    await db.postulacion.create({ data: { id: applicationId, id_usuario: userId, id_vacante: vacancyId, estado: 'postulado' } });

    const [profile] = await adapter.readProfiles([userId]);
    const [vacancy] = await adapter.readRequirements([vacancyId]);
    const hash = jobPostingAffinityInputHash(profile ?? null, vacancy!);
    const application = { id: applicationId, userId, vacancyId, inputHash: null, matchStatus: null };
    const incomplete = { status: 'profile-incomplete' as const, percentage: null, calculatedAt: null, comparison: [] as [] };
    const claims = await Promise.all([repository.claim(application, hash), repository.claim(application, hash)]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    await expect(repository.persistIfCurrent(application, hash, incomplete, claims.find(Boolean)!)).resolves.toBe(true);
    expect(await db.postulacion.findUnique({ where: { id: applicationId }, select: { hash_entrada: true, estado_match: true, porcentaje_match: true, fecha_match: true } }))
      .toEqual({ hash_entrada: hash, estado_match: 'profile-incomplete', porcentaje_match: null, fecha_match: null });

    await db.vacanteRequisitoTecnico.create({ data: { id_vacante: vacancyId, nombre: 'Docker', nombre_normalizado: 'docker' } });
    const [newVacancy] = await adapter.readRequirements([vacancyId]);
    const nextHash = jobPostingAffinityInputHash(profile ?? null, newVacancy!);
    const staleClaim = await repository.claim(application, nextHash);
    expect(staleClaim).not.toBeNull();
    await db.vacanteRequisitoTecnico.create({ data: { id_vacante: vacancyId, nombre: 'SQL', nombre_normalizado: 'sql' } });
    await expect(repository.persistIfCurrent(application, nextHash, incomplete, staleClaim!)).resolves.toBe(false);
    expect((await repository.listForVacancy(vacancyId, companyUserId, 0, 50)).map((item) => item.id)).toEqual([applicationId]);
    expect(await repository.listForVacancy(vacancyId, randomUUID(), 0, 50)).toEqual([]);
  }, 120000);
});
