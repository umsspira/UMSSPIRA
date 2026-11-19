import { registerServiceWorker } from './register-sw';

function mockServiceWorker(legacyScope?: string) {
  const unregister = jest.fn().mockResolvedValue(true);
  const registration = { addEventListener: jest.fn(), installing: null, waiting: null, active: { postMessage: jest.fn() } };
  const register = jest.fn().mockResolvedValue(registration);
  Object.defineProperty(window.navigator, 'serviceWorker', {
    configurable: true,
    value: {
      register,
      controller: null,
      addEventListener: jest.fn(),
      ready: Promise.resolve(registration),
      getRegistration: jest.fn().mockResolvedValue(legacyScope ? { scope: legacyScope, unregister } : undefined),
    },
  });
  return { register, unregister };
}

beforeEach(() => {
  window.matchMedia = jest.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
});

describe('HU08 · registro del Service Worker', () => {
  it('se registra con alcance "/" para cubrir Mis QR (/events/catalog/passes y /mis-pases)', async () => {
    const { register } = mockServiceWorker();
    await registerServiceWorker();
    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });

  it('retira el registro antiguo de alcance /portal', async () => {
    const { unregister } = mockServiceWorker('http://localhost/portal');
    await registerServiceWorker();
    expect(unregister).toHaveBeenCalledTimes(1);
  });

  it('no toca un registro de alcance "/"', async () => {
    const { unregister } = mockServiceWorker('http://localhost/');
    await registerServiceWorker();
    expect(unregister).not.toHaveBeenCalled();
  });
});
