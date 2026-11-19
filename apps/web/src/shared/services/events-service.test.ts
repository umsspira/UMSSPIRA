import { apiClient } from './api-client';
import { retireEvent } from './events-service';

jest.mock('./api-client', () => ({ apiClient: jest.fn() }));

it('retira eventos por el endpoint owned autorizado por el backend', async () => {
  jest.mocked(apiClient).mockResolvedValueOnce({ data: { id: 'event-1' } });

  await retireEvent('event-1', 'admin-1');

  expect(apiClient).toHaveBeenCalledWith('/api/v1/events/owned/event-1/retire', {
    method: 'PATCH',
    authenticated: true,
  });
});
