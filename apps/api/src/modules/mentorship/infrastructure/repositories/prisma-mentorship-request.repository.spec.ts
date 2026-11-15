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
    $queryRaw: jest.fn(),
    titulado: { findFirst: jest.fn().mockResolvedValue({ id: 'titulado-solicitante' }) },
    mentor: { findUnique: jest.fn().mockResolvedValue(activeMentor) },
    disponibilidadMentor: { findFirst: jest.fn().mockResolvedValue(legacyAvailability) },
    espacioDisponibleMentor: { findMany: jest.fn(), findFirst: jest.fn() },
    mentoriaSolicitud: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
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
