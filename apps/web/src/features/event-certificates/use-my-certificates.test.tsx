import { act, renderHook, waitFor } from '@testing-library/react';
import { authStore } from '@/modules/auth/frontend/store';
import {
  useMyCertificates,
  type CertificateLoader,
} from './use-my-certificates';

jest.mock('@/modules/auth/frontend/store', () => ({
  authStore: {
    subscribe: jest.fn(),
    getState: jest.fn(),
  },
}));

const certificate = {
  id: 'cert-123',
  eventName: 'Congreso de Ingeniería de Sistemas',
  participationDate: '13/11/2026',
};

describe('HU19 - Controlador de certificados', () => {
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

  it('mantiene integración pendiente si no hay servicio configurado', () => {
    const { result } = renderHook(() => useMyCertificates());

    expect(result.current.view.status).toBe('integration-pending');
  });

  it('carga los certificados emitidos', async () => {
    const loader = jest.fn<ReturnType<CertificateLoader>, Parameters<CertificateLoader>>()
      .mockResolvedValue([certificate]);

    const { result } = renderHook(() =>
      useMyCertificates({ loadCertificates: loader }),
    );

    await waitFor(() => {
      expect(result.current.view.status).toBe('success');
    });

    expect(loader).toHaveBeenCalledTimes(1);

    expect(result.current.view).toEqual({
      status: 'success',
      certificates: [certificate],
    });
  });

  it('permite reintentar una consulta fallida', async () => {
    const loader = jest.fn<ReturnType<CertificateLoader>, Parameters<CertificateLoader>>()
      .mockRejectedValueOnce(new Error('Sin conexión'))
      .mockResolvedValueOnce([certificate]);

    const { result } = renderHook(() =>
      useMyCertificates({ loadCertificates: loader }),
    );

    await waitFor(() => {
      expect(result.current.view.status).toBe('error');
    });

    act(() => {
      result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.view.status).toBe('success');
    });

    expect(loader).toHaveBeenCalledTimes(2);
  });

  it('oculta los certificados cuando termina la sesión', async () => {
    const loader = jest.fn<ReturnType<CertificateLoader>, Parameters<CertificateLoader>>()
      .mockResolvedValue([certificate]);

    const { result } = renderHook(() =>
      useMyCertificates({ loadCertificates: loader }),
    );

    await waitFor(() => {
      expect(result.current.view.status).toBe('success');
    });

    act(() => {
      notifyAuthChange?.();
    });

    expect(result.current.view).toEqual({
      status: 'unauthenticated',
    });
  });

  it('cancela la solicitud cuando se desmonta el componente', () => {
    const loader = jest.fn<ReturnType<CertificateLoader>, Parameters<CertificateLoader>>()
      .mockImplementation(() => new Promise(() => {}));

    const { unmount } = renderHook(() =>
      useMyCertificates({ loadCertificates: loader }),
    );

    const signal = loader.mock.calls[0][0];

    expect(signal.aborted).toBe(false);

    unmount();

    expect(signal.aborted).toBe(true);
  });
  it('no vuelve a consultar certificados después de cerrar sesión', async () => {
    const loader = jest.fn<
      ReturnType<CertificateLoader>,
      Parameters<CertificateLoader>
    >().mockResolvedValue([certificate]);

    const { result } = renderHook(() =>
      useMyCertificates({ loadCertificates: loader }),
    );

    await waitFor(() => {
      expect(result.current.view.status).toBe('success');
    });

    act(() => {
      notifyAuthChange?.();
    });

    expect(result.current.view.status).toBe('unauthenticated');

    act(() => {
      result.current.retry();
    });

    expect(loader).toHaveBeenCalledTimes(1);
    expect(result.current.view.status).toBe('unauthenticated');
  });
});

