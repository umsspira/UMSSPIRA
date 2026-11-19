import { readOptionalCustomInterests } from './optional-custom-interests';

describe('readOptionalCustomInterests', () => {
  it('conserva los personalizados cuando existe la tabla', async () => {
    await expect(readOptionalCustomInterests(async () => [{ id: 'custom' }]))
      .resolves.toEqual({ rows: [{ id: 'custom' }], available: true });
  });

  it.each([
    { code: 'P2021', meta: { table: 'public.mentor_interes_personalizado' } },
    { code: 'P2021', meta: { driverAdapterError: {
      cause: { kind: 'TableDoesNotExist', table: 'public.mentor_interes_personalizado' },
    } } },
  ])('tolera únicamente la tabla opcional ausente: %j', async (error) => {
    await expect(readOptionalCustomInterests(async () => { throw error; }))
      .resolves.toEqual({ rows: [], available: false });
  });

  it.each([
    { code: 'P2021', meta: { table: 'public.area' } },
    { code: 'P2021' },
    { code: 'P2022', meta: { table: 'public.mentor_interes_personalizado' } },
    new Error('connection unavailable'),
  ])('no oculta otros errores: %j', async (error) => {
    await expect(readOptionalCustomInterests(async () => { throw error; })).rejects.toBe(error);
  });
});
