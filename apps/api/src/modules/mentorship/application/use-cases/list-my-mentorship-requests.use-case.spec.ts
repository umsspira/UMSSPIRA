import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { MentorshipRequestRepository } from '../ports/mentorship-request-repository.port';
import { ListMyMentorshipRequestsUseCase } from './list-my-mentorship-requests.use-case';

const graduate = { id: 'user-1', role: 'titulado' } as ActorContext;
const admin = { id: 'admin-1', role: 'administrador' } as ActorContext;
const query = { page: 1, pageSize: 20 };

describe('ListMyMentorshipRequestsUseCase', () => {
  const repository = {
    listCreatedByUser: jest.fn(),
  } as unknown as jest.Mocked<MentorshipRequestRepository>;

  beforeEach(() => jest.resetAllMocks());

  it('consulta el historial propio usando la identidad de la sesión', async () => {
    repository.listCreatedByUser.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
      counts: { TODAS: 0, PENDIENTE: 0, ACEPTADO: 0, RECHAZADO: 0, CANCELADO: 0 },
    });

    await new ListMyMentorshipRequestsUseCase(repository).execute(graduate, query);

    expect(repository.listCreatedByUser).toHaveBeenCalledWith('user-1', query);
  });

  it('rechaza actores que no son titulados', async () => {
    await expect(
      new ListMyMentorshipRequestsUseCase(repository).execute(admin, query),
    ).rejects.toMatchObject({
      code: 'MENTORSHIP_REQUEST_FORBIDDEN',
      reason: 'forbidden',
    });
    expect(repository.listCreatedByUser).not.toHaveBeenCalled();
  });
});
