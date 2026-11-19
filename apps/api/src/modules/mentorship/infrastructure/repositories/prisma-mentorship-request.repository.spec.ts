import type { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import type { RegistrationSecurity } from '../../../registrations/application/ports/registration-security.port';
import { PrismaMentorshipRequestRepository } from './prisma-mentorship-request.repository';

const time = (value: string) => new Date(`1970-01-01T${value}:00Z`);
const date = (value: string) => new Date(`${value}T00:00:00Z`);
const activeMentor = {
  id: 'mentor-1',
  id_titulado: 'titulado-mentor',
  esta_activo: true,
  titulado: { usuario: { estado: 'ACTIVO', rol: 'titulado' } },
};
// Ventana vieja de la seed: ya no debe recortar los horarios configurados.
const legacyAvailability = {
  estado: 'DISPONIBLE',
  fecha_actualizacion: new Date('2026-11-01'),
  hora_inicio: time('18:00'),
  hora_fin: time('20:00'),
};

function database() {
  const client = {
    $queryRaw: jest.fn().mockResolvedValue([{ published: true }]),
    titulado: { findFirst: jest.fn().mockResolvedValue({ id: 'titulado-solicitante' }) },
    mentor: { findUnique: jest.fn().mockResolvedValue(activeMentor) },
    disponibilidadMentor: { findFirst: jest.fn().mockResolvedValue(legacyAvailability) },
    espacioDisponibleMentor: { findMany: jest.fn(), findFirst: jest.fn() },
    mentoriaSolicitud: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      groupBy: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };
  const prisma = {
    ...client,
    $transaction: jest.fn((run: (tx: typeof client) => unknown) => run(client)),
  };
  const repository = new PrismaMentorshipRequestRepository(
    prisma as unknown as PrismaService,
    {} as RegistrationSecurity,
  );
  return { client, repository };
}

describe('PrismaMentorshipRequestRepository.slots', () => {
  // 2026-11-17 01:00 UTC son las 21:00 del lunes 16 en Bolivia.
  const mondayNight = new Date('2026-11-17T01:00:00Z');

  it('usa la fecha y la hora de Bolivia y el horario semanal sin la ventana vieja', async () => {
    const { client, repository } = database();
    client.espacioDisponibleMentor.findMany.mockResolvedValue([
      { dia_semana: 1, horario_inicio: time('20:00'), horario_fin: time('23:00') },
      { dia_semana: 2, horario_inicio: time('09:00'), horario_fin: time('11:00') },
    ]);

    await expect(repository.slots('mentor-1', mondayNight, 2)).resolves.toEqual([
      // 20:00 y 21:00 ya empezaron en Bolivia; queda 22:00.
      { date: '2026-11-16', slots: [{ startTime: '22:00', endTime: '23:00' }] },
      {
        date: '2026-11-17',
        slots: [
          { startTime: '09:00', endTime: '10:00' },
          { startTime: '10:00', endTime: '11:00' },
        ],
      },
    ]);
    expect(client.mentoriaSolicitud.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          solicitud_fecha: { gte: date('2026-11-16'), lte: date('2026-11-17') },
        }),
      }),
    );
  });

  it('reconoce el domingo guardado como 0 o como 7 y omite las horas ocupadas', async () => {
    const { client, repository } = database();
    client.espacioDisponibleMentor.findMany.mockResolvedValue([
      { dia_semana: 0, horario_inicio: time('09:00'), horario_fin: time('11:00') },
      { dia_semana: 7, horario_inicio: time('15:00'), horario_fin: time('16:00') },
    ]);
    client.mentoriaSolicitud.findMany.mockResolvedValue([
      { solicitud_fecha: date('2026-11-22'), solicitud_inicio: time('09:00'), solicitud_fin: time('10:00') },
    ]);

    const days = await repository.slots('mentor-1', mondayNight, 7);
    expect(days.find((day) => day.date === '2026-11-22')?.slots).toEqual([
      { startTime: '10:00', endTime: '11:00' },
      { startTime: '15:00', endTime: '16:00' },
    ]);
  });
});

