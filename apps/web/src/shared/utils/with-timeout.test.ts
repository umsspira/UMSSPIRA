import { SECTION_TIMEOUT_MS, SectionTimeoutError, withTimeout } from './with-timeout';

describe('withTimeout (HU18 CA-01)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('el límite por defecto es de 8 segundos', () => {
    expect(SECTION_TIMEOUT_MS).toBe(8000);
  });

  it('rechaza con SectionTimeoutError y cancela la petición si no responde', async () => {
    let received: AbortSignal | undefined;
    const pending = withTimeout((signal) => {
      received = signal;
      return new Promise<string>(() => undefined);
    });
    const assertion = expect(pending).rejects.toBeInstanceOf(SectionTimeoutError);

    jest.advanceTimersByTime(SECTION_TIMEOUT_MS);

    await assertion;
    expect(received?.aborted).toBe(true);
  });

  it('devuelve el resultado si responde a tiempo', async () => {
    await expect(withTimeout(async () => 'ok')).resolves.toBe('ok');
  });
});