import { act, renderHook, waitFor } from '@testing-library/react';

import { fetchMiniAffinity } from '@/modules/profile/data/mini-affinity-source';
import { useMiniAffinity } from './use-mini-affinity';

jest.mock('@/modules/profile/data/mini-affinity-source', () => ({
  fetchMiniAffinity: jest.fn(),
}));

const fetchMiniAffinityMock = fetchMiniAffinity as jest.MockedFunction<typeof fetchMiniAffinity>;

const VALUES = [82, 64, 51, 45, 38, 30];

describe('useMiniAffinity (HU-17)', () => {
  beforeEach(() => {
    fetchMiniAffinityMock.mockReset();
  });

  it('empieza en "loading" mientras el cálculo no llega', () => {
    fetchMiniAffinityMock.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useMiniAffinity());

    expect(result.current.state).toEqual({ status: 'loading' });
  });

  it('pasa a "ready" con los 6 valores', async () => {
    fetchMiniAffinityMock.mockResolvedValue({ status: 'ok', values: VALUES });

    const { result } = renderHook(() => useMiniAffinity());

    await waitFor(() => expect(result.current.state).toEqual({ status: 'ready', values: VALUES }));
    expect(fetchMiniAffinityMock).toHaveBeenCalledTimes(1);
  });

  it('pasa a "empty" si la fuente responde status "empty"', async () => {
    fetchMiniAffinityMock.mockResolvedValue({ status: 'empty', values: VALUES });

    const { result } = renderHook(() => useMiniAffinity());

    await waitFor(() => expect(result.current.state).toEqual({ status: 'empty' }));
  });

  it('pasa a "empty" si todas las áreas están en 0', async () => {
    fetchMiniAffinityMock.mockResolvedValue({ status: 'ok', values: [0, 0, 0, 0, 0, 0] });

    const { result } = renderHook(() => useMiniAffinity());

    await waitFor(() => expect(result.current.state).toEqual({ status: 'empty' }));
  });

  it('pasa a "error" si falla y "retry" vuelve a pedir el cálculo', async () => {
    fetchMiniAffinityMock.mockRejectedValueOnce(new Error('falló'));

    const { result } = renderHook(() => useMiniAffinity());

    await waitFor(() => expect(result.current.state).toEqual({ status: 'error' }));

    fetchMiniAffinityMock.mockResolvedValueOnce({ status: 'ok', values: VALUES });
    await act(async () => {
      await result.current.retry();
    });

    expect(result.current.state).toEqual({ status: 'ready', values: VALUES });
    expect(fetchMiniAffinityMock).toHaveBeenCalledTimes(2);
  });
});