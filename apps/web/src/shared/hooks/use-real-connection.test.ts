import { probeConnection } from './use-real-connection';

const setOnline = (value: boolean) => Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });

describe('probeConnection', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    setOnline(true);
  });

  it('si el navegador dice sin red, no hace falta preguntar: sin conexión', async () => {
    setOnline(false);
    global.fetch = jest.fn() as never;
    expect(await probeConnection()).toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('con red pero sin salida a internet (la petición falla): sin conexión', async () => {
    setOnline(true);
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch')) as never;
    expect(await probeConnection()).toBe(false);
  });

  it('con red y el servidor responde (aunque sea con error HTTP): hay conexión', async () => {
    setOnline(true);
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 }) as never;
    expect(await probeConnection()).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith('/sw.js', expect.objectContaining({ method: 'HEAD', cache: 'no-store' }));
  });
});
