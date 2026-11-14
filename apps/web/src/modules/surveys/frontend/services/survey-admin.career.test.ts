import { authenticatedFetch } from '@/shared/services/auth-session';
import { loadCareerName } from './survey-admin.adapter';

jest.mock('@/shared/services/auth-session', () => ({ authenticatedFetch: jest.fn() }));

const mockedFetch = authenticatedFetch as jest.Mock;
const ok = (data: unknown) => ({ ok: true, json: async () => ({ data }) });

describe('loadCareerName (subtítulo del mock-up 15)', () => {
  beforeEach(() => mockedFetch.mockReset());

  it('devuelve el nombre de la carrera del administrador', async () => {
    mockedFetch
      .mockResolvedValueOnce(ok({ scopes: { careerIds: ['c1'] } }))
      .mockResolvedValueOnce(
        ok([
          { id: 'c1', nombre: 'Ingeniería de Sistemas' },
          { id: 'c2', nombre: 'Ingeniería Informática' },
        ]),
      );
    await expect(loadCareerName()).resolves.toBe('Ingeniería de Sistemas');
  });

  it('devuelve null si no se pudo consultar', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('offline'));
    await expect(loadCareerName()).resolves.toBeNull();
  });
});
