import { authenticatedFetch } from '@/shared/services/auth-session';
import { CvUploadError, NO_CV, getMyCvUrl, loadCv, mapCv, uploadCv } from './cv-service';

jest.mock('@/shared/services/auth-session', () => ({ authenticatedFetch: jest.fn() }));

const mockedFetch = authenticatedFetch as jest.Mock;

function response(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue(body),
    blob: jest.fn().mockResolvedValue(new Blob(['%PDF-'], { type: 'application/pdf' })),
  };
}

describe('cv-service (HU-16 T16.3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('mapCv lee el bloque cv de GET /perfil', () => {
    expect(
      mapCv({ data: { cv: { tieneArchivo: true, nombre: 'cv.pdf', tamanio: 2048, fechaSubida: '2026-11-20T12:00:00Z' } } }),
    ).toEqual({ hasFile: true, name: 'cv.pdf', sizeBytes: 2048, uploadedAt: '2026-11-20T12:00:00Z' });
  });

  it('mapCv devuelve NO_CV si no hay archivo o el cuerpo no trae el bloque', () => {
    expect(mapCv({ data: { cv: { tieneArchivo: false } } })).toEqual(NO_CV);
    expect(mapCv({ data: {} })).toEqual(NO_CV);
    expect(mapCv(null)).toEqual(NO_CV);
  });

  it('loadCv pide GET /api/v1/perfil y falla si la respuesta no es correcta', async () => {
    mockedFetch.mockResolvedValueOnce(response(200, { data: { cv: { tieneArchivo: false } } }));
    await expect(loadCv()).resolves.toEqual(NO_CV);
    expect(mockedFetch).toHaveBeenCalledWith('/api/v1/perfil', { cache: 'no-store' });

    mockedFetch.mockResolvedValueOnce(response(500, {}));
    await expect(loadCv()).rejects.toThrow('No se pudo cargar el CV.');
  });

  it('uploadCv envía el PDF en el campo «archivo» con PUT', async () => {
    mockedFetch.mockResolvedValueOnce(response(200, { data: {} }));
    const file = new File(['%PDF-'], 'cv.pdf', { type: 'application/pdf' });
    await uploadCv(file);
    const [url, init] = mockedFetch.mock.calls[0];
    expect(url).toBe('/api/v1/perfil/cv');
    expect(init.method).toBe('PUT');
    expect((init.body as FormData).get('archivo')).toBe(file);
  });

  it('uploadCv lanza CvUploadError con el estado y el código de la API', async () => {
    mockedFetch.mockResolvedValueOnce(
      response(400, { error: { code: 'INVALID_CV_TYPE', message: 'El CV debe ser un archivo PDF' } }),
    );
    const error = await uploadCv(new File(['x'], 'cv.pdf')).catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(CvUploadError);
    expect(error).toMatchObject({ status: 400, code: 'INVALID_CV_TYPE' });
  });

  it('uploadCv deja el código en null si el cuerpo del error no es JSON', async () => {
    const bad = response(413, {});
    bad.json.mockRejectedValueOnce(new Error('no json'));
    mockedFetch.mockResolvedValueOnce(bad);
    await expect(uploadCv(new File(['x'], 'cv.pdf'))).rejects.toMatchObject({ status: 413, code: null });
  });

  it('getMyCvUrl pide GET /api/v1/perfil/cv y devuelve una URL local', async () => {
    const createObjectURL = jest.fn().mockReturnValue('blob:cv');
    Object.defineProperty(URL, 'createObjectURL', { value: createObjectURL, configurable: true });
    mockedFetch.mockResolvedValueOnce(response(200, {}));
    await expect(getMyCvUrl()).resolves.toBe('blob:cv');
    expect(mockedFetch).toHaveBeenCalledWith('/api/v1/perfil/cv', { cache: 'no-store' });

    mockedFetch.mockResolvedValueOnce(response(404, {}));
    await expect(getMyCvUrl()).rejects.toThrow('No se pudo abrir el CV.');
  });
});
