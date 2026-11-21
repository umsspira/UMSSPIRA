import { authenticatedFetch } from '@/shared/services/auth-session';
import { cancelMyRequest, listMyRequests, MyRequestsError } from './my-requests-api';

jest.mock('@/shared/services/auth-session', () => ({
  authenticatedFetch: jest.fn(),
  ensureAccessToken: jest.fn(async () => 'test-token'),
  getAccessToken: jest.fn(() => 'test-token'),
  clearAccessToken: jest.fn(),
  SessionError: class SessionError extends Error {
    constructor(public readonly status: number, message: string) {
      super(message);
    }
  },
}));

const apiRequest = {
  id: 'request-1',
  mentor: { id: 'mentor-1', nombre: 'Ana Quispe', cargo: 'Data Scientist', empresa: 'Acme' },
  fecha: '2026-11-23',
  hora_inicio: '09:00',
  hora_fin: '10:00',
  mensaje: 'Motivo',
  estado: 'PENDIENTE' as const,
  fecha_creacion: '2026-11-16',
  fecha_respuesta: null,
  fecha_actualizacion: '2026-11-16',
};

const counts = { TODAS: 1, PENDIENTE: 1, ACEPTADO: 0, RECHAZADO: 0, CANCELADO: 0 };

beforeEach(() => jest.clearAllMocks());

it('lee el historial propio con filtro, página y conteos', async () => {
  (authenticatedFetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({
      data: [apiRequest],
      pagination: { page: 2, pageSize: 10, total: 11, totalPages: 2 },
      counts,
    }),
  });

  const result = await listMyRequests({ status: 'PENDIENTE', page: 2, pageSize: 10 });

  expect(authenticatedFetch).toHaveBeenCalledWith(
    '/api/v1/mentorship/my-requests?page=2&pageSize=10&estado=PENDIENTE',
    expect.objectContaining({ method: 'GET' }),
  );
  expect(result).toEqual({
    items: [apiRequest],
    page: 2,
    pageSize: 10,
    total: 11,
    totalPages: 2,
    counts,
  });
});

it('omite el estado cuando se piden todas las solicitudes', async () => {
  (authenticatedFetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ data: [], pagination: { total: 0 }, counts }),
  });

  const result = await listMyRequests();

  expect(authenticatedFetch).toHaveBeenCalledWith(
    '/api/v1/mentorship/my-requests?page=1&pageSize=20',
    expect.objectContaining({ method: 'GET' }),
  );
  expect(result.items).toEqual([]);
  expect(result.counts.TODAS).toBe(1);
});

it('envía PATCH de cancelación y devuelve la solicitud actualizada', async () => {
  (authenticatedFetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ data: { ...apiRequest, estado: 'CANCELADO' } }),
  });

  const result = await cancelMyRequest('request-1');

  expect(authenticatedFetch).toHaveBeenCalledWith(
    '/api/v1/mentorship/my-requests/request-1/cancel',
    expect.objectContaining({ method: 'PATCH' }),
  );
  expect(result.estado).toBe('CANCELADO');
});

it('preserva SOLICITUD_NO_PENDIENTE para refrescar el estado en pantalla', async () => {
  (authenticatedFetch as jest.Mock).mockResolvedValue({
    ok: false,
    status: 409,
    json: async () => ({
      error: { code: 'SOLICITUD_NO_PENDIENTE', message: 'Esta solicitud ya no está pendiente' },
    }),
  });

  await expect(cancelMyRequest('request-1')).rejects.toMatchObject({
    status: 409,
    code: 'SOLICITUD_NO_PENDIENTE',
  } satisfies Partial<MyRequestsError>);
});

it('preserva SOLICITUD_NO_ENCONTRADA para solicitudes ajenas', async () => {
  (authenticatedFetch as jest.Mock).mockResolvedValue({
    ok: false,
    status: 404,
    json: async () => ({
      error: { code: 'SOLICITUD_NO_ENCONTRADA', message: 'La solicitud no existe o no te pertenece' },
    }),
  });

  await expect(cancelMyRequest('request-1')).rejects.toMatchObject({
    status: 404,
    code: 'SOLICITUD_NO_ENCONTRADA',
  } satisfies Partial<MyRequestsError>);
});
