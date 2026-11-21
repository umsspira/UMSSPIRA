export const SECTION_TIMEOUT_MS = 8000;

export class SectionTimeoutError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`La sección no respondió en ${timeoutMs} ms.`);
    this.name = 'SectionTimeoutError';
  }
}

/**
 * HU18 CA-01: corta una consulta que tarda demasiado.
 * Cancela la petición (AbortController) y rechaza con SectionTimeoutError.
 */
export function withTimeout<T>(
  task: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number = SECTION_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController();

  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(new SectionTimeoutError(timeoutMs));
    }, timeoutMs);

    Promise.resolve()
      .then(() => task(controller.signal))
      .then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error: unknown) => {
          clearTimeout(timer);
          reject(error);
        },
      );
  });
}
