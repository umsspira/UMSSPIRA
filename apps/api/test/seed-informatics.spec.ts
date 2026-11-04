import type { PrismaClient } from '../src/generated/prisma/client';
import {
  INFORMATICS_ADMIN_ASSIGNMENT_ID,
  INFORMATICS_CAREER_ID,
  seedInformaticsAdmin,
  seedInformaticsCareer,
} from '../scripts/seed/informatics-career';

interface Career {
  id: string;
  nombre: string;
}

interface Assignment {
  id: string;
  id_usuario: string;
  id_carrera: string;
  estado: string;
}

const adminId = '20000000-0000-4000-8000-000000000002';
const actualCareerId = 'c4cba039-5f31-480c-8de4-5cb0fa18e91d';

function database(
  careers: Career[] = [],
  assignments: Assignment[] = [],
  role: string | null = 'administrador',
) {
  const client = {
    carrera: {
      findMany: jest.fn(async () => careers),
      upsert: jest.fn(async ({ create }) => {
        careers.push({ ...create });
        return create;
      }),
    },
    usuario: { findUnique: jest.fn(async () => (role ? { rol: role } : null)) },
    administradorDeCarrera: {
      findFirst: jest.fn(
        async ({ where }) =>
          assignments.find(
            (row) => row.id_usuario === where.id_usuario && row.id_carrera === where.id_carrera,
          ) ?? null,
      ),
      createMany: jest.fn(async ({ data }) => {
        for (const row of data) {
          if (!assignments.some((existing) => existing.id === row.id)) {
            assignments.push({ ...row });
          }
        }
      }),
    },
    $transaction: async (operation: (tx: unknown) => Promise<unknown>) => {
      const originalCareers = careers.map((row) => ({ ...row }));
      const originalAssignments = assignments.map((row) => ({ ...row }));
      try {
        return await operation(client);
      } catch (error) {
        careers.splice(0, careers.length, ...originalCareers);
        assignments.splice(0, assignments.length, ...originalAssignments);
        throw error;
      }
    },
  };
  return { prisma: client as unknown as PrismaClient, careers, assignments };
}

describe('Informática y alcance del administrador en la seed', () => {
  it('añade Informática sin quitar Sistemas y permite repetir la carga', async () => {
    const systems: Assignment = {
      id: '10000000-0000-4000-8000-000000000004',
      id_usuario: adminId,
      id_carrera: '10000000-0000-4000-8000-000000000001',
      estado: 'ACTIVO',
    };
    const db = database([], [systems]);

    await seedInformaticsAdmin(db.prisma);
    await seedInformaticsAdmin(db.prisma);

    expect(db.careers).toEqual([{ id: INFORMATICS_CAREER_ID, nombre: 'Ingeniería Informática' }]);
    expect(db.assignments).toEqual([
      systems,
      {
        id: INFORMATICS_ADMIN_ASSIGNMENT_ID,
        id_usuario: adminId,
        id_carrera: INFORMATICS_CAREER_ID,
        estado: 'ACTIVO',
      },
    ]);
  });

  it.each([
    'Ingeniera Informatica',
    'Ingeniería Informática',
    '  Ingeniería en Informática  ',
    'Ing. Informática',
  ])('reutiliza el UUID y conserva el nombre existente %s', async (nombre) => {
    const db = database([{ id: actualCareerId, nombre }]);

    expect(await seedInformaticsAdmin(db.prisma)).toBe(actualCareerId);
    expect(db.careers).toEqual([{ id: actualCareerId, nombre }]);
    expect(db.assignments[0].id_carrera).toBe(actualCareerId);
  });

  it('conserva asignaciones existentes aunque tengan otro UUID o estén inactivas', async () => {
    const existing: Assignment = {
      id: '99000000-0000-4000-8000-000000000099',
      id_usuario: adminId,
      id_carrera: actualCareerId,
      estado: 'INACTIVO',
    };
    const db = database([{ id: actualCareerId, nombre: 'Ingeniería Informática' }], [existing]);

    await seedInformaticsAdmin(db.prisma);

    expect(db.assignments).toEqual([existing]);
  });

  it('rechaza carreras ambiguas en vez de conceder acceso a una por azar', async () => {
    const db = database([
      { id: actualCareerId, nombre: 'Ingeniera Informatica' },
      { id: INFORMATICS_CAREER_ID, nombre: 'Ingeniería Informática' },
    ]);

    await expect(seedInformaticsAdmin(db.prisma)).rejects.toThrow('varias carreras');
    expect(db.assignments).toHaveLength(0);
  });

  it.each([null, 'titulado'])(
    'no crea cuentas ni asigna permisos si falta el administrador: %s',
    async (role) => {
      const db = database([], [], role);

      await expect(seedInformaticsAdmin(db.prisma)).rejects.toThrow('cuenta administradora');
      expect(db.careers).toHaveLength(0);
      expect(db.assignments).toHaveLength(0);
    },
  );

  it('rechaza un UUID de carrera ocupado sin modificar esa carrera', async () => {
    const db = database([{ id: INFORMATICS_CAREER_ID, nombre: 'Otra carrera' }]);

    await expect(seedInformaticsAdmin(db.prisma)).rejects.toThrow('otra carrera');
    expect(db.careers).toEqual([{ id: INFORMATICS_CAREER_ID, nombre: 'Otra carrera' }]);
  });

  it('no informa éxito si el UUID de asignación está ocupado por otro vínculo', async () => {
    const existing: Assignment = {
      id: INFORMATICS_ADMIN_ASSIGNMENT_ID,
      id_usuario: adminId,
      id_carrera: '10000000-0000-4000-8000-000000000001',
      estado: 'ACTIVO',
    };
    const db = database([], [existing]);

    await expect(seedInformaticsAdmin(db.prisma)).rejects.toThrow('asignación de Informática');
    expect(db.careers).toHaveLength(0);
    expect(db.assignments).toEqual([existing]);
  });

  it('permite preparar solo el catálogo sin necesitar ni crear un administrador', async () => {
    const db = database([], [], null);

    await seedInformaticsCareer(db.prisma);

    expect(db.careers).toHaveLength(1);
    expect(db.assignments).toHaveLength(0);
    expect(db.prisma.usuario.findUnique).not.toHaveBeenCalled();
  });
});
