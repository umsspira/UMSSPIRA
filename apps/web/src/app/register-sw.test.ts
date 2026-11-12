import { isServiceWorkerSupported, registerServiceWorker } from './register-sw';

describe('compatibilidad sin Service Workers (CA-05)', () => {
  afterEach(() => {
    delete (navigator as unknown as Record<string, unknown>).serviceWorker;
  });

  it('detecta que el navegador no soporta Service Workers', () => {
    delete (navigator as unknown as Record<string, unknown>).serviceWorker;
    expect(isServiceWorkerSupported()).toBe(false);
  });

  it('detecta que el navegador sí soporta Service Workers', () => {
    Object.defineProperty(navigator, 'serviceWorker', { value: {}, configurable: true });
    expect(isServiceWorkerSupported()).toBe(true);
  });

  it('no registra nada ni lanza error cuando no hay soporte', async () => {
    delete (navigator as unknown as Record<string, unknown>).serviceWorker;
    await expect(registerServiceWorker()).resolves.toBeUndefined();
  });
});