import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { MentorshipRequestRepository } from '../ports/mentorship-request-repository.port';
import { CreateMentorshipRequestUseCase } from './create-mentorship-request.use-case';

const graduate = { id: 'user-1', role: 'titulado' } as ActorContext;
const request = { mentorId: 'mentor-1', startTime: '18:00', endTime: '19:00' };

describe('CreateMentorshipRequestUseCase', () => {
  const repository = { create: jest.fn() } as unknown as jest.Mocked<MentorshipRequestRepository>;

  beforeEach(() => jest.resetAllMocks());

  it('compara el horario con la hora de Bolivia y no con UTC', async () => {
    // 19:30 UTC son las 15:30 en Bolivia: las 18:00 de hoy todavía no llegan.
    const now = new Date('2026-11-16T19:30:00Z');
    await new CreateMentorshipRequestUseCase(repository, () => now).execute(graduate, {
      ...request,
      date: '2026-11-16',
    });
    expect(repository.create).toHaveBeenCalledWith('user-1', expect.objectContaining({ date: '2026-11-16' }), now);
  });

  it('rechaza un horario de hoy que ya empezó en Bolivia', async () => {
    // 22:30 UTC son las 18:30 en Bolivia.
    const now = new Date('2026-11-16T22:30:00Z');
    await expect(
      new CreateMentorshipRequestUseCase(repository, () => now).execute(graduate, {
        ...request,
        date: '2026-11-16',
      }),
    ).rejects.toMatchObject({ code: 'MENTORSHIP_REQUEST_PAST' });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rechaza una fecha anterior a hoy en Bolivia aunque en UTC ya sea el día siguiente', async () => {
    // 02:00 UTC del 17 son las 22:00 del 16 en Bolivia.
    const now = new Date('2026-11-17T02:00:00Z');
    await expect(
      new CreateMentorshipRequestUseCase(repository, () => now).execute(graduate, {
        ...request,
        date: '2026-11-15',
      }),
    ).rejects.toMatchObject({ code: 'MENTORSHIP_REQUEST_PAST' });
    await new CreateMentorshipRequestUseCase(repository, () => now).execute(graduate, {
      ...request,
      startTime: '22:30',
      endTime: '23:30',
      date: '2026-11-16',
    });
    expect(repository.create).toHaveBeenCalledTimes(1);
  });
});
