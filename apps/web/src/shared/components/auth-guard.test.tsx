import { render, screen, waitFor } from '@testing-library/react';
import { AuthGuard } from './auth-guard';
import { ensureAccessToken } from '@/shared/services/auth-session';

jest.mock('next/navigation', () => ({ useRouter: () => ({ replace: jest.fn() }) }));
jest.mock('@/shared/services/auth-session', () => ({
  ensureAccessToken: jest.fn(),
  SessionError: class SessionError extends Error { constructor(m: string, public status?: number) { super(m); } },
}));

const setOnline = (value: boolean) => Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });

describe('AuthGuard', () => {
  afterEach(() => setOnline(true));

  it('con sesión válida muestra el contenido', async () => {
    jest.mocked(ensureAccessToken).mockResolvedValue('token' as never);
    render(<AuthGuard><p>contenido privado</p></AuthGuard>);
    expect(await screen.findByText('contenido privado')).toBeInTheDocument();
  });

  it('con conexión y fallo al verificar mantiene el mensaje de siempre', async () => {
    setOnline(true);
    jest.mocked(ensureAccessToken).mockRejectedValue(new Error('500'));
    render(<AuthGuard><p>contenido privado</p></AuthGuard>);
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo verificar la sesión. Inténtalo nuevamente.');
  });

  it('sin conexión muestra «Sin conexión a Internet», Reintentar y un enlace al inicio (sin QR para otros roles)', async () => {
    setOnline(false);
    jest.mocked(ensureAccessToken).mockRejectedValue(new Error('offline'));
    render(<AuthGuard><p>contenido privado</p></AuthGuard>);
    await waitFor(() => expect(screen.getByTestId('auth-guard-sin-conexion')).toBeInTheDocument());
    expect(screen.getByText('Sin conexión a Internet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    expect(screen.queryByTestId('auth-guard-qr')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al inicio' })).toHaveAttribute('href', '/portal');
  });
});
