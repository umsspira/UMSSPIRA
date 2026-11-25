import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { authStore } from '@/modules/auth/frontend/store';
import { CertificateFileError } from './certificate-file-service';
import {
  CertificateDetailController,
  type CertificateDetailLoader,
} from './certificate-detail-controller';

jest.mock('@/modules/auth/frontend/store', () => ({
  authStore: {
    subscribe: jest.fn(),
    getState: jest.fn(),
  },
}));

jest.mock('./certificate-detail-page', () => ({
  CertificateDetailPage: ({
    state,
    document,
    onRetry,
  }: {
    state: string;
    document?: { id: string; eventName: string; pdf: Blob };
    onRetry?: () => void;
  }) => (
    <div>
      <span data-testid="detail-state">{state}</span>
      {document && (
        <div data-testid="certificate-document">
          {document.id} - {document.eventName}
        </div>
      )}
      {onRetry && (
        <button type="button" onClick={onRetry}>
          Reintentar consulta
        </button>
      )}
    </div>
  ),
}));

const makeDocument = (id = 'cert-123') => ({
  id,
  eventName: 'Congreso de Ingeniería de Sistemas',
  participationDate: '13/11/2026',
  pdf: new Blob(['%PDF-1.4'], {
    type: 'application/pdf',
  }),
});

describe('HU19 - Controlador del detalle', () => {
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
  });

  it('no consulta sin un servicio configurado', () => {
    render(
      <CertificateDetailController certificateId="cert-123" />,
    );

    expect(screen.getByTestId('detail-state'))
      .toHaveTextContent('unavailable');
  });

  it('muestra el documento del certificado solicitado', async () => {
    const loader = jest.fn<ReturnType<CertificateDetailLoader>,
      Parameters<CertificateDetailLoader>>()
      .mockResolvedValue(makeDocument());

    render(
      <CertificateDetailController
        certificateId="cert-123"
        loadCertificate={loader}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('detail-state'))
        .toHaveTextContent('available');
    });

    expect(loader).toHaveBeenCalledWith(
      'cert-123',
      expect.any(AbortSignal),
    );

    expect(screen.getByTestId('certificate-document'))
      .toHaveTextContent('cert-123');
  });

  it('rechaza un documento con identificador diferente', async () => {
    const loader = jest.fn().mockResolvedValue(
      makeDocument('cert-ajeno'),
    );

    render(
      <CertificateDetailController
        certificateId="cert-123"
        loadCertificate={loader}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('detail-state'))
        .toHaveTextContent('error');
    });

    expect(screen.queryByTestId('certificate-document'))
      .not.toBeInTheDocument();
  });

  it.each([
    [401, 'unauthenticated'],
    [403, 'forbidden'],
    [404, 'unavailable'],
    [503, 'error'],
  ])('traduce HTTP %i al estado %s', async (status, expected) => {
    const loader = jest.fn().mockRejectedValue(
      new CertificateFileError(status, 'Error HTTP'),
    );

    render(
      <CertificateDetailController
        certificateId="cert-123"
        loadCertificate={loader}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('detail-state'))
        .toHaveTextContent(expected);
    });

    expect(screen.queryByTestId('certificate-document'))
      .not.toBeInTheDocument();
  });

  it('permite reintentar después de un error temporal', async () => {
    const loader = jest.fn()
      .mockRejectedValueOnce(new Error('Sin conexión'))
      .mockResolvedValueOnce(makeDocument());

    render(
      <CertificateDetailController
        certificateId="cert-123"
        loadCertificate={loader}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('detail-state'))
        .toHaveTextContent('error');
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'Reintentar consulta' }),
    );

    await waitFor(() => {
      expect(screen.getByTestId('detail-state'))
        .toHaveTextContent('available');
    });

    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('cancela la consulta y oculta el PDF al cerrar sesión', async () => {
    let resolveDocument:
      | ((value: ReturnType<typeof makeDocument>) => void)
      | undefined;

    const pending = new Promise<ReturnType<typeof makeDocument>>(
      (resolve) => {
        resolveDocument = resolve;
      },
    );

    const loader = jest.fn().mockReturnValue(pending);

    render(
      <CertificateDetailController
        certificateId="cert-123"
        loadCertificate={loader}
      />,
    );

    await waitFor(() => {
      expect(loader).toHaveBeenCalledTimes(1);
    });

    const signal = loader.mock.calls[0][1] as AbortSignal;

    act(() => {
      notifyAuthChange?.();
    });

    expect(signal.aborted).toBe(true);

    await act(async () => {
      resolveDocument?.(makeDocument());
      await pending;
    });

    expect(screen.getByTestId('detail-state'))
      .toHaveTextContent('unauthenticated');

    expect(screen.queryByTestId('certificate-document'))
      .not.toBeInTheDocument();
  });

  it('cancela la solicitud al abandonar el detalle', () => {
    const loader = jest.fn().mockImplementation(
      () => new Promise(() => {}),
    );

    const { unmount } = render(
      <CertificateDetailController
        certificateId="cert-123"
        loadCertificate={loader}
      />,
    );

    const signal = loader.mock.calls[0][1] as AbortSignal;

    expect(signal.aborted).toBe(false);

    unmount();

    expect(signal.aborted).toBe(true);
  });
  it('no muestra el PDF anterior al cambiar de certificado', async () => {
    let resolveSecond:
      | ((value: ReturnType<typeof makeDocument>) => void)
      | undefined;

    const secondRequest = new Promise<ReturnType<typeof makeDocument>>(
      (resolve) => {
        resolveSecond = resolve;
      },
    );

    const loader = jest.fn().mockImplementation((id: string) =>
      id === 'cert-123'
        ? Promise.resolve(makeDocument('cert-123'))
        : secondRequest,
    );

    const { rerender } = render(
      <CertificateDetailController
        certificateId="cert-123"
        loadCertificate={loader}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('certificate-document'))
        .toHaveTextContent('cert-123');
    });

    rerender(
      <CertificateDetailController
        certificateId="cert-456"
        loadCertificate={loader}
      />,
    );

    expect(
      screen.queryByTestId('certificate-document'),
    ).not.toBeInTheDocument();

    expect(screen.getByTestId('detail-state'))
      .toHaveTextContent('loading');

    await act(async () => {
      resolveSecond?.(makeDocument('cert-456'));
      await secondRequest;
    });

    await waitFor(() => {
      expect(screen.getByTestId('certificate-document'))
        .toHaveTextContent('cert-456');
    });

    expect(loader).toHaveBeenCalledTimes(2);
  });
});