describe('PrismaMentorshipRequestRepository.create', () => {
  const input = {
    mentorId: 'mentor-1',
    date: '2026-11-23',
    startTime: '09:00',
    endTime: '10:00',
    message: 'Orientación',
  };

  it('acepta un horario dentro del horario semanal aunque esté fuera de la ventana vieja', async () => {
    const { client, repository } = database();
    client.espacioDisponibleMentor.findFirst.mockResolvedValue({ id: 'espacio-1' });
    client.mentoriaSolicitud.create.mockResolvedValue({
      id: 'solicitud-1',
      id_mentor: 'mentor-1',
      id_usuario: 'user-1',
      solicitud_fecha: date('2026-11-23'),
      solicitud_inicio: time('09:00'),
      solicitud_fin: time('10:00'),
      mensaje: 'Orientación',
      estado: 'PENDIENTE',
      fecha_respuesta: null,
      fecha_creacion: new Date('2026-11-16'),
      usuario: { nombre: 'Ana', titulado: { nombre: 'Ana', apellido: 'Rojas' } },
    });

    await expect(repository.create('user-1', input, new Date('2026-11-16T12:00:00Z'))).resolves.toMatchObject({
      id: 'solicitud-1',
      status: 'PENDIENTE',
    });
    // 2026-11-23 es lunes.
    expect(client.espacioDisponibleMentor.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id_mentor: 'mentor-1', dia_semana: { in: [1] }, esta_activo: true }),
      }),
    );
  });

  it('busca el domingo como 0 o 7', async () => {
    const { client, repository } = database();
    client.espacioDisponibleMentor.findFirst.mockResolvedValue(null);
    await expect(
      repository.create('user-1', { ...input, date: '2026-11-22' }, new Date('2026-11-16T12:00:00Z')),
    ).rejects.toMatchObject({ code: 'MENTOR_SLOT_UNAVAILABLE' });
    expect(client.espacioDisponibleMentor.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ dia_semana: { in: [0, 7] } }) }),
    );
  });

  it('rechaza un horario fuera del horario semanal sin registrar la solicitud', async () => {
    const { client, repository } = database();
    client.espacioDisponibleMentor.findFirst.mockResolvedValue(null);
    await expect(repository.create('user-1', input, new Date('2026-11-16T12:00:00Z'))).rejects.toMatchObject({
      code: 'MENTOR_SLOT_UNAVAILABLE',
    });
    expect(client.mentoriaSolicitud.create).not.toHaveBeenCalled();
  });
});

const myRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'solicitud-1',
  id_mentor: 'mentor-1',
  id_usuario: 'user-1',
  solicitud_fecha: date('2026-11-23'),
  solicitud_inicio: time('09:00'),
  solicitud_fin: time('10:00'),
  mensaje: 'Orientación',
  estado: 'PENDIENTE',
  fecha_respuesta: null,
  fecha_creacion: date('2026-11-16'),
  fecha_actualizacion: date('2026-11-16'),
  mentor: {
    id: 'mentor-1',
    titulado: {
      nombre: 'Ana',
      apellido: 'Quispe',
      experiencia_laboral_registros: [{ cargo: 'Data Scientist', empresa: 'Acme' }],
    },
  },
  ...overrides,
});

