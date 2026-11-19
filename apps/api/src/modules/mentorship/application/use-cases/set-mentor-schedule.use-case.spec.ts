import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { MentorScheduleRepository } from '../ports/mentor-schedule-repository.port';
import { SetMentorScheduleUseCase } from './set-mentor-schedule.use-case';

const actor = { id: 'user-1', role: 'titulado' } as ActorContext;

describe('SetMentorScheduleUseCase', () => {
  const repository: jest.Mocked<MentorScheduleRepository> = {
    own: jest.fn(),
    replace: jest.fn(),
  };

  beforeEach(() => jest.resetAllMocks());

  it('valida y guarda el horario ordenado', async () => {
    repository.replace.mockResolvedValue({ schedule: [], updatedAt: null });
    await new SetMentorScheduleUseCase(repository).execute(actor, {
      schedule: [
        { weekday: 3, start: '10:00', end: '12:00' },
        { weekday: 1, start: '09:00', end: '10:00' },
      ],
    });
    expect(repository.replace).toHaveBeenCalledWith('user-1', [
      { weekday: 1, start: '09:00', end: '10:00' },
      { weekday: 3, start: '10:00', end: '12:00' },
    ]);
  });

  it('no guarda un horario inválido aunque llegue desde el cliente', async () => {
    await expect(
      new SetMentorScheduleUseCase(repository).execute(actor, {
        schedule: [
          { weekday: 1, start: '09:00', end: '11:00' },
          { weekday: 1, start: '10:00', end: '12:00' },
        ],
      }),
    ).rejects.toMatchObject({ code: 'HORARIO_SOLAPADO' });
    expect(repository.replace).not.toHaveBeenCalled();
  });
});
