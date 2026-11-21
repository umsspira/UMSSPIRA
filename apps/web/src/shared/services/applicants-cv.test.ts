// HU-16 (T16.4): descarga del CV del postulante con la sesión del reclutador.
jest.mock('./auth-session', () => ({ authenticatedFetch: jest.fn() }));

import { authenticatedFetch } from './auth-session';
import {
  buildCvFileName,
  CV_DOWNLOAD_ERROR_MESSAGE,
  CvDownloadError,
  downloadApplicantCv,
} from './applicants';

const fetchMock = authenticatedFetch as unknown as jest.Mock;
const VACANTE = '44500000-0000-4000-8000-000000000001';
const POSTULACION = '44800000-0000-4000-8000-000000000001';

function pdfResponse(size = 4): Response {
  return {
    ok: true,
    status: 200,
    blob: async () => new Blob([new Uint8Array(size)], { type: 'application/pdf' }),
  } as unknown as Response;
}

describe('descarga del CV del postulante (HU-16)', () => {
  const originalCreate = URL.createObjectURL;
  const originalRevoke = URL.revokeObjectURL;
  let clickSpy: jest.SpyInstance;
  let lastLink: HTMLAnchorElement | null = null;

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock.mockReset();
    URL.createObjectURL = jest.fn(() => 'blob:cv');
    URL.revokeObjectURL = jest.fn();
    clickSpy = jest
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        lastLink = this;
      });
  });

  afterEach(() => {
    jest.useRealTimers();
    clickSpy.mockRestore();
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    lastLink = null;
  });

  it('pide el CV al endpoint de la postulación con la sesión del reclutador', async () => {
    fetchMock.mockResolvedValueOnce(pdfResponse());

    await downloadApplicantCv(VACANTE, POSTULACION, 'Ana Rojas');

    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/vacantes/${VACANTE}/postulantes/${POSTULACION}/cv`,
      { method: 'GET' },
    );
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(lastLink?.download).toBe('CV - Ana Rojas.pdf');
    expect(lastLink?.href).toBe('blob:cv');
  });

  it('libera el archivo temporal después de descargar', async () => {
    fetchMock.mockResolvedValueOnce(pdfResponse());

    await downloadApplicantCv(VACANTE, POSTULACION, 'Ana Rojas');
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();

    jest.advanceTimersByTime(10_000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:cv');
  });

  it.each([403, 404, 500])('muestra el error si la API responde %i', async (status) => {
    fetchMock.mockResolvedValueOnce({ ok: false, status } as Response);

    await expect(downloadApplicantCv(VACANTE, POSTULACION, 'Ana Rojas')).rejects.toThrow(
      CV_DOWNLOAD_ERROR_MESSAGE,
    );
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('muestra el error si no hay conexión', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(downloadApplicantCv(VACANTE, POSTULACION, 'Ana Rojas')).rejects.toBeInstanceOf(
      CvDownloadError,
    );
  });

  it('no descarga un archivo vacío', async () => {
    fetchMock.mockResolvedValueOnce(pdfResponse(0));

    await expect(downloadApplicantCv(VACANTE, POSTULACION, 'Ana Rojas')).rejects.toThrow(
      CV_DOWNLOAD_ERROR_MESSAGE,
    );
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it('arma un nombre de archivo válido', () => {
    expect(buildCvFileName('Ana Rojas')).toBe('CV - Ana Rojas.pdf');
    expect(buildCvFileName('  Luis / Pérez: QA ')).toBe('CV - Luis Pérez QA.pdf');
    expect(buildCvFileName('')).toBe('CV - postulante.pdf');
  });
});