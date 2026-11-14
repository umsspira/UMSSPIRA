import { AFFINITY_AREAS } from '@umsspira/shared-types/src/affinity';

import { ApiError, apiFetch } from '@/shared/services/api-client';

import { fetchMiniAffinity } from './mini-affinity-source';

jest.mock('@/shared/services/api-client', () => ({
  ...jest.requireActual('@/shared/services/api-client'),
  apiFetch: jest.fn(),
}));

const apiFetchMock = apiFetch as jest.MockedFunction<typeof apiFetch>;

// Respuesta de GET /api/v1/radar como la envía la API (áreas en desorden, a propósito)
function radarResponse(overrides: Record<string, unknown> = {}) {
  const affinities = [12.5, 82.5, 10, 0, 0, 32.5];
  return {
    graduateId: 'titulado-1',
    calculatedAt: '2026-11-13T12:00:00.000Z',
    status: 'ok',
    hasPendingChanges: false,
    areas: [...AFFINITY_AREAS].reverse().map((area) => ({
      area,
      affinity: affinities[AFFINITY_AREAS.indexOf(area)],
    })),
    ...overrides,
  };
}

describe('fetchMiniAffinity con GET /radar (HU-17)', () => {
  beforeEach(() => apiFetchMock.mockReset());

  it('CA-01: devuelve los 6 valores del último cálculo en el orden del radar de Mi afinidad', async () => {
    apiFetchMock.mockResolvedValue(radarResponse());

    await expect(fetchMiniAffinity()).resolves.toEqual({
      status: 'ok',
      values: [12.5, 82.5, 10, 0, 0, 32.5],
      hasPendingChanges: false,
    });
    expect(apiFetchMock.mock.calls[0][0]).toBe('/api/v1/radar');
  });

  it('CA-04: con cambios pendientes muestra el último resultado guardado, sin pedir recálculo', async () => {
    apiFetchMock.mockResolvedValue(radarResponse({ hasPendingChanges: true }));

    const result = await fetchMiniAffinity();

    expect(result).toMatchObject({ status: 'ok', values: [12.5, 82.5, 10, 0, 0, 32.5], hasPendingChanges: true });
    expect(apiFetchMock).toHaveBeenCalledTimes(1);
    expect(apiFetchMock.mock.calls[0][1]?.method).toBeUndefined();
  });

  it('sin datos suficientes: status "empty" o sin cálculo todavía (404)', async () => {
    apiFetchMock.mockResolvedValueOnce(radarResponse({ status: 'empty', areas: [] }));
    await expect(fetchMiniAffinity()).resolves.toMatchObject({ status: 'empty' });

    apiFetchMock.mockRejectedValueOnce(new ApiError(404, 'Sin cálculo'));
    await expect(fetchMiniAffinity()).resolves.toMatchObject({ status: 'empty' });
  });

  it('si la API falla, el error llega a la tarjeta para mostrar «Reintentar»', async () => {
    apiFetchMock.mockRejectedValue(new ApiError(500, 'Error inesperado'));

    await expect(fetchMiniAffinity()).rejects.toThrow('Error inesperado');
  });
});
