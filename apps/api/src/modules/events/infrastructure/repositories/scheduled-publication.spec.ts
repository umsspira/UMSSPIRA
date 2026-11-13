import { PrismaEventsRepository } from './prisma-events.repository';

describe('programación de publicación de eventos', () => {
  const draft = {
    id: 'event-1',
    id_usuario: 'admin-1',
    titulo: 'Encuentro de titulados',
    descripcion: 'Información del evento',
    fecha_inicio: new Date('2027-12-01T14:00:00Z'),
    fecha_fin: new Date('2027-12-01T17:00:00Z'),
    cupo_maximo: 50,
    ubicacion: 'Campus Central',
    estado: 'BORRADOR',
    archivado: false,
    id_portada: null,
    fecha_creacion: new Date('2026-11-01T10:00:00Z'),
    fecha_publicacion_programada: null,
    estado_programacion: null,
  };

  function setup(row = draft) {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: row.id }]),
      evento: {
        findFirst: jest.fn().mockResolvedValue(row),
        update: jest.fn().mockResolvedValue(row),
      },
    };

    const prisma = {
      $transaction: jest.fn(
        async (callback: (transaction: typeof tx) => Promise<unknown>) =>
          callback(tx),
      ),
    };

    return { repository: new PrismaEventsRepository(prisma as never), tx };
  }

  it('guarda una fecha futura sin publicar el borrador', async () => {
    const { repository, tx } = setup();
    const date = new Date(Date.now() + 60_000);

    await repository.scheduleDraftPublication('admin-1', 'event-1', date);

    expect(tx.evento.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'event-1',
          id_usuario: 'admin-1',
          estado: 'BORRADOR',
          archivado: false,
        },
        data: {
          fecha_publicacion_programada: date,
          estado_programacion: 'PENDIENTE',
        },
      }),
    );
  });

  it('rechaza una fecha pasada sin actualizar el evento', async () => {
    const { repository, tx } = setup();

    await expect(
      repository.scheduleDraftPublication(
        'admin-1',
        'event-1',
        new Date(Date.now() - 60_000),
      ),
    ).rejects.toThrow('La fecha de publicación debe ser futura');

    expect(tx.evento.update).not.toHaveBeenCalled();
  });

  it('rechaza un borrador con datos inválidos', async () => {
    const { repository, tx } = setup({ ...draft, titulo: '123' });

    await expect(
      repository.scheduleDraftPublication(
        'admin-1',
        'event-1',
        new Date(Date.now() + 60_000),
      ),
    ).rejects.toThrow('Completa los datos válidos del evento antes de programarlo');

    expect(tx.evento.update).not.toHaveBeenCalled();
  });

  it('cancela la programación sin publicar el evento', async () => {
    const { repository, tx } = setup();

    await repository.cancelDraftSchedule('admin-1', 'event-1');

    expect(tx.evento.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          fecha_publicacion_programada: null,
          estado_programacion: null,
        },
      }),
    );
  });
});
