import {
  STATUS_QUERY_GENERIC_MESSAGE,
  type StatusQueryRecord,
} from '../contracts/request-status.dto';
import { StatusQueryService } from './status-query.service';

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

const record = (over: Partial<StatusQueryRecord> = {}): StatusQueryRecord => ({
  applicationId: 'app-1',
  email: 'guardado@example.com',
  fullName: 'Ana Perez',
  state: 'pendiente',
  activated: false,
  ...over,
});

function build(options: { allowed?: boolean; found?: StatusQueryRecord | null } = {}) {
  const limiter = {
    consume: jest
      .fn()
      .mockResolvedValue({ allowed: options.allowed ?? true, retryAfterSeconds: 0 }),
  };
  const reader = { findLatestByEmail: jest.fn().mockResolvedValue(options.found ?? null) };
  const dispatcher = { dispatch: jest.fn().mockResolvedValue(undefined) };
  const service = new StatusQueryService(limiter as never, reader as never, dispatcher as never);
  return { service, limiter, reader, dispatcher };
}

const input = { email: 'ana@example.com', origin: '10.0.0.1' };

describe('StatusQueryService', () => {
  it('responde igual con solicitud, sin solicitud y con limite superado', async () => {
    const con = await build({ found: record() }).service.execute(input);
    const sin = await build({ found: null }).service.execute(input);
    const limitado = await build({ allowed: false, found: record() }).service.execute(input);
    expect(con).toEqual({ message: STATUS_QUERY_GENERIC_MESSAGE });
    expect(sin).toEqual(con);
    expect(limitado).toEqual(con);
  });

  it('no consulta ni envia cuando se supera un limite', async () => {
    const { service, reader, dispatcher } = build({ allowed: false, found: record() });
    await service.execute(input);
    await flush();
    expect(reader.findLatestByEmail).not.toHaveBeenCalled();
    expect(dispatcher.dispatch).not.toHaveBeenCalled();
  });

  it('no envia nada si el correo no tiene solicitud', async () => {
    const { service, dispatcher } = build({ found: null });
    await service.execute(input);
    await flush();
    expect(dispatcher.dispatch).not.toHaveBeenCalled();
  });

  it.each([
    [{ state: 'pendiente' as const }, 'pendiente'],
    [{ state: 'observada' as const }, 'observada'],
    [{ state: 'rechazada' as const }, 'rechazada'],
    [{ state: 'aprobada' as const, activated: false }, 'aprobada_por_activar'],
    [{ state: 'aprobada' as const, activated: true }, 'aprobada_activa'],
  ])('clasifica %j como %s', async (over, kind) => {
    const { service, dispatcher } = build({ found: record(over) });
    await service.execute(input);
    await flush();
    expect(dispatcher.dispatch).toHaveBeenCalledWith(expect.objectContaining({ kind }));
  });

  it('envia solo al correo guardado y no al escrito en la peticion', async () => {
    const { service, dispatcher } = build({ found: record({ email: 'guardado@example.com' }) });
    await service.execute({ email: 'otro@example.com', origin: '10.0.0.1' });
    await flush();
    expect(dispatcher.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'guardado@example.com' }),
    );
  });

  it('mantiene la respuesta si el limitador falla y no envia', async () => {
    const { service, limiter, dispatcher } = build({ found: record() });
    limiter.consume.mockRejectedValue(new Error('redis'));
    await expect(service.execute(input)).resolves.toEqual({ message: STATUS_QUERY_GENERIC_MESSAGE });
    await flush();
    expect(dispatcher.dispatch).not.toHaveBeenCalled();
  });

  it('no propaga fallos del envio ni de la lectura', async () => {
    const { service, dispatcher } = build({ found: record() });
    dispatcher.dispatch.mockRejectedValue(new Error('smtp'));
    await expect(service.execute(input)).resolves.toEqual({ message: STATUS_QUERY_GENERIC_MESSAGE });
    await flush();
  });
});