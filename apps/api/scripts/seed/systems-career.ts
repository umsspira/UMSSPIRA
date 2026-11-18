import type { PrismaClient } from '../../src/generated/prisma/client';
import { DEMO_CAREER_ID } from './demo-accounts';

const careerNames = new Set([
  'ingenieria de sistemas',
  'ingenieria en sistemas',
  'ingenieria sistemas',
  'ing de sistemas',
  'ing sistemas',
]);

export async function seedSystemsCareer(prisma: PrismaClient): Promise<string> {
  return prisma.$transaction(async (tx) => {
    // Serializar las cargas para que dos seeds no creen la misma carrera a la vez.
    await tx.$executeRaw`LOCK TABLE public.carrera IN SHARE ROW EXCLUSIVE MODE`;
    const careers = await tx.carrera.findMany({ select: { id: true, nombre: true } });
    const matches = careers.filter(({ nombre }) => {
      const normalized = (nombre ?? '')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .replace(/\./g, '')
        .trim()
        .replace(/\s+/g, ' ');
      return careerNames.has(normalized);
    });
    if (matches.length > 1) {
      throw new Error('Hay varias carreras de Sistemas; aplicar la migración de unificación');
    }
    if (matches[0]) {
      return matches[0].id;
    }
    if (careers.some(({ id }) => id === DEMO_CAREER_ID)) {
      throw new Error('El UUID previsto para Sistemas ya pertenece a otra carrera');
    }
    const career = await tx.carrera.create({
      data: { id: DEMO_CAREER_ID, nombre: 'Ingeniería de Sistemas' },
      select: { id: true },
    });
    return career.id;
  });
}

/** Los UUID declarados en los fixtures se resuelven contra el catálogo del destino. */
export function withSystemsCareer<T extends { id_carrera?: string | null }>(
  rows: readonly T[],
  careerId: string,
): T[] {
  return rows.map((row) =>
    row.id_carrera === DEMO_CAREER_ID ? { ...row, id_carrera: careerId } : { ...row },
  );
}
