import { clearAccessToken, getAccessToken, setAccessToken } from '@/shared/services/auth-session';
import { getMentorInterests, saveMentorInterests } from './mentor-interests-api';

const originalFetch = global.fetch;
const fetchMock = jest.fn();
const area = { id: 'area-1', nombre: 'Backend', descripcion: 'Servicios y APIs', seleccionada: true, bloqueada: false };
const otherArea = { id: 'area-2', nombre: 'Frontend', descripcion: '', seleccionada: false, bloqueada: true };
const topics = [{ id: 'rest', nombre: 'REST', area }, { id: 'node', nombre: 'Node.js', area }];
const custom = { id: 'custom-1', nombre: 'Mi tema', area, es_personalizado: true };

beforeEach(() => {
  setAccessToken('access-token');
  fetchMock.mockReset();
  global.fetch = fetchMock;
  fetchMock.mockImplementation(async (url: string, options: RequestInit) => {
    if (url.endsWith('/catalog')) return response([
      { area, intereses: [...topics.map(t => ({ ...t, seleccionado: t.id === 'rest' })), { ...custom, seleccionado: true }] },
      { area: otherArea, intereses: [{ id: 'react', nombre: 'React', area: otherArea, seleccionado: false }] },
    ]);
    if (url.endsWith('/mine')) return response([topics[0], custom]);
    if (options.method === 'PUT') {
      return response({
        areas: [area, otherArea],
        selectedIds: ['area-1'],
        intereses: [{ id: 'rest', id_area: 'area-1', nombre: 'REST', es_personalizado: false },
          { id: 'custom-1', id_area: 'area-1', nombre: 'Mi tema', es_personalizado: true }],
      });
    }
    throw new Error(`Solicitud inesperada: ${options.method} ${url}`);
  });
});
afterEach(clearAccessToken);
afterAll(() => { global.fetch = originalFetch; });

function response(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => status < 400 ? { data: body } : { error: body } };
}

it('mapea todas las áreas raíz con descripción y solo marca las seleccionadas', async () => {
  const state = await getMentorInterests();
  expect(state.catalog).toEqual([
    { id: 'area-1', name: 'Backend', description: 'Servicios y APIs', locked: false, topics: [
      { id: 'rest', name: 'REST' }, { id: 'node', name: 'Node.js' }, { id: 'custom-1', name: 'Mi tema', isCustom: true },
    ] },
    { id: 'area-2', name: 'Frontend', description: '', locked: true, topics: [{ id: 'react', name: 'React' }] },
  ]);
  expect(state.configuration).toEqual({ areaIds: ['area-1'], topicIds: ['rest', 'custom-1'] });
  expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/interests/mine'), expect.objectContaining({
    cache: 'no-store', credentials: 'omit',
    headers: { accept: 'application/json', Authorization: 'Bearer access-token' },
  }));
});

it('no hace solicitudes sin sesión y limpia el token si recibe 401', async () => {
  clearAccessToken();
  await expect(getMentorInterests()).rejects.toThrow('Inicia sesión');
  expect(fetchMock).not.toHaveBeenCalled();
  setAccessToken('expired');
  fetchMock.mockImplementation(async () => response({}, 401));
  await expect(getMentorInterests()).rejects.toThrow('Inicia sesión');
  expect(getAccessToken()).toBeNull();
});

it('rechaza respuestas de catálogo inválidas', async () => {
  fetchMock.mockImplementation(async (url: string) => response(url.endsWith('/mine') ? [] : [
    { area, intereses: [{ id: 'bad', nombre: 'Incorrecto', area: { id: 'other', nombre: 'Otra' } }] },
  ]));
  await expect(getMentorInterests()).rejects.toThrow('no corresponden');
});

it('informa que solo los personalizados faltan cuando no existe su esquema', async () => {
  fetchMock.mockImplementation(async (url: string) => response(url.endsWith('/mine') ? [topics[0]] : [
    { area, intereses: topics, personalizados_disponibles: false },
  ]));
  const state = await getMentorInterests();
  expect(state.customInterestsAvailable).toBe(false);
  expect(state.catalog[0].topics).toHaveLength(2);
});

it('guarda con una sola petición PUT y devuelve el estado confirmado', async () => {
  const result = await saveMentorInterests({ areaIds: ['area-1'], topicIds: ['rest', 'custom-1'] });
  expect(result).toEqual({ areaIds: ['area-1'], topicIds: ['rest', 'custom-1'] });
  const calls = fetchMock.mock.calls.filter(([, options]) => options.method === 'PUT');
  expect(calls).toHaveLength(1);
  expect(calls[0][0]).toMatch(/\/interests$/);
  expect(JSON.parse(String(calls[0][1].body))).toEqual({ areaIds: ['area-1'], topicIds: ['rest', 'custom-1'] });
  expect(fetchMock.mock.calls.filter(([, options]) => options.method === 'GET')).toHaveLength(0);
});

it('rechaza quitar la última área sin llamar al backend', async () => {
  await expect(saveMentorInterests({ areaIds: [], topicIds: [] })).rejects.toThrow('al menos un área');
  expect(fetchMock).not.toHaveBeenCalled();
});

it('rechaza una respuesta de guardado con formato inválido', async () => {
  fetchMock.mockImplementation(async () => response({ areas: [], selectedIds: [], intereses: [{ id: 1 }] }));
  await expect(saveMentorInterests({ areaIds: ['area-1'], topicIds: [] })).rejects.toThrow('formato inválido');
});

it('traduce el 403 del backend a un mensaje de permisos', async () => {
  fetchMock.mockImplementation(async () => response({ message: 'Prohibido' }, 403));
  await expect(saveMentorInterests({ areaIds: ['area-1'], topicIds: ['rest'] }))
    .rejects.toThrow('No tienes permiso para configurar estos intereses.');
});

it('muestra el mensaje del backend cuando el guardado es inválido', async () => {
  fetchMock.mockImplementation(async () => response({ message: 'El área del interés no está asignada a tu perfil' }, 400));
  await expect(saveMentorInterests({ areaIds: ['area-1'], topicIds: ['rest'] }))
    .rejects.toThrow('El área del interés no está asignada a tu perfil');
});
