import { authenticatedFetch } from '@/shared/services/auth-session';
import { loadAdminCareers } from './survey-admin.adapter';

jest.mock('@/shared/services/auth-session', () => ({ authenticatedFetch: jest.fn() }));

const mockedFetch = authenticatedFetch as jest.Mock;
const ok = (data: unknown) => ({ ok: true, json: async () => ({ data }) });

describe('loadAdminCareers (subtítulo del mock-up 15 y campo «Carrera»)', () => {
  beforeEach(() => mockedFetch.mockReset());

  it('devuelve solo las carreras del administrador, sin «Lic. en»', async () => {
    mockedFetch
      .mockResolvedValueOnce(ok({ scopes: { careerIds: ['c1'] } }))
      .mockResolvedValueOnce(
        ok([
          { id: 'c1', nombre: 'Lic. en Ingeniería de Sistemas' },
          { id: 'c2', nombre: 'Lic. en Ingeniería en Informática' },
        ]),
      );
    await expect(loadAdminCareers()).resolves.toEqual([{ id: 'c1', name: 'Ingeniería de Sistemas' }]);
  });

  it('devuelve las dos carreras de un administrador de dos carreras', async () => {
    mockedFetch
      .mockResolvedValueOnce(ok({ scopes: { careerIds: ['c1', 'c2'] } }))
      .mockResolvedValueOnce(
        ok([
          { id: 'c1', nombre: 'Lic. en Ingeniería de Sistemas' },
          { id: 'c2', nombre: 'Lic. en Ingeniería en Informática' },
          { id: 'c3', nombre: 'Lic. en Biología' },
        ]),
      );
    await expect(loadAdminCareers()).resolves.toEqual([
      { id: 'c1', name: 'Ingeniería de Sistemas' },
      { id: 'c2', name: 'Ingeniería en Informática' },
    ]);
  });

  it('devuelve una lista vacía si no se pudo consultar', async () => {
    mockedFetch.mockRejectedValueOnce(new Error('offline'));
    await expect(loadAdminCareers()).resolves.toEqual([]);
  });
});
