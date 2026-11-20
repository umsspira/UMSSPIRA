
import { Client } from 'pg';
import { grantNlpPermissions } from '../scripts/seed/grant-nlp-permissions';

jest.mock('pg', () => ({
  Client: jest.fn(),
}));

describe('Seguridad del script de permisos NLP', () => {
  const team = 'miiiuaynoxkhnngjjzvq';
  const qa = 'abcdefghijklmnopqrst';

  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();

    process.env.NLP_PERMISSIONS_QA_PROJECT_REF = qa;
    process.env.DIRECT_URL =
      `postgresql://postgres@db.${qa}.supabase.co/postgres`;

    delete process.env.DATABASE_URL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('rechaza apply contra QA antes de crear una conexión', async () => {
    await expect(
      grantNlpPermissions(['--apply']),
    ).rejects.toThrow('destino');

    expect(Client).not.toHaveBeenCalled();
  });

  it('rechaza proyectos diferentes antes de crear una conexión', async () => {
    process.env.DATABASE_URL =
      `postgresql://postgres@db.${team}.supabase.co/postgres`;

    await expect(
      grantNlpPermissions(['--dry-run']),
    ).rejects.toThrow('proyectos diferentes');

    expect(Client).not.toHaveBeenCalled();
  });
});
