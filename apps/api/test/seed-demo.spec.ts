import { assertDemoEnvironment } from '../scripts/seed/demo-environment';
import type { PrismaClient } from '../src/generated/prisma/client';
import { seedBase } from '../scripts/seed/base';
import {
  DEMO_ACCOUNTS,
  DEMO_INFORMATICS_CAREER_ID,
  DEMO_INFORMATICS_QA_ADMIN_ID,
} from '../scripts/seed/demo-accounts';
import { seedInformaticsAdmin, seedInformaticsCareer } from '../scripts/seed/informatics-career';

jest.mock('../scripts/seed/catalogs', () => ({ seedCatalogs: jest.fn() }));
jest.mock('../scripts/seed/informatics-career', () => ({
  seedInformaticsAdmin: jest.fn(),
  seedInformaticsCareer: jest.fn().mockResolvedValue('10000000-0000-4000-8000-000000000002'),
}));

describe('Destino del seed de demostración', () => {
  it.each(['production', undefined])('rechaza APP_ENV=%s', (APP_ENV) => {
    expect(() => assertDemoEnvironment({ APP_ENV })).toThrow('no se permite en producción');
  });

  it.each(['epic', 'dev', 'test'])('permite el destino explícito %s', (APP_ENV) => {
    expect(() => assertDemoEnvironment({ APP_ENV })).not.toThrow();
  });
});

describe('Cuentas de demostración', () => {
  function database(accounts = new Map<string, { usuario_id: string }>()) {
    const create = jest.fn(async ({ data }) => {
      accounts.set(data.correo, { usuario_id: data.usuario_id });
    });
    const client = {
      rolAcceso: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { codigo: 'titulado' },
            { codigo: 'administrador' },
            { codigo: 'empresa' },
          ]),
      },
      carrera: { createMany: jest.fn() },
      usuario: {
        findUnique: jest.fn(async ({ where }) => accounts.get(where.correo) ?? null),
        create,
      },
    };
    return { client: client as unknown as PrismaClient, create };
  }

  it('permite repetir la carga sin recrear cuentas ni reemplazar contraseñas', async () => {
    const { client, create } = database();
    const hash = jest.fn().mockResolvedValue('hash-de-prueba');

    await seedBase(client, { hash });
    await seedBase(client, { hash });

    expect(create).toHaveBeenCalledTimes(DEMO_ACCOUNTS.length);
    expect(hash).toHaveBeenCalledTimes(DEMO_ACCOUNTS.length);
    expect(create.mock.calls[0][0].data.titulado.create.id).toBe(DEMO_ACCOUNTS[0].profileId);
    const informaticsAdmin = create.mock.calls.find(
      ([{ data }]) => data.usuario_id === DEMO_INFORMATICS_QA_ADMIN_ID,
    );
    expect(
      informaticsAdmin?.[0].data.administrador_de_carrera_registros.create.carrera.connect.id,
    ).toBe(DEMO_INFORMATICS_CAREER_ID);
    expect(seedInformaticsAdmin).toHaveBeenCalled();
  });

  it('rechaza un correo que ya pertenece a otro UUID sin modificar esa cuenta', async () => {
    const { client, create } = database(
      new Map([[DEMO_ACCOUNTS[0].email, { usuario_id: '29000000-0000-4000-8000-000000000001' }]]),
    );
    const hash = jest.fn();

    await expect(seedBase(client, { hash })).rejects.toThrow('ya pertenece a otra cuenta');

    expect(create).not.toHaveBeenCalled();
    expect(hash).not.toHaveBeenCalled();
  });

  it('asocia al administrador de QA con el UUID existente de Ingeniería Informática', async () => {
    const careerId = '10000000-0000-4000-8000-000000000008';
    jest.mocked(seedInformaticsCareer).mockResolvedValueOnce(careerId);
    const { client, create } = database();

    await seedBase(client, { hash: jest.fn().mockResolvedValue('hash-de-prueba') });

    const informaticsAdmin = create.mock.calls.find(
      ([{ data }]) => data.usuario_id === DEMO_INFORMATICS_QA_ADMIN_ID,
    );
    expect(
      informaticsAdmin?.[0].data.administrador_de_carrera_registros.create.carrera.connect.id,
    ).toBe(careerId);
  });
});
