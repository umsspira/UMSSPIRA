import {
  CertificateFileError,
  fetchCertificatePdf,
} from './certificate-file-service';
import { authenticatedFetch } from '@/shared/services/auth-session';

jest.mock('@/shared/services/auth-session', () => ({
  authenticatedFetch: jest.fn(),
}));

jest.mock('@/shared/services/api-contract', () => ({
  apiUrl: (path: string) => path,
}));

const mockedFetch = authenticatedFetch as jest.MockedFunction<
  typeof authenticatedFetch
>;

const endpoint = '/api/v1/events/certificates/test-id/file';

function makeResponse(
  status: number,
  contentType = 'application/pdf',
  bytes: number[] = [37, 80, 68, 70, 45, 49, 46, 52],
): Response {
  const blob = {
    size: bytes.length,
    type: contentType,
    slice: () => ({
      arrayBuffer: async () => new Uint8Array(bytes.slice(0, 5)).buffer,
    }),
  } as unknown as Blob;

  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'content-type' ? contentType : null,
    },
    blob: jest.fn().mockResolvedValue(blob),
  } as unknown as Response;
}

describe('HU19 - Consulta segura de certificados PDF', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('recupera un PDF válido mediante autenticación', async () => {
    mockedFetch.mockResolvedValue(makeResponse(200));

    const pdf = await fetchCertificatePdf(endpoint);

    expect(pdf.size).toBeGreaterThan(0);
    expect(mockedFetch).toHaveBeenCalledWith(
      endpoint,
      expect.objectContaining({
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/pdf' },
      }),
    );
  });

  it.each([401, 403, 404, 503])(
    'rechaza correctamente HTTP %i',
    async (status) => {
      mockedFetch.mockResolvedValue(makeResponse(status));

      await expect(fetchCertificatePdf(endpoint)).rejects.toMatchObject({
        status,
      });
    },
  );

  it('rechaza respuestas que no son PDF', async () => {
    mockedFetch.mockResolvedValue(
      makeResponse(200, 'application/json'),
    );

    await expect(fetchCertificatePdf(endpoint)).rejects.toBeInstanceOf(
      CertificateFileError,
    );
  });

  it('rechaza archivos vacíos', async () => {
    mockedFetch.mockResolvedValue(makeResponse(200, 'application/pdf', []));

    await expect(fetchCertificatePdf(endpoint)).rejects.toMatchObject({
      status: 502,
    });
  });

  it('rechaza archivos con firma incorrecta', async () => {
    mockedFetch.mockResolvedValue(
      makeResponse(200, 'application/pdf', [78, 79, 84, 80, 68]),
    );

    await expect(fetchCertificatePdf(endpoint)).rejects.toMatchObject({
      status: 502,
    });
  });

  it('rechaza URL externas', async () => {
    await expect(
      fetchCertificatePdf('https://otro-servidor.com/archivo.pdf'),
    ).rejects.toThrow('Ruta de certificado no válida');

    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it('rechaza rutas con navegación de directorios', async () => {
    await expect(
      fetchCertificatePdf('/api/v1/events/../documentos/archivo.pdf'),
    ).rejects.toThrow('Ruta de certificado no válida');

    expect(mockedFetch).not.toHaveBeenCalled();
  });
});
