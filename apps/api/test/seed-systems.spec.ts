import type { PrismaClient } from '../src/generated/prisma/client';
import { seedSystemsCareer } from '../scripts/seed/systems-career';
import { DEMO_CAREER_ID } from '../scripts/seed/demo-accounts';
import { seedEpic1 } from '../scripts/seed/epic-1';
import { seedEpic9 } from '../scripts/seed/epic-9';

jest.mock('../scripts/seed/demo-document', () => ({
  demoDocument: jest.fn().mockResolvedValue(Buffer.from('PDF de prueba')),
}));

const originalId = 'e9cd814f-7905-4c78-8c51-1e2e49f7f982';

function database(careers: { id: string; nombre: string | null }[] = []) {
  const client = {
    $executeRaw: jest.fn().mockResolvedValue(0),
    carrera: {
      findMany: jest.fn(async () => careers),
      create: jest.fn(async ({ data }) => {
        careers.push({ ...data });
        return data;
      }),
    },
    ...Object.fromEntries(
      [
        'detalleSolicitud',
        'documentoRespaldo',
        'solicitud',
        'administradorSistema',
        'dictamen',
        'usuarioSolicitud',
        'borradorRegistro',
        'archivoRegistro',
        'auditoria',
        'titulado',
        'reporte',
        'encuesta',
        'respuestaEncuesta',
        'calculoRadar',
        'afinidadRadar',
      ].map((name) => [name, { createMany: jest.fn().mockResolvedValue({ count: 0 }) }]),
    ),
    $transaction: async (operation: (tx: unknown) => Promise<unknown>) => operation(client),
  };
  return { prisma: client as unknown as PrismaClient, careers, create: client.carrera.create };
}

describe('Sistemas sin duplicados en la seed', () => {
  it.each([
    'Ingenieria de Sistemas',
    'Ingeniería de Sistemas',
    '  Ingeniería  en Sistemas ',
    'Ing. Sistemas',
    'Lic. en Ingeniería de Sistemas',
    'Lic. en Ingeniería en Sistemas',
    'Licenciatura en Ingeniería de Sistemas',
    'Licenciatura en Ingeniería en Sistemas',
  ])('reutiliza el UUID y conserva el nombre %s al repetir la seed', async (nombre) => {
    const db = database([{ id: originalId, nombre }]);
    expect(await seedSystemsCareer(db.prisma)).toBe(originalId);
    expect(await seedSystemsCareer(db.prisma)).toBe(originalId);
    expect(db.careers).toEqual([{ id: originalId, nombre }]);
    expect(db.create).not.toHaveBeenCalled();
  });

  it('crea Sistemas una sola vez en una base nueva', async () => {
    const db = database();
    expect(await seedSystemsCareer(db.prisma)).toBe(DEMO_CAREER_ID);
    expect(await seedSystemsCareer(db.prisma)).toBe(DEMO_CAREER_ID);
    expect(db.careers).toEqual([{ id: DEMO_CAREER_ID, nombre: 'Ingeniería de Sistemas' }]);
    expect(db.create).toHaveBeenCalledTimes(1);
  });

  it('detiene una carga ambigua hasta aplicar la unificación', async () => {
    const db = database([
      { id: DEMO_CAREER_ID, nombre: 'Ingeniería de Sistemas' },
      { id: originalId, nombre: 'Ingenieria de Sistemas' },
    ]);
    await expect(seedSystemsCareer(db.prisma)).rejects.toThrow('migración de unificación');
    expect(db.create).not.toHaveBeenCalled();
  });

  it('no modifica otra carrera que ocupa el UUID reservado', async () => {
    const db = database([{ id: DEMO_CAREER_ID, nombre: 'Otra carrera' }]);
    await expect(seedSystemsCareer(db.prisma)).rejects.toThrow('otra carrera');
    expect(db.careers).toEqual([{ id: DEMO_CAREER_ID, nombre: 'Otra carrera' }]);
  });

  it('usa la carrera original en solicitudes, administradores, borradores, titulados y encuestas', async () => {
    const db = database([{ id: originalId, nombre: 'Lic. en Ingeniería de Sistemas' }]);
    await seedEpic1(db.prisma);
    await seedEpic9(db.prisma);

    for (const table of [
      'detalleSolicitud',
      'administradorSistema',
      'titulado',
      'encuesta',
    ] as const) {
      const createMany = db.prisma[table].createMany as jest.Mock;
      const rows = createMany.mock.calls.flatMap(([call]) => call.data);
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((row) => row.id_carrera === originalId)).toBe(true);
    }
    const drafts = (db.prisma.borradorRegistro.createMany as jest.Mock).mock.calls.flatMap(
      ([call]) => call.data,
    );
    expect(drafts.length).toBeGreaterThan(0);
    expect(drafts.every((draft) => draft.datos.carreraId === originalId)).toBe(true);
    expect(db.create).not.toHaveBeenCalled();
  });
});