describe('PrismaMentorshipRequestRepository.listCreatedByUser', () => {
  it('filtra por el usuario autenticado, ordena por fecha y calcula los conteos', async () => {
    const { client, repository } = database();
    client.mentoriaSolicitud.findMany.mockResolvedValue([myRow()]);
    client.mentoriaSolicitud.count.mockResolvedValue(3);
    client.mentoriaSolicitud.groupBy.mockResolvedValue([
      { estado: 'PENDIENTE', _count: { _all: 1 } },
      { estado: 'CANCELADO', _count: { _all: 2 } },
    ]);

    const result = await repository.listCreatedByUser('user-1', { page: 2, pageSize: 10 });

    expect(client.mentoriaSolicitud.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id_usuario: 'user-1' },
        orderBy: [
          { fecha_creacion: { sort: 'desc', nulls: 'last' } },
          { solicitud_fecha: { sort: 'desc', nulls: 'last' } },
          { id: 'desc' },
        ],
        skip: 10,
        take: 10,
      }),
    );
    expect(client.mentoriaSolicitud.groupBy).toHaveBeenCalledWith({
      by: ['estado'],
      where: { id_usuario: 'user-1' },
      _count: { _all: true },
    });
    expect(result).toMatchObject({
      total: 3,
      page: 2,
      pageSize: 10,
      totalPages: 1,
      counts: { TODAS: 3, PENDIENTE: 1, ACEPTADO: 0, RECHAZADO: 0, CANCELADO: 2 },
    });
    expect(result.items[0]).toMatchObject({
      mentorId: 'mentor-1',
      mentorName: 'Ana Quispe',
      mentorPosition: 'Data Scientist',
      mentorCompany: 'Acme',
      status: 'PENDIENTE',
      updatedAt: date('2026-11-16'),
    });
  });

  it('aplica el estado opcional sin dejar de filtrar por el usuario', async () => {
    const { client, repository } = database();
    await repository.listCreatedByUser('user-1', {
      status: 'CANCELADO',
      page: 1,
      pageSize: 20,
    });
    expect(client.mentoriaSolicitud.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id_usuario: 'user-1', estado: 'CANCELADO' } }),
    );
    expect(client.mentoriaSolicitud.count).toHaveBeenCalledWith({
      where: { id_usuario: 'user-1', estado: 'CANCELADO' },
    });
  });

  it('devuelve una página vacía y conteos en cero sin solicitudes', async () => {
    const { repository } = database();
    await expect(
      repository.listCreatedByUser('user-1', { page: 1, pageSize: 20 }),
    ).resolves.toMatchObject({
      items: [],
      total: 0,
      totalPages: 0,
      counts: { TODAS: 0, PENDIENTE: 0, ACEPTADO: 0, RECHAZADO: 0, CANCELADO: 0 },
    });
  });
});

describe('PrismaMentorshipRequestRepository.cancelCreated', () => {
  const now = new Date('2026-11-16T12:00:00Z');

  it('cancela solo una solicitud propia y pendiente', async () => {
    const { client, repository } = database();
    client.mentoriaSolicitud.findFirst.mockResolvedValue({ id: 'solicitud-1', estado: 'PENDIENTE' });
    client.mentoriaSolicitud.updateMany.mockResolvedValue({ count: 1 });
    client.mentoriaSolicitud.findUnique.mockResolvedValue(myRow({ estado: 'CANCELADO' }));

    await expect(repository.cancelCreated('user-1', 'solicitud-1', now)).resolves.toMatchObject({
      id: 'solicitud-1',
      status: 'CANCELADO',
    });
    expect(client.mentoriaSolicitud.findFirst).toHaveBeenCalledWith({
      where: { id: 'solicitud-1', id_usuario: 'user-1' },
      select: { id: true, estado: true },
    });
    expect(client.mentoriaSolicitud.updateMany).toHaveBeenCalledWith({
      where: { id: 'solicitud-1', id_usuario: 'user-1', estado: 'PENDIENTE' },
      data: { estado: 'CANCELADO', fecha_actualizacion: now },
    });
  });

  it('responde 404 cuando la solicitud no existe o pertenece a otro usuario', async () => {
    const { client, repository } = database();
    client.mentoriaSolicitud.findFirst.mockResolvedValue(null);
    await expect(repository.cancelCreated('user-1', 'solicitud-1', now)).rejects.toMatchObject({
      code: 'SOLICITUD_NO_ENCONTRADA',
      reason: 'missing',
    });
    expect(client.mentoriaSolicitud.updateMany).not.toHaveBeenCalled();
  });

  it('responde 409 cuando la solicitud ya no está pendiente', async () => {
    const { client, repository } = database();
    client.mentoriaSolicitud.findFirst.mockResolvedValue({ id: 'solicitud-1', estado: 'ACEPTADO' });
    await expect(repository.cancelCreated('user-1', 'solicitud-1', now)).rejects.toMatchObject({
      code: 'SOLICITUD_NO_PENDIENTE',
      reason: 'conflict',
    });
    expect(client.mentoriaSolicitud.updateMany).not.toHaveBeenCalled();
  });

  it('responde 409 si otra cancelación ganó la carrera', async () => {
    const { client, repository } = database();
    client.mentoriaSolicitud.findFirst.mockResolvedValue({ id: 'solicitud-1', estado: 'PENDIENTE' });
    client.mentoriaSolicitud.updateMany.mockResolvedValue({ count: 0 });
    await expect(repository.cancelCreated('user-1', 'solicitud-1', now)).rejects.toMatchObject({
      code: 'SOLICITUD_NO_PENDIENTE',
      reason: 'conflict',
    });
  });
});
