import type { PrismaClient } from '../src/generated/prisma/client';
import { areas, seedTopics, topicos } from '../scripts/seed/catalogs';

interface Row {
  id: string;
  nombre: string | null;
  padre_id: string | null;
  esta_activo: boolean | null;
  fecha_creacion?: Date | string | null;
}

function database() {
  const rows = new Map<string, Row>(
    areas.map((area) => [
      area.id,
      {
        id: area.id,
        nombre: area.nombre ?? null,
        padre_id: area.padre_id ?? null,
        esta_activo: true,
      },
    ]),
  );
  const tx = {
    $executeRawUnsafe: jest.fn(),
    area: {
      findMany: jest.fn(async () => [...rows.values()]),
      createMany: jest.fn(async ({ data }: { data: Row[] }) => {
        for (const row of data) {
          if (rows.has(row.id)) {
            throw new Error('UUID duplicado');
          }
          rows.set(row.id, { ...row });
        }
        return { count: data.length };
      }),
    },
  };
  const prisma = {
    $transaction: jest.fn(async (operation: (client: typeof tx) => Promise<void>) => {
      const before = new Map(rows);
      try {
        await operation(tx);
      } catch (error) {
        rows.clear();
        for (const [id, row] of before) {
          rows.set(id, row);
        }
        throw error;
      }
    }),
  } as unknown as PrismaClient;
  return { rows, tx, prisma };
}

describe('Seed de tópicos HU 6.21', () => {
  it('define 39 UUID únicos y nombres distintos por padre, sin usar el 017', () => {
    expect(topicos).toHaveLength(39);
    expect(new Set(topicos.map((topic) => topic.id)).size).toBe(39);
    expect(
      new Set(topicos.map((topic) => `${topic.padre_id}:${topic.nombre.trim().toLowerCase()}`))
        .size,
    ).toBe(39);
    expect(new Set(topicos.map((topic) => topic.padre_id)).size).toBe(7);
    expect(topicos.some((topic) => topic.id === '60000000-0000-4000-8000-000000000017')).toBe(
      false,
    );
    for (const topic of topicos) {
      expect(areas.find((area) => area.id === topic.padre_id)?.padre_id).toBeNull();
    }
  });

  it('crea los tópicos activos y conserva las áreas y sus jerarquías', async () => {
    const { rows, tx, prisma } = database();
    const original = [...rows.values()];
    await seedTopics(prisma);
    expect(rows.size).toBe(49);
    expect(tx.$executeRawUnsafe).toHaveBeenCalledWith(
      'LOCK TABLE public.area IN SHARE ROW EXCLUSIVE MODE',
    );
    for (const row of original) {
      expect(rows.get(row.id)).toEqual(row);
    }
    for (const topic of topicos) {
      expect(rows.get(topic.id)).toMatchObject({
        ...topic,
        esta_activo: true,
        fecha_creacion: expect.any(Date),
      });
    }
  });

  it('repetir la carga no modifica filas ni vuelve a insertar', async () => {
    const { rows, tx, prisma } = database();
    await seedTopics(prisma);
    const before = [...rows.values()];
    await seedTopics(prisma);
    expect([...rows.values()]).toEqual(before);
    expect(tx.area.createMany).toHaveBeenCalledTimes(1);
  });

  it('reutiliza un equivalente activo con otro UUID y conserva su fecha y nombre', async () => {
    const { rows, tx, prisma } = database();
    const original = {
      id: '60000000-0000-4000-8000-000000000800',
      nombre: '  BACKEND  ',
      padre_id: topicos[0].padre_id,
      esta_activo: true,
      fecha_creacion: new Date('2020-01-01'),
    };
    rows.set(original.id, original);
    await seedTopics(prisma);
    expect(rows.get(original.id)).toEqual(original);
    expect(rows.has(topicos[0].id)).toBe(false);
    expect(tx.area.createMany.mock.calls[0][0].data).toHaveLength(38);
  });

  it.each(['missing', 'inactive', 'child'])(
    'aborta antes de insertar si un padre es %s',
    async (condition) => {
      const { rows, tx, prisma } = database();
      const parent = rows.get(topicos[topicos.length - 1].padre_id)!;
      if (condition === 'missing') {
        rows.delete(parent.id);
      }
      if (condition === 'inactive') {
        parent.esta_activo = false;
      }
      if (condition === 'child') {
        parent.padre_id = topicos[0].padre_id;
      }
      const before = [...rows.values()];
      await expect(seedTopics(prisma)).rejects.toThrow('raíz activa');
      expect(tx.area.createMany).not.toHaveBeenCalled();
      expect([...rows.values()]).toEqual(before);
    },
  );

  it.each(['name', 'parent'])('rechaza un UUID ocupado con otro %s', async (condition) => {
    const { rows, tx, prisma } = database();
    const topic = topicos[0];
    rows.set(topic.id, {
      id: topic.id,
      nombre: condition === 'name' ? 'Otro' : topic.nombre,
      padre_id: condition === 'parent' ? topicos[topicos.length - 1].padre_id : topic.padre_id,
      esta_activo: true,
    });
    await expect(seedTopics(prisma)).rejects.toThrow('UUID ocupado');
    expect(tx.area.createMany).not.toHaveBeenCalled();
  });

  it.each([false, null])('no reactiva ni reemplaza un tópico con estado %s', async (active) => {
    const { rows, tx, prisma } = database();
    const topic = topicos[0];
    rows.set(topic.id, { ...topic, esta_activo: active });
    await expect(seedTopics(prisma)).rejects.toThrow('inactivo');
    expect(tx.area.createMany).not.toHaveBeenCalled();
    expect(rows.get(topic.id)?.esta_activo).toBe(active);
  });

  it('rechaza nombres equivalentes duplicados dentro del mismo padre', async () => {
    const { rows, tx, prisma } = database();
    for (const id of ['duplicate-a', 'duplicate-b']) {
      rows.set(id, { ...topicos[0], id, esta_activo: true });
    }
    await expect(seedTopics(prisma)).rejects.toThrow('duplicados');
    expect(tx.area.createMany).not.toHaveBeenCalled();
  });

  it('propaga los errores de inserción y revierte la etapa en el doble transaccional', async () => {
    const { rows, tx, prisma } = database();
    const before = [...rows.values()];
    const insert = tx.area.createMany.getMockImplementation()!;
    tx.area.createMany.mockImplementationOnce(async ({ data }) => {
      await insert({ data: data.slice(0, 2) });
      throw new Error('fallo simulado');
    });
    await expect(seedTopics(prisma)).rejects.toThrow('fallo simulado');
    expect([...rows.values()]).toEqual(before);
  });
});
