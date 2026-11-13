import { ScheduledEventPublicationWorker } from './scheduled-event-publication.worker';

describe('publicación automática de eventos', () => {
  const validRow = {
    id: 'event-1',
    id_usuario: 'admin-1',
    titulo: 'Encuentro de titulados',
    descripcion: 'Información del evento',
    fecha_inicio: new Date('2026-12-01T14:00:00Z'),
    fecha_fin: new Date('2026-12-01T17:00:00Z'),
    cupo_maximo: 50,
    ubicacion: 'Campus Central',
    estado: 'BORRADOR',
    id_portada: null,
    fecha_creacion: new Date('2026-11-01T10:00:00Z'),
    fecha_publicacion_programada: new Date('2026-11-13T10:00:00Z'),
    estado_programacion: 'PENDIENTE',
  };

  function setup(row: typeof validRow | null) {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue(row ? [{ id: row.id }] : []),
      evento: {
        findUniqueOrThrow: jest.fn().mockResolvedValue(row),
        update: jest.fn().mockResolvedValue(row),
      },
    };

    const prisma = {
      $transaction: jest.fn(async (callback) => callback(tx)),
    };

    const worker = new ScheduledEventPublicationWorker(prisma as never);
    return { worker, tx };
  }

  it('publica un borrador válido y limpia su programación', async () => {
    const { worker, tx } = setup(validRow);

    await expect(worker['publishNext']()).resolves.toBe(true);

    expect(tx.evento.update).toHaveBeenCalledWith({
      where: { id: validRow.id },
      data: {
        estado: 'PUBLICADO',
        estado_programacion: 'EJECUTADA',
      },
    });
  });

  it('mantiene privado el evento y marca la programación como fallida si es inválido', async () => {
    const { worker, tx } = setup({ ...validRow, titulo: '123' });

    await expect(worker['publishNext']()).resolves.toBe(true);

    expect(tx.evento.update).toHaveBeenCalledWith({
      where: { id: validRow.id },
      data: { estado_programacion: 'FALLIDA' },
    });
  });

  it('no modifica eventos cuando no hay programaciones pendientes', async () => {
    const { worker, tx } = setup(null);

    await expect(worker['publishNext']()).resolves.toBe(false);
    expect(tx.evento.findUniqueOrThrow).not.toHaveBeenCalled();
    expect(tx.evento.update).not.toHaveBeenCalled();
  });
});
