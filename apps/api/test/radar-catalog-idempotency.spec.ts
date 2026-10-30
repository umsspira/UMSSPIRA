import type { PrismaClient } from '../src/generated/prisma/client';
import { normalizePhrase } from '../src/modules/nlp/domain/policies/text-normalizer';
import { RADAR_DICTIONARY, seedRadarCatalog } from '../scripts/seed/radar-catalog';

interface Keyword {
  id: string;
  termino_normalizado: string;
  nombre: string;
  esta_activo: boolean;
}
interface Alias {
  alias: string;
  alias_normalizado: string;
  id_palabra_clave: string;
}
interface Weight {
  id_palabra_clave: string;
  id_area: string;
  peso: number;
}

function database() {
  const keywords = new Map<string, Keyword>();
  const aliases = new Map<string, Alias>();
  const weights = new Map<string, Weight>();
  let nextId = 0;
  const tx = {
    palabraClave: {
      findMany: jest.fn(async () => [...keywords.values()]),
      createMany: jest.fn(async ({ data }: { data: Omit<Keyword, 'id'>[] }) => {
        let count = 0;
        for (const row of data) {
          if (!keywords.has(row.termino_normalizado)) {
            keywords.set(row.termino_normalizado, { ...row, id: `keyword-${++nextId}` });
            count++;
          }
        }
        return { count };
      }),
    },
    aliasPalabraClave: {
      findMany: jest.fn(async () =>
        [...aliases.values()].map((row) => ({
          ...row,
          palabra_clave: [...keywords.values()].find(
            (keyword) => keyword.id === row.id_palabra_clave,
          )!,
        })),
      ),
      createMany: jest.fn(async ({ data }: { data: Alias[] }) => {
        let count = 0;
        for (const row of data) {
          if (!aliases.has(row.alias_normalizado)) {
            aliases.set(row.alias_normalizado, { ...row });
            count++;
          }
        }
        return { count };
      }),
    },
    palabraClaveArea: {
      findMany: jest.fn(async () => [...weights.values()]),
      createMany: jest.fn(async ({ data }: { data: Weight[] }) => {
        let count = 0;
        for (const row of data) {
          const key = `${row.id_palabra_clave}:${row.id_area}`;
          if (!weights.has(key)) {
            weights.set(key, { ...row });
            count++;
          }
        }
        return { count };
      }),
      update: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id_palabra_clave_id_area: { id_palabra_clave: string; id_area: string } };
          data: { peso: number };
        }) => {
          const pair = where.id_palabra_clave_id_area;
          const key = `${pair.id_palabra_clave}:${pair.id_area}`;
          const row = { ...weights.get(key)!, ...data };
          weights.set(key, row);
          return row;
        },
      ),
    },
  };
  const prisma = {
    $transaction: jest.fn(async (callback: (client: unknown) => Promise<unknown>) => callback(tx)),
  } as unknown as PrismaClient;
  return { prisma, tx, keywords, aliases, weights };
}

describe('Radar catalog - carga por lotes e idempotencia', () => {
  it('carga el catálogo completo por lotes y repetir no inserta ni actualiza filas', async () => {
    const db = database();
    await seedRadarCatalog(db.prisma);
    const first = {
      keywords: [...db.keywords],
      aliases: [...db.aliases],
      weights: [...db.weights],
    };
    await seedRadarCatalog(db.prisma);

    expect({
      keywords: [...db.keywords],
      aliases: [...db.aliases],
      weights: [...db.weights],
    }).toEqual(first);
    expect(db.keywords.size).toBe(66);
    expect(db.aliases.size).toBe(89);
    expect(db.weights.size).toBe(
      Object.values(RADAR_DICTIONARY).reduce((total, rows) => total + rows.length, 0),
    );
    expect(db.tx.palabraClave.createMany).toHaveBeenCalledTimes(1);
    expect(db.tx.aliasPalabraClave.createMany).toHaveBeenCalledTimes(1);
    expect(db.tx.palabraClaveArea.createMany).toHaveBeenCalledTimes(1);
    expect(db.tx.palabraClaveArea.update).not.toHaveBeenCalled();
    const pythonId = db.keywords.get(normalizePhrase('python'))!.id;
    expect(
      [...db.weights.values()].filter((weight) => weight.id_palabra_clave === pythonId),
    ).toHaveLength(2);
  });

  it('conserva UUID, nombre y estado de keywords y alias existentes', async () => {
    const db = database();
    const keyword = {
      id: 'known-postgres',
      nombre: 'Nombre conservado',
      termino_normalizado: 'postgresql',
      esta_activo: false,
    };
    const alias = {
      alias: 'Postgres',
      alias_normalizado: 'postgres',
      id_palabra_clave: keyword.id,
    };
    db.keywords.set(keyword.termino_normalizado, keyword);
    db.aliases.set(alias.alias_normalizado, alias);
    await seedRadarCatalog(db.prisma);
    expect(db.keywords.get('postgresql')).toEqual(keyword);
    expect(db.aliases.get('postgres')).toEqual(alias);
  });

  it('actualiza solo los pesos declarados que cambiaron y conserva asociaciones ajenas', async () => {
    const db = database();
    await seedRadarCatalog(db.prisma);
    const [key, original] = [...db.weights][0];
    db.weights.set(key, { ...original, peso: 0 });
    const unrelated = { id_palabra_clave: 'custom-keyword', id_area: 'custom-area', peso: 2 };
    db.weights.set('custom-keyword:custom-area', unrelated);
    await seedRadarCatalog(db.prisma);
    expect(db.weights.get(key)).toEqual(original);
    expect(db.weights.get('custom-keyword:custom-area')).toEqual(unrelated);
    expect(db.tx.palabraClaveArea.update).toHaveBeenCalledTimes(1);
  });

  it('rechaza un alias de otra keyword antes de insertar o actualizar datos', async () => {
    const db = database();
    db.keywords.set('java', {
      id: 'keyword-java',
      nombre: 'Java',
      termino_normalizado: 'java',
      esta_activo: true,
    });
    db.aliases.set('js', {
      alias: 'js',
      alias_normalizado: 'js',
      id_palabra_clave: 'keyword-java',
    });
    await expect(seedRadarCatalog(db.prisma)).rejects.toThrow(/pertenece a otra palabra clave/);
    expect(db.tx.palabraClave.createMany).not.toHaveBeenCalled();
    expect(db.tx.aliasPalabraClave.createMany).not.toHaveBeenCalled();
    expect(db.tx.palabraClaveArea.createMany).not.toHaveBeenCalled();
    expect(db.tx.palabraClaveArea.update).not.toHaveBeenCalled();
  });
});
