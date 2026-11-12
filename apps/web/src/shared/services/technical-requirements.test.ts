import { apiClient, ApiClientError } from './api-client';
import { clearAccessToken, SessionError, setAccessToken } from './auth-session';
import { getTechnicalVacancyRequirements } from './technical-requirements';

jest.mock('./api-client', () => ({
  ...jest.requireActual('./api-client'),
  apiClient: jest.fn(),
}));

const request = jest.mocked(apiClient);
const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const otherId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const requirement = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  idVacante: id,
  competencia: 'PostgreSQL',
  nivel: 'Avanzado',
  tipo: 'Obligatorio',
  descripcion: 'Modelado de datos.',
  fechaCreacion: '2026-11-04T12:00:00.000Z',
};
const response = { idVacante: id, requisitos: [requirement] };

beforeEach(() => { request.mockReset(); });

it('uses the official authenticated proxy transport, no cache, and caller cancellation', async () => {
  const controller = new AbortController();
  request.mockResolvedValue(response);

  await expect(getTechnicalVacancyRequirements(id, controller.signal)).resolves.toEqual([requirement]);
  expect(request).toHaveBeenCalledWith(`/api/v1/job-postings/${id}/requisitos`, {
    method: 'GET', authenticated: true, credentials: 'same-origin',
    cache: 'no-store', signal: controller.signal,
  });
});

it('accepts an explicitly empty HU2 result', async () => {
  request.mockResolvedValue({ idVacante: id, requisitos: [] });
  await expect(getTechnicalVacancyRequirements(id)).resolves.toEqual([]);
});

it('rejects a malformed identifier before sending a request', async () => {
  await expect(getTechnicalVacancyRequirements('invalid')).rejects.toMatchObject({ status: 400 });
  expect(request).not.toHaveBeenCalled();
});

it.each([
  ['an envelope belonging to another API contract', { data: response }],
  ['another vacancy in the response', { ...response, idVacante: otherId }],
  ['a requirement belonging to another vacancy', {
    ...response, requisitos: [{ ...requirement, idVacante: otherId }],
  }],
  ['a HU12 skill instead of a HU2 requirement', {
    ...response, requisitos: [{ name: 'React', level: 'Intermedio' }],
  }],
  ['an unsupported level', { ...response, requisitos: [{ ...requirement, nivel: 'Senior' }] }],
  ['a missing requirement type', { ...response, requisitos: [{ ...requirement, tipo: undefined }] }],
  ['duplicated requirement identifiers', { ...response, requisitos: [requirement, requirement] }],
  ['a missing requirements collection', { idVacante: id }],
  ['an invalid requirement UUID', { ...response, requisitos: [{ ...requirement, id: 'invalid' }] }],
  ['an empty competence', { ...response, requisitos: [{ ...requirement, competencia: ' ' }] }],
  ['an unsupported type', { ...response, requisitos: [{ ...requirement, tipo: 'Opcional' }] }],
  ['a non-text description', { ...response, requisitos: [{ ...requirement, descripcion: {} }] }],
  ['an invalid creation date', { ...response, requisitos: [{ ...requirement, fechaCreacion: 'invalid' }] }],
  ['a null response', null],
])('rejects %s rather than displaying incorrect or substitute data', async (_name, payload) => {
  request.mockResolvedValue(payload);
  await expect(getTechnicalVacancyRequirements(id)).rejects.toMatchObject({ kind: 'invalid-response' });
});

it.each([
  [400, /identificador/],
  [401, /sesión/],
  [403, /permiso/],
  [404, /no está disponible/],
  [429, /demasiadas consultas/],
  [500, /servidor/],
  [503, /servidor/],
] as const)('preserves HTTP %s with a useful message', async (status, message) => {
  request.mockRejectedValue(new ApiClientError('Upstream diagnostic', status));
  await expect(getTechnicalVacancyRequirements(id)).rejects.toMatchObject({
    status, kind: 'http', message: expect.stringMatching(message),
  });
});

it('preserves session expiry reported by the official refresh transport', async () => {
  request.mockRejectedValue(new SessionError(401, 'Session expired'));
  await expect(getTechnicalVacancyRequirements(id)).rejects.toMatchObject({ status: 401 });
});

