import { clearAccessToken, getAccessToken, setAccessToken } from '@/shared/services/auth-session';
import { getMentorSchedule, saveMentorSchedule } from './mentor-schedule-api';

const originalFetch = global.fetch;
const fetchMock = jest.fn();
const weekly = { schedule: [{ weekday: 1, start: '09:00', end: '11:00' }], fecha_actualizacion: '2026-11-14' };

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock;
  setAccessToken('mentor-token');
});

afterEach(() => {
  clearAccessToken();
  global.fetch = originalFetch;
});

it('consulta el horario semanal con el token de la sesión', async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ data: weekly }) });
  expect(await getMentorSchedule()).toEqual(weekly);
  expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/mentorship\/availability\/schedule$/), expect.objectContaining({
    method: 'GET', credentials: 'omit',
    headers: expect.objectContaining({ Authorization: 'Bearer mentor-token' }),
  }));
});

it('guarda el horario completo con PUT', async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ data: { ...weekly, mensaje: 'Horarios guardados' } }) });
  expect(await saveMentorSchedule(weekly.schedule)).toEqual(weekly);
  expect(fetchMock).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
    method: 'PUT', body: JSON.stringify({ schedule: weekly.schedule }),
  }));
});

it('muestra el mensaje del backend cuando rechaza el horario', async () => {
  fetchMock.mockResolvedValue({
    ok: false,
    status: 400,
    json: async () => ({ error: { code: 'HORARIO_SOLAPADO', message: 'El lunes tiene franjas que se solapan (09:00–11:00 y 10:00–12:00)' } }),
  });
  await expect(saveMentorSchedule(weekly.schedule)).rejects.toMatchObject({
    status: 400,
    message: 'El lunes tiene franjas que se solapan (09:00–11:00 y 10:00–12:00)',
  });
});

it('sin sesión no envía peticiones y un 401 limpia el token', async () => {
  clearAccessToken();
  await expect(getMentorSchedule()).rejects.toMatchObject({ status: 401 });
  expect(fetchMock).not.toHaveBeenCalled();

  setAccessToken('mentor-token');
  fetchMock.mockResolvedValue({ ok: false, status: 401 });
  await expect(getMentorSchedule()).rejects.toMatchObject({ status: 401 });
  expect(getAccessToken()).toBeNull();
});

it('rechaza respuestas con formato inválido', async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ data: { schedule: [{ weekday: 9, start: '9', end: 'x' }], fecha_actualizacion: null } }) });
  await expect(getMentorSchedule()).rejects.toThrow('El servidor devolvió un horario con formato inválido.');
});
