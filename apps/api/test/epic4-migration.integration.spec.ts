import { Client } from 'pg';

const rawUrl = process.env.EPIC4_TEST_DATABASE_URL;
if (!rawUrl) {
  throw new Error('Falta EPIC4_TEST_DATABASE_URL para la copia temporal local.');
}
const target = new URL(rawUrl);
if (
  target.hostname !== '127.0.0.1' ||
  target.port !== '55447' ||
  !/^\/epic4_migration_test_\d+$/.test(target.pathname)
) {
  throw new Error('Esta prueba solo permite la copia temporal local de Epic 4.');
}

const client = new Client({ connectionString: rawUrl });

describe('Epic 4: integridad de vacantes y postulaciones en PostgreSQL', () => {
  beforeAll(async () => client.connect());
  afterAll(async () => client.end());
  beforeEach(async () => client.query('BEGIN'));
  afterEach(async () => client.query('ROLLBACK'));

  async function vacancy(state: string, salary: number | null = 100) {
    return (
      await client.query<{
        id: string;
        fecha_publicacion: Date | null;
        fecha_cierre: Date | null;
        fecha_actualizacion: Date | null;
      }>('INSERT INTO public.vacante(estado,salario) VALUES($1,$2) RETURNING *', [state, salary])
    ).rows[0];
  }

  it.each(['PUBLICADO', 'PUBLICADA', ' publicado '])(
    'registra publicación para %s',
    async (state) => {
      const row = await vacancy(state);
      expect(row.fecha_publicacion).toBeInstanceOf(Date);
      expect(row.fecha_actualizacion).toBeInstanceOf(Date);
      expect(row.fecha_cierre).toBeNull();
    },
  );

  it('mantiene las fechas originales al editar y cerrar una vacante', async () => {
    const row = await vacancy('PUBLICADO');
    await client.query('UPDATE public.vacante SET fecha_publicacion=$1 WHERE id=$2', [
      new Date('2026-01-01T12:00:00Z'),
      row.id,
    ]);
    const closed = (
      await client.query("UPDATE public.vacante SET estado='CERRADA' WHERE id=$1 RETURNING *", [
        row.id,
      ])
    ).rows[0];
    expect(closed.fecha_publicacion.toISOString()).toBe('2026-01-01T12:00:00.000Z');
    expect(closed.fecha_cierre).toBeInstanceOf(Date);
    const edited = (
      await client.query(
        "UPDATE public.vacante SET titulo='Descripción corregida' WHERE id=$1 RETURNING *",
        [row.id],
      )
    ).rows[0];
    expect(edited.fecha_cierre).toEqual(closed.fecha_cierre);
  });

  it('impide reabrir una vacante cerrada', async () => {
    const row = await vacancy('CERRADA');
    await expect(
      client.query("UPDATE public.vacante SET estado='PUBLICADO' WHERE id=$1", [row.id]),
    ).rejects.toMatchObject({ code: 'P0001' });
  });

  it('impide nuevas postulaciones a una vacante cerrada', async () => {
    const row = await vacancy('CERRADA');
    await expect(
      client.query('INSERT INTO public.postulacion(id_vacante) VALUES($1)', [row.id]),
    ).rejects.toMatchObject({ code: 'P0001' });
  });

  it('impide trasladar una postulación a una vacante cerrada', async () => {
    const open = await vacancy('PUBLICADO');
    const closed = await vacancy('CERRADA');
    const application = (
      await client.query('INSERT INTO public.postulacion(id_vacante) VALUES($1) RETURNING id', [
        open.id,
      ])
    ).rows[0];
    await expect(
      client.query('UPDATE public.postulacion SET id_vacante=$1 WHERE id=$2', [
        closed.id,
        application.id,
      ]),
    ).rejects.toMatchObject({ code: 'P0001' });
  });

  it('permite tramitar postulaciones recibidas antes del cierre', async () => {
    const row = await vacancy('PUBLICADO');
    const application = (
      await client.query('INSERT INTO public.postulacion(id_vacante) VALUES($1) RETURNING id', [
        row.id,
      ])
    ).rows[0];
    await client.query("UPDATE public.vacante SET estado='CERRADA' WHERE id=$1", [row.id]);
    const changed = await client.query(
      "UPDATE public.postulacion SET estado='REVISADA' WHERE id=$1",
      [application.id],
    );
    expect(changed.rowCount).toBe(1);
  });

  it('rechaza salarios negativos nuevos', async () => {
    await expect(vacancy('PUBLICADO', -1)).rejects.toMatchObject({
      code: '23514',
      constraint: 'chk_e4_vacante_salario',
    });
  });

  it.each([null, 0])('permite salario %s', async (salary) => {
    expect((await vacancy('PUBLICADO', salary)).id).toBeDefined();
  });
});
