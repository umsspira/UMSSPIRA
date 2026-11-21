import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { MentorshipRequestRepository } from '../ports/mentorship-request-repository.port';
import { CancelMyMentorshipRequestUseCase } from './cancel-my-mentorship-request.use-case';

const graduate = { id: 'user-1', role: 'titulado' } as ActorContext;
const company = { id: 'company-1', role: 'empresa' } as ActorContext;
const requestId = '7f4d3f5b-2a1e-4f0a-9c1d-1a2b3c4d5e6f';
const now = new Date('2026-11-16T12:00:00Z');

const canceled = {
  id: requestId,
  mentorId: 'mentor-1',
  requesterId: 'user-1',
  requesterName: null,
  date: new Date('2026-11-23'),
  startTime: new Date('1970-01-01T09:00:00Z'),
  endTime: new Date('1970-01-01T10:00:00Z'),
  message: null,
  status: 'CANCELADO' as const,
  createdAt: new Date('2026-11-16'),
  respondedAt: null,
  updatedAt: now,
  mentorName: 'Ana Quispe',
  mentorPosition: null,
  mentorCompany: null,
};

describe('CancelMyMentorshipRequestUseCase', () => {
  const repository = {
    cancelCreated: jest.fn(),
  } as unknown as jest.Mocked<MentorshipRequestRepository>;

  beforeEach(() => jest.resetAllMocks());

  it('cancela con el usuario autenticado y la hora inyectada', async () => {
    repository.cancelCreated.mockResolvedValue(canceled);

    await expect(
      new CancelMyMentorshipRequestUseCase(repository, () => now).execute(graduate, requestId),
    ).resolves.toBe(canceled);
    expect(repository.cancelCreated).toHaveBeenCalledWith('user-1', requestId, now);
  });

  it('rechaza actores que no son titulados', async () => {
    await expect(
      new CancelMyMentorshipRequestUseCase(repository, () => now).execute(company, requestId),
    ).rejects.toMatchObject({
      code: 'MENTORSHIP_REQUEST_FORBIDDEN',
      reason: 'forbidden',
    });
    expect(repository.cancelCreated).not.toHaveBeenCalled();
  });
});
