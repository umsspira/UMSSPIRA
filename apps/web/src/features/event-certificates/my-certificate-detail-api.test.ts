
import { loadMyCertificateDetail } from './my-certificate-detail-api';
import { CertificateFileError, fetchCertificatePdf } from './certificate-file-service';
import { loadMyCertificates } from './my-certificates-api';

jest.mock('./my-certificates-api', () => ({
  loadMyCertificates: jest.fn(),
  resolveMyCertificatePdfEndpoint: (id: string) =>
    `/api/v1/certificates/me/${id}/download`,
}));

jest.mock('./certificate-file-service', () => {
  const actual = jest.requireActual('./certificate-file-service');
  return {
    ...actual,
    fetchCertificatePdf: jest.fn(),
  };
});

const mockedList = loadMyCertificates as jest.MockedFunction<
  typeof loadMyCertificates
>;

const mockedPdf = fetchCertificatePdf as jest.MockedFunction<
  typeof fetchCertificatePdf
>;

const certificateId = 'a762c781-1f02-4e34-bc86-339c8e621bbc';

const certificate = {
  id: certificateId,
  eventName: 'Congreso de Sistemas',
  participationDate: '2026-11-18T10:00:00.000Z',
};

describe('loadMyCertificateDetail - HU19', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('obtiene el certificado propio y su PDF', async () => {
    const pdf = new Blob(['%PDF-1.4'], {
      type: 'application/pdf',
    });
    const signal = new AbortController().signal;

    mockedList.mockResolvedValue([certificate]);
    mockedPdf.mockResolvedValue(pdf);

    const result = await loadMyCertificateDetail(
      certificateId,
      signal,
    );

    expect(mockedList).toHaveBeenCalledWith(signal);
    expect(mockedPdf).toHaveBeenCalledWith(
      `/api/v1/certificates/me/${certificateId}/download`,
      signal,
    );

    expect(result).toEqual({
      ...certificate,
      pdf,
    });
  });

  it('rechaza certificados que no aparecen en el listado del usuario', async () => {
    mockedList.mockResolvedValue([]);

    await expect(
      loadMyCertificateDetail(
        certificateId,
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({
      status: 404,
    });

    expect(mockedPdf).not.toHaveBeenCalled();
  });

  it('propaga los errores de autorización del PDF', async () => {
    mockedList.mockResolvedValue([certificate]);
    mockedPdf.mockRejectedValue(
      new CertificateFileError(403, 'Acceso denegado'),
    );

    await expect(
      loadMyCertificateDetail(
        certificateId,
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({
      status: 403,
    });
  });

  it('no descarga otro certificado aunque exista en el listado', async () => {
    mockedList.mockResolvedValue([certificate]);

    await expect(
      loadMyCertificateDetail(
        '11111111-1111-4111-8111-111111111111',
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({
      status: 404,
    });

    expect(mockedPdf).not.toHaveBeenCalled();
  });
});
