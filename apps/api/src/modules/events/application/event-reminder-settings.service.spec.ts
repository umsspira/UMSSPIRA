import { PrismaService } from '../../../shared/infrastructure/database/prisma.service';
import { EventReminderSettingsService } from './event-reminder-settings.service';

describe('EventReminderSettingsService', () => {
  it('returns the configured global anticipation', async () => {
    const prisma = {
      configuracionRecordatorios: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ anticipacion_horas: 36 }),
      },
    };
    const service = new EventReminderSettingsService(prisma as unknown as PrismaService);

    await expect(service.get()).resolves.toEqual({ anticipationHours: 36 });
  });

  it('updates the global value and reprograms pending and missing reminders', async () => {
    const transaction = {
      configuracionRecordatorios: {
        upsert: jest.fn().mockResolvedValue({ anticipacion_horas: 48 }),
      },
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    const prisma = {
      $transaction: jest.fn(async (callback: (tx: typeof transaction) => Promise<unknown>) =>
        callback(transaction)),
    };
    const service = new EventReminderSettingsService(prisma as unknown as PrismaService);

    await expect(service.update(48)).resolves.toEqual({ anticipationHours: 48 });

    expect(transaction.configuracionRecordatorios.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        update: { anticipacion_horas: 48 },
      }),
    );
    expect(transaction.$executeRaw).toHaveBeenCalledTimes(2);
  });
});
