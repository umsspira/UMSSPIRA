import {
  getTechnicalVacancyRequirements,
  TechnicalRequirementsError,
} from './technical-requirements';

const vacancyId = 'cdd89b13-bd3f-45c1-a020-91ca5f3747a5';
const requirement = {
  id: 'requirement-1',
  idVacante: vacancyId,
  competencia: 'SQL',
  nivel: 'Avanzado',
  tipo: 'Obligatorio',
  descripcion: null,
};
const originalFetch = global.fetch;
const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
const fetchMock = jest.fn();

function respond(body: unknown, status = 200) {
  fetchMock.mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
  });
}

function pendingRequest() {
  fetchMock.mockImplementation((_url: string, init: RequestInit) =>
    new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => {
        reject(new DOMException('Consulta cancelada', 'AbortError'));
      }, { once: true });
    }));
}

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_API_URL;
  fetchMock.mockReset();
  global.fetch = fetchMock;
});

afterEach(() => {
  global.fetch = originalFetch;
  if (originalApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
  else process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
  jest.useRealTimers();
});

it('consulta el endpoint oficial en el puerto 3000 y acepta descripción nula y fecha ausente', async () => {
  respond({ idVacante: vacancyId, requisitos: [requirement] });

  await expect(getTechnicalVacancyRequirements(` ${vacancyId} `)).resolves.toEqual([requirement]);
  expect(fetchMock).toHaveBeenCalledWith(
    `http://localhost:3000/job-postings/${vacancyId}/requisitos`,
    expect.objectContaining({ cache: 'no-store', signal: expect.any(AbortSignal) }),
  );
});

it('respeta la URL configurada, normaliza sus barras y codifica el ID', async () => {
  process.env.NEXT_PUBLIC_API_URL = ' http://localhost:4000/// ';
  const id = 'vacante/otra?x=1';
  respond({ idVacante: id, requisitos: [] });

  await expect(getTechnicalVacancyRequirements(id)).resolves.toEqual([]);
  expect(fetchMock.mock.calls[0][0]).toBe(
    'http://localhost:4000/job-postings/vacante%2Fotra%3Fx%3D1/requisitos',
  );
});

it('acepta una respuesta vacía válida', async () => {
  respond({ idVacante: vacancyId, requisitos: [] });
  await expect(getTechnicalVacancyRequirements(vacancyId)).resolves.toEqual([]);
});

it.each([
  [],
  { idVacante: vacancyId },
  { idVacante: vacancyId, requisitos: null },
  { idVacante: 'otra-vacante', requisitos: [] },
  { idVacante: vacancyId, requisitos: [{ ...requirement, idVacante: 'otra-vacante' }] },
  { idVacante: vacancyId, requisitos: [{ ...requirement, competencia: '' }] },
  { idVacante: vacancyId, requisitos: [{ ...requirement, nivel: null }] },
])('rechaza respuestas incompatibles o de otra vacante: %j', async (body) => {
  respond(body);
  await expect(getTechnicalVacancyRequirements(vacancyId)).rejects.toThrow(/verificar/);
});

it('distingue JSON inválido de un error de conexión', async () => {
  fetchMock.mockResolvedValue({ ok: true, json: jest.fn().mockRejectedValue(new SyntaxError()) });
  await expect(getTechnicalVacancyRequirements(vacancyId)).rejects.toThrow(/respuesta no válida/);
});

it.each([
  [400, /identificador/],
  [401, /permiso/],
  [403, /permiso/],
  [404, /No se pudo confirmar si la vacante existe/],
  [429, /demasiadas consultas/],
  [500, /servidor no pudo consultar/],
  [503, /Supabase/],
] as const)('conserva el estado HTTP %s y un mensaje adecuado', async (status, message) => {
  respond({ message: 'Mensaje interno del backend' }, status);
  await expect(getTechnicalVacancyRequirements(vacancyId)).rejects.toMatchObject({
    name: 'TechnicalRequirementsError', status, message: expect.stringMatching(message),
  });
});

it('informa de errores de red sin devolver requisitos vacíos', async () => {
  fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
  await expect(getTechnicalVacancyRequirements(vacancyId)).rejects.toThrow(/conectar con el servidor/);
});

it('cancela una consulta al superar el tiempo de espera', async () => {
  jest.useFakeTimers();
  pendingRequest();
  const result = getTechnicalVacancyRequirements(vacancyId);
  const assertion = expect(result).rejects.toThrow(/tiempo de espera/);
  await jest.advanceTimersByTimeAsync(15_000);
  await assertion;
  expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
  expect(jest.getTimerCount()).toBe(0);
});

it('propaga la cancelación de la pantalla y limpia el temporizador', async () => {
  jest.useFakeTimers();
  pendingRequest();
  const controller = new AbortController();
  const result = getTechnicalVacancyRequirements(vacancyId, controller.signal);
  const assertion = expect(result).rejects.toMatchObject({ name: 'AbortError' });
  controller.abort();
  await assertion;
  expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true);
  expect(jest.getTimerCount()).toBe(0);
});

it('no inicia consultas vacías ni previamente canceladas', async () => {
  await expect(getTechnicalVacancyRequirements(' ')).rejects.toBeInstanceOf(TechnicalRequirementsError);
  const controller = new AbortController();
  controller.abort();
  await expect(getTechnicalVacancyRequirements(vacancyId, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  expect(fetchMock).not.toHaveBeenCalled();
});
