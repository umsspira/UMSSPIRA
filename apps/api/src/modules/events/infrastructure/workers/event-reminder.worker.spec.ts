import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import { PushNotificationService } from '../../../notifications/application/services/push-notification.service';
import { EventReminderWorker } from './event-reminder.worker';

function setup(overrides: {
  registrationStatus?: string;
  deliveries?: Array<{ id_dispositivo: string }>;
  startDate?: Date;
  programmedAt?: Date;
  eventStatus?: string;
  anticipationHours?: number;
} = {}) {
  const startDate = overrides.startDate ?? new Date(Date.now() + 12 * 60 * 60 * 1000);
  const reminder = {
    id: 'reminder-1',
    id_evento: 'event-1',
    id_inscripcion: 'registration-1',
    programado_para: overrides.programmedAt ?? new Date(startDate.getTime() - 24 * 60 * 60 * 1000),
    reprogramado: false,
    intentos: 1,
    inscripcion: { id_usuario: 'user-1', estado: overrides.registrationStatus ?? 'CONFIRMADA' },
    evento: {
      id: 'event-1',
      titulo: 'Encuentro de titulados',
      fecha_inicio: startDate,
      fecha_fin: new Date(startDate.getTime() + 2 * 60 * 60 * 1000),
      ubicacion: 'Campus Central',
      estado: overrides.eventStatus ?? 'PUBLICADO',
      archivado: false,
    },
  };
  const prisma = {
    configuracionRecordatorios: {
      findUniqueOrThrow: jest.fn().mockResolvedValue({
        anticipacion_horas: overrides.anticipationHours ?? 24,
      }),
    },
    recordatorioEvento: {
      findUnique: jest.fn().mockResolvedValue(reminder),
      update: jest.fn().mockResolvedValue(undefined),
    },
    recordatorioEntrega: {
      findMany: jest.fn().mockResolvedValue(overrides.deliveries ?? []),
      upsert: jest.fn().mockResolvedValue(undefined),
    },
  };
  const pushNotifications = { notifyWithResults: jest.fn().mockResolvedValue([]) };
  const worker = new EventReminderWorker(
    prisma as unknown as PrismaService,
    pushNotifications as unknown as PushNotificationService,
  );
  return { worker, prisma, pushNotifications };
}

describe('EventReminderWorker', () => {
  it('omits a canceled registration without attempting Push delivery', async () => {
    const { worker, prisma, pushNotifications } = setup({ registrationStatus: 'CANCELADA' });

    await (worker as unknown as { sendReminder(id: string): Promise<void> }).sendReminder('reminder-1');

    expect(pushNotifications.notifyWithResults).not.toHaveBeenCalled();
    expect(prisma.recordatorioEvento.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ estado: 'OMITIDO' }),
    }));
  });

  it('omits a canceled event without attempting Push delivery', async () => {
    const { worker, prisma, pushNotifications } = setup({ eventStatus: 'CANCELADO' });

    await (worker as unknown as { sendReminder(id: string): Promise<void> }).sendReminder('reminder-1');

    expect(pushNotifications.notifyWithResults).not.toHaveBeenCalled();
    expect(prisma.recordatorioEvento.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ estado: 'OMITIDO' }),
    }));
  });

  it('omits an event that has already started', async () => {
    const { worker, prisma, pushNotifications } = setup({ startDate: new Date('2020-01-01T10:00:00.000Z') });

    await (worker as unknown as { sendReminder(id: string): Promise<void> }).sendReminder('reminder-1');

    expect(pushNotifications.notifyWithResults).not.toHaveBeenCalled();
    expect(prisma.recordatorioEvento.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ estado: 'OMITIDO' }),
    }));
  });

  it('does not attempt delivery when the user has no active Push subscriptions', async () => {
    const { worker, prisma, pushNotifications } = setup();

    await (worker as unknown as { sendReminder(id: string): Promise<void> }).sendReminder('reminder-1');

    expect(pushNotifications.notifyWithResults).toHaveBeenCalledWith(
      ['user-1'],
      expect.objectContaining({
        title: 'Recordatorio: Encuentro de titulados',
        body: expect.stringContaining('Campus Central'),
        url: '/portal/eventos/event-1?fromReminder=1',
      }),
      new Set(),
      expect.any(Function),
      'reminder-1',
    );
    expect(prisma.recordatorioEvento.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ estado: 'SIN_SUSCRIPCION' }),
    }));
    expect(prisma.recordatorioEntrega.upsert).not.toHaveBeenCalled();
  });

  it('records each device and schedules a retry only for failed deliveries', async () => {
    const { worker, prisma, pushNotifications } = setup();
    jest.mocked(pushNotifications.notifyWithResults).mockImplementation(async (_userIds, _payload, _excluded, onDelivery) => {
      await onDelivery?.({ deviceId: 'sent-device', outcome: 'sent' });
      await onDelivery?.({ deviceId: 'failed-device', outcome: 'failed', error: 'network error' });
      return [
        { deviceId: 'sent-device', outcome: 'sent' },
        { deviceId: 'failed-device', outcome: 'failed', error: 'network error' },
      ];
    });

    await (worker as unknown as { sendReminder(id: string): Promise<void> }).sendReminder('reminder-1');

    expect(prisma.recordatorioEntrega.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.recordatorioEvento.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        estado: 'FALLIDO',
        error: 'network error',
        reintentar_en: expect.any(Date),
      }),
    }));
  });

  it('uses the global anticipation and marks the reminder as rescheduled before sending', async () => {
    const startDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const previousProgrammedAt = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const { worker, prisma, pushNotifications } = setup({
      startDate,
      programmedAt: previousProgrammedAt,
      anticipationHours: 6,
    });

    await (worker as unknown as { sendReminder(id: string): Promise<void> }).sendReminder('reminder-1');

    expect(pushNotifications.notifyWithResults).not.toHaveBeenCalled();
    expect(prisma.recordatorioEvento.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        estado: 'PENDIENTE',
        programado_para: new Date(startDate.getTime() - 6 * 60 * 60 * 1000),
        reprogramado: true,
      }),
    }));
  });

  it('excludes devices whose reminder delivery was already confirmed', async () => {
    const { worker, pushNotifications } = setup({ deliveries: [{ id_dispositivo: 'sent-device' }] });

    await (worker as unknown as { sendReminder(id: string): Promise<void> }).sendReminder('reminder-1');

    expect(pushNotifications.notifyWithResults).toHaveBeenCalledWith(
      ['user-1'],
      expect.any(Object),
      new Set(['sent-device']),
      expect.any(Function),
      'reminder-1',
    );
  });
});
