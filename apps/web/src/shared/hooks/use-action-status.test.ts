import { renderHook, act } from '@testing-library/react';
import { useActionStatus } from './use-action-status';

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value });
}

describe('useActionStatus (HU10)', () => {
  afterEach(() => setOnline(true));

  it('CA-01: pasa a loading de inmediato y bloquea toques repetidos', async () => {
    let finish: () => void = () => undefined;
    const action = jest.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const { result } = renderHook(() => useActionStatus());

    act(() => { void result.current.run(action); });
    expect(result.current.status).toBe('loading');

    act(() => { void result.current.run(action); });
    expect(action).toHaveBeenCalledTimes(1);

    await act(async () => { finish(); });
    expect(result.current.status).toBe('success');
  });

  it('CA-03: si falla guarda el mensaje y retry vuelve a ejecutar la acción', async () => {
    const action = jest
      .fn<Promise<void>, []>()
      .mockRejectedValueOnce(new Error('Se cortó la conexión.'))
      .mockResolvedValueOnce(undefined);
    const { result } = renderHook(() => useActionStatus());

    await act(async () => { await result.current.run(action); });
    expect(result.current.status).toBe('error');
    expect(result.current.errorMessage).toBe('Se cortó la conexión.');

    await act(async () => { await result.current.retry(); });
    expect(action).toHaveBeenCalledTimes(2);
    expect(result.current.status).toBe('success');
  });

  it('CA-04: sin conexión no ejecuta la acción y marca offline', async () => {
    setOnline(false);
    const action = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useActionStatus());

    await act(async () => { await result.current.run(action, { requiresConnection: true }); });

    expect(action).not.toHaveBeenCalled();
    expect(result.current.status).toBe('offline');

    setOnline(true);
    act(() => { window.dispatchEvent(new Event('online')); });
    expect(result.current.status).toBe('idle');
  });
});