import { authenticatedFetch } from '@/shared/services/auth-session';

import { loadProfilePhoto, saveProfilePhoto } from './profile-photo-service';

jest.mock('@/shared/services/auth-session', () => ({
  ...jest.requireActual('@/shared/services/auth-session'),
  authenticatedFetch: jest.fn(),
}));

const fetchMock = authenticatedFetch as jest.MockedFunction<typeof authenticatedFetch>;

function response(status: number, body?: unknown, blob?: Blob): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    blob: async () => blob ?? new Blob(),
  } as unknown as Response;
}

describe('profile-photo-service (HU-16, T16.2)', () => {
  beforeEach(() => fetchMock.mockReset());

  it('guarda la foto en la API con PUT /api/v1/perfil/foto y el campo «foto»', async () => {
    fetchMock.mockResolvedValue(response(204));
    const photo = new Blob(['jpg'], { type: 'image/jpeg' });

    await saveProfilePhoto(photo);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v1/perfil/foto');
    expect(init?.method).toBe('PUT');
    expect((init?.body as FormData).get('foto')).toBeInstanceOf(Blob);
  });

  it('si la API rechaza la foto, se rechaza con su mensaje', async () => {
    fetchMock.mockResolvedValue(response(400, { error: { message: 'La foto debe ser JPG de máximo 5 MB.' } }));

    await expect(saveProfilePhoto(new Blob(['png']))).rejects.toThrow('La foto debe ser JPG de máximo 5 MB.');
  });

  it('lee la foto del titulado desde la API; 404 significa que todavía no tiene', async () => {
    const photo = new Blob(['jpg'], { type: 'image/jpeg' });
    fetchMock.mockResolvedValueOnce(response(200, undefined, photo));
    await expect(loadProfilePhoto()).resolves.toBe(photo);

    fetchMock.mockResolvedValueOnce(response(404));
    await expect(loadProfilePhoto()).resolves.toBeNull();
  });

  it('si la API no responde, no rompe el encabezado (usa la copia local o ninguna)', async () => {
    fetchMock.mockRejectedValue(new Error('sin conexión'));

    await expect(loadProfilePhoto()).resolves.toBeNull();
  });
});
