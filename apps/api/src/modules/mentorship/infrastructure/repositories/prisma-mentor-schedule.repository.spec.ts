import type { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { PrismaMentorScheduleRepository } from './prisma-mentor-schedule.repository';

const time = (value: string) => new Date(`1970-01-01T${value}:00Z`);

function database(activeRows: unknown[] = []) {
  const tx = {
    $queryRaw: jest.fn(),
    titulado: { findFirst: jest.fn().mockResolvedValue({ id: 'titulado-1' }) },
    mentor: {
      findUnique: jest.fn().mockResolvedValue({ id: 'mentor-1', esta_activo: true }),
      findFirst: jest.fn().mockResolvedValue({ id: 'mentor-1', esta_activo: true }),
    },
    espacioDisponibleMentor: {
      findMany: jest.fn().mockResolvedValue(activeRows),
      updateMany: jest.fn(),
      createMany: jest.fn(),
    },
    disponibilidadMentor: { updateMany: jest.fn() },
    mentoriaSolicitud: { updateMany: jest.fn(), deleteMany: jest.fn() },
  };
  const prisma = {
    ...tx,
    $transaction: jest.fn((run: (client: typeof tx) => unknown) => run(tx)),
  };
  return { prisma, tx, repository: new PrismaMentorScheduleRepository(prisma as unknown as PrismaService) };
}

describe('PrismaMentorScheduleRepository', () => {
  it('lee las franjas activas con lunes = 1 y domingo = 7', async () => {
    const { repository } = database([
      {
        dia_semana: 0,
        horario_inicio: time('09:00'),
        horario_fin: time('10:00'),
        fecha_creacion: new Date('2026-11-10'),
        fecha_actualizacion: null,
      },
      {
        dia_semana: 2,
        horario_inicio: time('18:00'),
        horario_fin: time('20:00'),
        fecha_creacion: new Date('2026-11-09'),
        fecha_actualizacion: new Date('2026-11-12'),
      },
    ]);
    await expect(repository.own('user-1')).resolves.toEqual({
      schedule: [
        { weekday: 2, start: '18:00', end: '20:00' },
        { weekday: 7, start: '09:00', end: '10:00' },
      ],
      updatedAt: new Date('2026-11-12'),
    });
  });

  it('reemplaza el horario: desactiva el anterior, crea el nuevo y limpia la ventana vieja', async () => {
    const { repository, tx } = database();
    await repository.replace('user-1', [
      { weekday: 1, start: '09:00', end: '11:00' },
      { weekday: 7, start: '15:00', end: '16:00' },
    ]);

    expect(tx.espacioDisponibleMentor.updateMany).toHaveBeenCalledWith({
      where: { id_mentor: 'mentor-1', esta_activo: true },
      data: { esta_activo: false, fecha_actualizacion: expect.any(Date) },
    });
    expect(tx.espacioDisponibleMentor.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id_mentor: 'mentor-1',
          dia_semana: 1,
          horario_inicio: time('09:00'),
          horario_fin: time('11:00'),
          esta_activo: true,
        }),
        // El domingo se guarda como 0, que es lo que busca la solicitud de mentoría.
        expect.objectContaining({ dia_semana: 0, horario_inicio: time('15:00'), horario_fin: time('16:00') }),
      ],
    });
    expect(tx.disponibilidadMentor.updateMany).toHaveBeenCalledWith({
      where: { id_mentor: 'mentor-1' },
      data: { hora_inicio: null, hora_fin: null },
    });
    // CA-F 08: las solicitudes ya registradas no se modifican.
    expect(tx.mentoriaSolicitud.updateMany).not.toHaveBeenCalled();
    expect(tx.mentoriaSolicitud.deleteMany).not.toHaveBeenCalled();
  });

  it('un horario vacío solo desactiva las franjas anteriores', async () => {
    const { repository, tx } = database();
    await expect(repository.replace('user-1', [])).resolves.toEqual({ schedule: [], updatedAt: null });
    expect(tx.espacioDisponibleMentor.updateMany).toHaveBeenCalled();
    expect(tx.espacioDisponibleMentor.createMany).not.toHaveBeenCalled();
  });

  it('rechaza al mentor inactivo sin escribir', async () => {
    const { repository, tx } = database();
    tx.mentor.findUnique.mockResolvedValue({ id: 'mentor-1', esta_activo: false });
    await expect(repository.replace('user-1', [])).rejects.toMatchObject({ code: 'MENTOR_INACTIVE' });
    expect(tx.espacioDisponibleMentor.updateMany).not.toHaveBeenCalled();
  });
});
