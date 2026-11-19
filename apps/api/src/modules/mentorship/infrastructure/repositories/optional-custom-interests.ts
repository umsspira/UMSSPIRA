import type { Prisma } from '../../../../generated/prisma/client';

/**
 * Consultar el catálogo de PostgreSQL no genera un 42P01 y se puede hacer
 * dentro de la transacción antes de usar la tabla opcional de HU 6.22.
 */
export async function customInterestsTableAvailable(db: Prisma.TransactionClient): Promise<boolean> {
  const rows = await db.$queryRaw<Array<{ available: boolean }>>`
    SELECT to_regclass('public.mentor_interes_personalizado') IS NOT NULL AS available
  `;
  return rows[0]?.available === true;
}

/**
 * Compatibilidad de lectura con instalaciones anteriores a HU 6.22.
 * No usar dentro de transacciones: PostgreSQL aborta la transacción tras 42P01.
 * Solo se tolera la ausencia de esta tabla; permisos, conexión y otros fallos
 * deben propagarse. El consumidor debe indicar el modo de solo consulta.
 */
export async function readOptionalCustomInterests<T>(read: () => Promise<T[]>) {
  try {
    return { rows: await read(), available: true };
  } catch (error) {
    const failure = error as {
      code?: string;
      meta?: {
        table?: string;
        modelName?: string;
        driverAdapterError?: { cause?: { table?: string; kind?: string } };
      };
    } | null;
    const table = failure?.meta?.table ?? failure?.meta?.driverAdapterError?.cause?.table;
    if (
      failure?.code === 'P2021' &&
      (table === 'public.mentor_interes_personalizado' ||
        table === 'mentor_interes_personalizado')
    ) {
      return { rows: [] as T[], available: false };
    }
    throw error;
  }
}
