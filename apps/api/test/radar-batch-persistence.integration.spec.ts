import type { Prisma } from '../src/generated/prisma/client';
import { PrismaService } from '../src/shared/infrastructure/database/prisma.service';
import { PrismaRadarRepository } from '../src/modules/radar/infrastructure/repositories/prisma-radar.repository';

const databaseUrl = process.env.RADAR_PERSISTENCE_TEST_DATABASE_URL;
const integration = databaseUrl ? describe : describe.skip;

integration('Radar: persistencia por lote con PostgreSQL real', () => {
  let prisma: PrismaService;
  let repository: PrismaRadarRepository;
  let active: Prisma.TransactionClient;
  let owner: string;
  const rollback = new Error('rollback intencional del ensayo');
  const params = (unmapped: Array<{ term: string; count: number }>) => ({
    tituladoId: owner, hashEntrada: 'qa-batch', estado: 'COMPLETADO' as const,
    versionAlgoritmo: '1.0.0', areas: [], unmapped,
  });

  beforeAll(async () => {
    const target = new URL(databaseUrl!);
    if (!['127.0.0.1', 'localhost'].includes(target.hostname) ||
        !/^\/umsspira_(qa|fuego_[a-z0-9_]+)$/.test(target.pathname)) {
      throw new Error('Esta prueba solo admite una copia local de QA');
    }
    prisma = new PrismaService({ get: () => databaseUrl } as never);
    repository = new PrismaRadarRepository({
      $transaction: (operation: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
        prisma.$transaction(async tx => { active = tx; return operation(tx); }),
    } as unknown as PrismaService);
    const graduate = await prisma.titulado.findFirstOrThrow({ select: { id: true } });
    owner = graduate.id;
  });
  afterAll(async () => { await prisma?.$disconnect(); });

  it('inserta 1000 términos, actualiza frecuencias sin cambiar IDs y retira obsoletos', async () => {
    const before = await prisma.calculoRadar.count({ where: { id_titulado: owner } });
    await expect(repository.executeWithAdvisoryLock(owner, async transaction => {
      const keywords = Array.from({ length: 1000 }, (_, index) => ({ term: `qa-lote-${index}`, count: index + 1 }));
      keywords[0].term = "qa-comilla' ; --";
      await transaction.saveCalculation(params(keywords));
      const terms = await transaction.getUnmappedKeywords(owner);
      expect(terms).toHaveLength(1000);
      expect(terms).toContain(keywords[0].term);
      const existing = await active.palabraClaveNoMapeada.findUniqueOrThrow({ where: { id_titulado_termino: { id_titulado: owner, termino: keywords[0].term } } });
      // El repositorio ligado a la transacción conserva sus lecturas y escrituras.
      await transaction.saveCalculation(params([{ term: keywords[0].term, count: 7 }]));
      expect(await transaction.getUnmappedKeywords(owner)).toEqual([keywords[0].term]);
      const updated = await active.palabraClaveNoMapeada.findUniqueOrThrow({ where: { id: existing.id } });
      expect(updated.frecuencia).toBe(7);
      expect(updated.termino).toBe(existing.termino);
      await transaction.saveCalculation(params([]));
      expect(await transaction.getUnmappedKeywords(owner)).toEqual([]);
      throw rollback;
    })).rejects.toBe(rollback);
    expect(await prisma.calculoRadar.count({ where: { id_titulado: owner } })).toBe(before);
  }, 20000);

  it('un lote inválido revierte también el cálculo y la limpieza de términos previos', async () => {
    const calculations = await prisma.calculoRadar.count({ where: { id_titulado: owner } });
    const terms = await prisma.palabraClaveNoMapeada.findMany({ where: { id_titulado: owner }, orderBy: { termino: 'asc' } });
    await expect(repository.executeWithAdvisoryLock(owner, transaction =>
      transaction.saveCalculation(params([{ term: 'qa-invalid', count: Number.NaN }])),
    )).rejects.toThrow();
    expect(await prisma.calculoRadar.count({ where: { id_titulado: owner } })).toBe(calculations);
    expect(await prisma.palabraClaveNoMapeada.findMany({ where: { id_titulado: owner }, orderBy: { termino: 'asc' } })).toEqual(terms);
  });
});
