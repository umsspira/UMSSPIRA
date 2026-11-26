import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CvSection } from './cv-section';
import { CvUploadError, getMyCvUrl, loadCv, uploadCv } from './cv-service';
import { EMPRESA_NO_VE, EMPRESA_VE } from './que-datos-ve-empresa-modal';

jest.mock('./cv-service', () => {
  class CvUploadError extends Error {
    constructor(public status: number, public code: string | null = null) { super('error'); }
  }
  return {
    CvUploadError,
    NO_CV: { hasFile: false, name: null, sizeBytes: null, uploadedAt: null },
    loadCv: jest.fn(),
    uploadCv: jest.fn(),
    getMyCvUrl: jest.fn(),
  };
});

const mockedLoad = loadCv as jest.Mock;
const mockedUpload = uploadCv as jest.Mock;
const mockedGetUrl = getMyCvUrl as jest.Mock;
const EMPTY = { hasFile: false, name: null, sizeBytes: null, uploadedAt: null };
const WITH_CV = { hasFile: true, name: 'mi-cv.pdf', sizeBytes: 2048, uploadedAt: '2026-11-16T10:00:00Z' };

function pick(file: File) {
  fireEvent.change(screen.getByTestId('cv-file-input'), { target: { files: [file] } });
}

const pdf = () => new File(['x'], 'cv.pdf', { type: 'application/pdf' });

describe('CvSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedLoad.mockResolvedValue(EMPTY);
  });

  it('muestra «Subir CV», el formato y el aviso de privacidad (CA-01, CA-02)', async () => {
    render(<CvSection />);
    expect(await screen.findByRole('button', { name: 'Subir CV' })).toBeTruthy();
    expect(screen.getByText('Formato PDF, hasta 4 MB')).toBeTruthy();
    expect(screen.getByText('Tu CV solo lo verán las empresas de las vacantes a las que postules')).toBeTruthy();
  });

  it('rechaza un archivo que no es PDF y no lo sube (CA-03)', async () => {
    render(<CvSection />);
    pick(new File(['x'], 'cv.txt', { type: 'text/plain' }));
    expect(await screen.findByText('El CV debe ser un archivo PDF')).toBeTruthy();
    expect(mockedUpload).not.toHaveBeenCalled();
  });

  it('rechaza un PDF de más de 4 MB y no lo sube (CA-04)', async () => {
    render(<CvSection />);
    const big = pdf();
    Object.defineProperty(big, 'size', { value: 6 * 1024 * 1024 });
    pick(big);
    expect(await screen.findByText('El archivo supera el tamaño máximo de 4 MB')).toBeTruthy();
    expect(mockedUpload).not.toHaveBeenCalled();
  });

  it('muestra el texto del CA-04 si la API responde 413', async () => {
    mockedUpload.mockRejectedValueOnce(new CvUploadError(413, 'PAYLOAD_TOO_LARGE'));
    render(<CvSection />);
    pick(pdf());
    expect(await screen.findByText('El archivo supera el tamaño máximo de 4 MB')).toBeTruthy();
  });

  it('muestra el texto del CA-03 si la API rechaza el contenido con INVALID_CV_TYPE', async () => {
    mockedUpload.mockRejectedValueOnce(new CvUploadError(400, 'INVALID_CV_TYPE'));
    render(<CvSection />);
    pick(pdf());
    expect(await screen.findByText('El CV debe ser un archivo PDF')).toBeTruthy();
  });

  it('muestra el texto del CA-04 si la API responde CV_TOO_LARGE', async () => {
    mockedUpload.mockRejectedValueOnce(new CvUploadError(400, 'CV_TOO_LARGE'));
    render(<CvSection />);
    pick(pdf());
    expect(await screen.findByText('El archivo supera el tamaño máximo de 4 MB')).toBeTruthy();
  });

  it('muestra un mensaje genérico ante otros errores de la API', async () => {
    mockedUpload.mockRejectedValueOnce(new CvUploadError(500, 'INTERNAL_ERROR'));
    render(<CvSection />);
    pick(pdf());
    expect(await screen.findByText('No se pudo subir el CV. Inténtalo nuevamente.')).toBeTruthy();
  });

  it('sube un PDF válido, muestra el éxito, el nombre, la fecha y «Reemplazar CV» (CA-05, CA-06)', async () => {
    mockedUpload.mockResolvedValueOnce(undefined);
    mockedLoad.mockResolvedValueOnce(EMPTY).mockResolvedValueOnce(WITH_CV);
    render(<CvSection />);
    pick(new File(['x'], 'mi-cv.pdf', { type: 'application/pdf' }));
    expect(await screen.findByText('Tu CV se subió correctamente')).toBeTruthy();
    expect(await screen.findByText('mi-cv.pdf')).toBeTruthy();
    expect(screen.getByText(/Subido el 16\/11\/2026/)).toBeTruthy();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Reemplazar CV' })).toBeTruthy());
  });

  it('«Ver CV» abre el CV propio en otra pestaña', async () => {
    mockedLoad.mockResolvedValue(WITH_CV);
    mockedGetUrl.mockResolvedValueOnce('blob:cv');
    const tab = { location: { href: '' }, close: jest.fn() };
    const open = jest.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
    render(<CvSection />);
    fireEvent.click(await screen.findByRole('button', { name: 'Ver CV' }));
    await waitFor(() => expect(tab.location.href).toBe('blob:cv'));
    expect(open).toHaveBeenCalledWith('', '_blank');
    open.mockRestore();
  });

  it('si «Ver CV» falla, cierra la pestaña y muestra el error', async () => {
    mockedLoad.mockResolvedValue(WITH_CV);
    mockedGetUrl.mockRejectedValueOnce(new Error('falla'));
    const tab = { location: { href: '' }, close: jest.fn() };
    const open = jest.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
    render(<CvSection />);
    fireEvent.click(await screen.findByRole('button', { name: 'Ver CV' }));
    expect(await screen.findByText('No se pudo abrir el CV. Inténtalo nuevamente.')).toBeTruthy();
    expect(tab.close).toHaveBeenCalled();
    open.mockRestore();
  });

  it('abre la ventana «¿Qué datos ve la empresa?» con las listas de la política y se cierra con «Entendido» (CA-13)', async () => {
    render(<CvSection />);
    fireEvent.click(await screen.findByRole('button', { name: '¿Qué datos ve la empresa?' }));
    expect(screen.getByRole('dialog', { name: '¿Qué datos ve la empresa?' })).toBeTruthy();
    expect(screen.getByText('La empresa ve')).toBeTruthy();
    expect(screen.getByText('La empresa no ve')).toBeTruthy();
    for (const item of [...EMPRESA_VE, ...EMPRESA_NO_VE]) {
      expect(screen.getByText(item)).toBeTruthy();
    }
    fireEvent.click(screen.getByRole('button', { name: 'Entendido' }));
    expect(screen.queryByText('La empresa ve')).toBeNull();
  });

  it('la ventana también se cierra con Escape', async () => {
    render(<CvSection />);
    fireEvent.click(await screen.findByRole('button', { name: '¿Qué datos ve la empresa?' }));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText('La empresa ve')).toBeNull();
  });
});