it('distinguishes a proxy connection failure from an empty result', async () => {
  request.mockRejectedValue(new ApiClientError('Unavailable', 503, 'BACKEND_UNAVAILABLE'));
  await expect(getTechnicalVacancyRequirements(id)).rejects.toMatchObject({ status: 503, kind: 'connection' });
});

it('reports a network failure without falling back to sample requirements', async () => {
  request.mockRejectedValue(new TypeError('Failed to fetch'));
  await expect(getTechnicalVacancyRequirements(id)).rejects.toMatchObject({ kind: 'connection' });
});

it('does not send an already cancelled request', async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(getTechnicalVacancyRequirements(id, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  expect(request).not.toHaveBeenCalled();
});

it('does not accept a response arriving after cancellation', async () => {
  const controller = new AbortController();
  request.mockImplementation(async () => {
    controller.abort();
    return response;
  });
  await expect(getTechnicalVacancyRequirements(id, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
});

it('accepts multiple requirements with all canonical display levels, both types and optional fields', async () => {
  const requirements = [
    requirement,
    {
      id: otherId, idVacante: id, competencia: 'Linux', nivel: 'Básico', tipo: 'Deseable',
    },
    {
      id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', idVacante: id,
      competencia: 'SQL', nivel: 'Intermedio', tipo: 'Obligatorio', descripcion: '',
    },
  ];
  request.mockResolvedValue({ idVacante: id, requisitos: requirements });
  await expect(getTechnicalVacancyRequirements(id)).resolves.toEqual(requirements);
});

it('preserves cancellation when the transport rejects after its caller aborts', async () => {
  const controller = new AbortController();
  request.mockImplementation(async () => {
    controller.abort();
    throw new TypeError('Connection interrupted');
  });
  await expect(getTechnicalVacancyRequirements(id, controller.signal))
    .rejects.toMatchObject({ name: 'AbortError' });
});

describe('HU8 with the official client and session transport (fetch simulated)', () => {
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();

  beforeEach(() => {
    clearAccessToken();
    fetchMock.mockReset();
    global.fetch = fetchMock;
    request.mockImplementation(jest.requireActual<typeof import('./api-client')>('./api-client').apiClient);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    clearAccessToken();
  });

  it('reads the raw HU8 response using the current bearer and preserves cancellation', async () => {
    const controller = new AbortController();
    setAccessToken('hu8-test-token');
    fetchMock.mockResolvedValue({ ok: true, text: async () => JSON.stringify(response) });

    await expect(getTechnicalVacancyRequirements(id, controller.signal)).resolves.toEqual([requirement]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe(`/api/v1/job-postings/${id}/requisitos`);
    expect(options).toMatchObject({
      method: 'GET', credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
    });
    expect(new Headers(options.headers).get('Authorization')).toBe('Bearer hu8-test-token');
  });

  it('preserves access rejection from the official error envelope', async () => {
    setAccessToken('hu8-test-token');
    fetchMock.mockResolvedValue({
      ok: false, status: 403,
      text: async () => JSON.stringify({ error: { code: 'FORBIDDEN', message: 'Access rejected' } }),
    });

    await expect(getTechnicalVacancyRequirements(id)).rejects.toMatchObject({
      status: 403, kind: 'http', message: expect.stringMatching(/permiso/),
    });
  });

  it('rejects a successful HTTP response with no body instead of treating it as no requirements', async () => {
    setAccessToken('hu8-test-token');
    fetchMock.mockResolvedValue({ ok: true, status: 200, text: async () => '' });
    await expect(getTechnicalVacancyRequirements(id)).rejects.toMatchObject({ kind: 'invalid-response' });
  });

  it('sanitizes a server failure from the real transport instead of returning an empty result', async () => {
    setAccessToken('hu8-test-token');
    fetchMock.mockResolvedValue({
      ok: false, status: 500,
      text: async () => JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Private database diagnostic' } }),
    });
    await expect(getTechnicalVacancyRequirements(id)).rejects.toMatchObject({
      status: 500, kind: 'http', message: expect.stringMatching(/servidor/),
    });
  });
});
