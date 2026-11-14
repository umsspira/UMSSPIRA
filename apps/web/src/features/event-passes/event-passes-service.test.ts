import { apiClient } from '@/shared/services/api-client';
import { getMyEventPass } from './event-passes-service';

jest.mock('@/shared/services/api-client', () => ({ apiClient: jest.fn() }));

it('busca el ID solo entre los pases devueltos por la consulta autenticada del usuario', async () => {
  jest.mocked(apiClient).mockResolvedValueOnce([{ id: 'mine' }] as never);
  expect(await getMyEventPass('mine')).toEqual({ id: 'mine' });
  expect(apiClient).toHaveBeenCalledWith('/api/v1/registrations/my-passes', expect.objectContaining({
    method: 'GET', authenticated: true, cache: 'no-store',
  }));

  jest.mocked(apiClient).mockResolvedValueOnce([{ id: 'mine' }] as never);
  expect(await getMyEventPass('another-users-pass')).toBeNull();
});
