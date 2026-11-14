import { act, renderHook, waitFor } from '@testing-library/react';
import { useCompetencyHeatmap } from './use-competency-heatmap';
import { heatmapMockupFixture } from '../components/competency-heatmap/__fixtures__/competency-heatmap.fixture';
import { SessionError } from '@/shared/services/auth-session';
import { SESSION_EXPIRED_EVENT } from '@/modules/auth/frontend/services/session-expired';

describe('HU-EP09-06 CA-07: actualización y sesión', () => {
  it('consulta al abrir y actualiza al presionar Actualizar', async () => {
    const first = heatmapMockupFixture();
    const second = { ...first, updatedAt: '2026-11-12T10:20:00-04:00' };
    const loader = jest.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const { result } = renderHook(() => useCompetencyHeatmap(loader));
    await waitFor(() => expect(result.current.data?.updatedAt).toBe(first.updatedAt));
    await act(async () => { await result.current.refresh(); });
    expect(result.current.data?.updatedAt).toBe(second.updatedAt);
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('muestra error en fallos de red sin publicar datos de ejemplo', async () => {
    const loader = jest.fn().mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useCompetencyHeatmap(loader));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.error).toMatch(/No se pudo actualizar/);
  });

  it('notifica al boundary administrativo cuando expira la sesión', async () => {
    const expired = jest.fn();
    window.addEventListener(SESSION_EXPIRED_EVENT, expired);
    const loader = jest.fn().mockRejectedValue(new SessionError(401, 'Expiró'));
    const { result } = renderHook(() => useCompetencyHeatmap(loader));
    try {
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(expired).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener(SESSION_EXPIRED_EVENT, expired);
    }
  });
});
