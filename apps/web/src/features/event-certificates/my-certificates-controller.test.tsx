import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { authStore } from '@/modules/auth/frontend/store';
import {
  CertificateFileError,
  downloadCertificatePdf,
  fetchCertificatePdf,
} from './certificate-file-service';
import { MyCertificatesController } from './my-certificates-controller';
import { useMyCertificates } from './use-my-certificates';

jest.mock('@/modules/auth/frontend/store', () => ({
  authStore: {
    subscribe: jest.fn(),
    getState: jest.fn(),
  },
}));

jest.mock('./use-my-certificates', () => ({
  useMyCertificates: jest.fn(),
}));

jest.mock('./certificate-file-service', () => ({
  ...jest.requireActual('./certificate-file-service'),
  fetchCertificatePdf: jest.fn(),
  downloadCertificatePdf: jest.fn(),
}));

const certificate = {
  id: 'cert-123',
  eventName: 'Congreso de Ingeniería de Sistemas',
  participationDate: '13/11/2026',
};

const endpoint = '/api/v1/events/test-event/certificates/cert-123/pdf';

describe('HU19 - Descarga desde el listado', () => {
  let notifyAuthChange: (() => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    notifyAuthChange = undefined;

    jest.mocked(authStore.subscribe).mockImplementation((listener) => {
      notifyAuthChange = listener;
      return () => {};
    });

    jest.mocked(authStore.getState).mockReturnValue({
      status: 'idle',
    } as ReturnType<typeof authStore.getState>);

    jest.mocked(useMyCertificates).mockReturnValue({
      view: {
        status: 'success',
        certificates: [certificate],
      },
      retry: jest.fn(),
    });
  });

  it('mantiene la descarga deshabilitada sin endpoint configurado', () => {
    render(<MyCertificatesController />);

    expect(
      screen.getByRole('button', { name: 'Descargar' }),
    ).toBeDisabled();

    expect(fetchCertificatePdf).not.toHaveBeenCalled();
  });

  it('descarga el PDF correspondiente al certificado seleccionado', async () => {
    const pdf = new Blob(['%PDF-1.4'], {
      type: 'application/pdf',
    });

    jest.mocked(fetchCertificatePdf).mockResolvedValue(pdf);

    const resolvePdfEndpoint = jest.fn(() => endpoint);

    render(
      <MyCertificatesController
        loadCertificates={jest.fn()}
        resolvePdfEndpoint={resolvePdfEndpoint}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Descargar' }),
    );

    await waitFor(() => {
      expect(downloadCertificatePdf).toHaveBeenCalledWith(
        pdf,
        'cert-123',
      );
    });

    expect(resolvePdfEndpoint).toHaveBeenCalledWith('cert-123');
    expect(fetchCertificatePdf).toHaveBeenCalledWith(
      endpoint,
      expect.any(AbortSignal),
    );
  });

  it('bloquea el listado después de recibir un error 403', async () => {
    jest.mocked(fetchCertificatePdf).mockRejectedValue(
      new CertificateFileError(403, 'Acceso denegado'),
    );

    render(
      <MyCertificatesController
        loadCertificates={jest.fn()}
        resolvePdfEndpoint={() => endpoint}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Descargar' }),
    );

    await waitFor(() => {
      expect(
        screen.getByRole('alert'),
      ).toHaveTextContent('Acceso restringido');
    });

    expect(
      screen.queryByText('Congreso de Ingeniería de Sistemas'),
    ).not.toBeInTheDocument();

    expect(downloadCertificatePdf).not.toHaveBeenCalled();
  });

  it('muestra un error cuando falla la descarga', async () => {
    jest.mocked(fetchCertificatePdf).mockRejectedValue(
      new Error('Error de conexión'),
    );

    render(
      <MyCertificatesController
        loadCertificates={jest.fn()}
        resolvePdfEndpoint={() => endpoint}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Descargar' }),
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(
        'No se pudo descargar el certificado',
      );
    });

    expect(downloadCertificatePdf).not.toHaveBeenCalled();
  });

  it('cancela la descarga al cerrar sesión', async () => {
    let downloadSignal: AbortSignal | undefined;

    jest.mocked(fetchCertificatePdf).mockImplementation(
      async (_url, signal) => {
        downloadSignal = signal;
        return new Promise<Blob>(() => {});
      },
    );

    render(
      <MyCertificatesController
        loadCertificates={jest.fn()}
        resolvePdfEndpoint={() => endpoint}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Descargar' }),
    );

    await waitFor(() => {
      expect(fetchCertificatePdf).toHaveBeenCalledTimes(1);
    });

    expect(downloadSignal?.aborted).toBe(false);

    act(() => {
      notifyAuthChange?.();
    });

    expect(downloadSignal?.aborted).toBe(true);
    expect(
      screen.getByText('Debes iniciar sesión'),
    ).toBeInTheDocument();

    expect(downloadCertificatePdf).not.toHaveBeenCalled();
  });
  it('no descarga un PDF que llega después del cierre de sesión', async () => {
    let resolvePdf: ((pdf: Blob) => void) | undefined;

    const pendingPdf = new Promise<Blob>((resolve) => {
      resolvePdf = resolve;
    });

    jest.mocked(fetchCertificatePdf).mockReturnValue(pendingPdf);

    render(
      <MyCertificatesController
        loadCertificates={jest.fn()}
        resolvePdfEndpoint={() => endpoint}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Descargar' }),
    );

    await waitFor(() => {
      expect(fetchCertificatePdf).toHaveBeenCalledTimes(1);
    });

    const signal = jest.mocked(fetchCertificatePdf).mock.calls[0][1];

    act(() => {
      notifyAuthChange?.();
    });

    expect(signal?.aborted).toBe(true);

    await act(async () => {
      resolvePdf?.(
        new Blob(['%PDF-1.4'], {
          type: 'application/pdf',
        }),
      );
      await pendingPdf;
    });

    expect(downloadCertificatePdf).not.toHaveBeenCalled();

    expect(
      screen.getByText('Debes iniciar sesión'),
    ).toBeInTheDocument();
  });
});

