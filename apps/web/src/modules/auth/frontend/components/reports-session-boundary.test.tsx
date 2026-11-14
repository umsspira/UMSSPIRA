import { act, render, screen, waitFor } from '@testing-library/react';
import { ReportsSessionBoundary } from './reports-session-boundary';
import { authenticatedFetch, SessionError } from '@/shared/services/auth-session';
import { notifySessionExpired, SESSION_EXPIRED_EVENT } from '../services/session-expired';

jest.mock('@/shared/services/auth-session', () => ({
  authenticatedFetch: jest.fn(),
  SessionError: jest.requireActual('@/shared/services/auth-session').SessionError,
}));
jest.mock('./session-expired-dialog', () => ({
  SessionExpiredDialog: () => <div data-testid="expired-dialog" />,
}));

const mockedFetch = authenticatedFetch as jest.Mock;
let notificationCount: number;
const onExpired = () => { notificationCount += 1; };

beforeEach(() => {
  mockedFetch.mockReset();
  notificationCount = 0;
  window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
});
afterEach(() => {
  window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
});

it('valida la sesión del administrador al entrar y mantiene los reportes con 200', async () => {
  mockedFetch.mockResolvedValue({ status: 200, ok: true });
  render(<ReportsSessionBoundary><div>Reportes protegidos</div></ReportsSessionBoundary>);
  await waitFor(() => expect(mockedFetch).toHaveBeenCalledWith('/api/v1/auth/me', { cache: 'no-store' }));
  expect(screen.getByText('Reportes protegidos')).toBeInTheDocument();
  expect(notificationCount).toBe(0);
});

it('si la API devuelve HTTP 401, elimina las tablas y muestra la alerta', async () => {
  mockedFetch.mockResolvedValue({ status: 401, ok: false });
  render(<ReportsSessionBoundary><div>Datos privados de reportes</div></ReportsSessionBoundary>);
  await waitFor(() => expect(notificationCount).toBe(1));
  expect(screen.queryByText('Datos privados de reportes')).not.toBeInTheDocument();
  expect(screen.getByTestId('expired-dialog')).toBeInTheDocument();
});

it('si la renovación falla con 401, bloquea también los reportes', async () => {
  mockedFetch.mockRejectedValue(new SessionError(401, 'Sesión caducada'));
  render(<ReportsSessionBoundary><div>Reportes</div></ReportsSessionBoundary>);
  await waitFor(() => expect(notificationCount).toBe(1));
  expect(screen.queryByText('Reportes')).not.toBeInTheDocument();
});

it('un fallo 503 o de red NO se interpreta como caducidad de sesión', async () => {
  mockedFetch.mockRejectedValue(new SessionError(503, 'Servidor temporalmente inaccesible'));
  render(<ReportsSessionBoundary><div>Reportes</div></ReportsSessionBoundary>);
  await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(1));
  expect(notificationCount).toBe(0);
  expect(screen.getByText('Reportes')).toBeInTheDocument();
});

it('revalida al volver a la pestaña, incluso si no hay nuevas solicitudes por filtros', async () => {
  mockedFetch.mockResolvedValueOnce({ status: 200, ok: true })
    .mockResolvedValueOnce({ status: 401, ok: false });
  render(<ReportsSessionBoundary><div>Reportes</div></ReportsSessionBoundary>);
  await waitFor(() => expect(mockedFetch).toHaveBeenCalledTimes(1));
  act(() => window.dispatchEvent(new Event('focus')));
  await waitFor(() => expect(notificationCount).toBe(1));
  expect(screen.queryByText('Reportes')).not.toBeInTheDocument();
});

it('una alerta 401 de otros servicios también retira el contenido privado', () => {
  mockedFetch.mockImplementation(() => new Promise(() => undefined));
  render(<ReportsSessionBoundary><div>Reportes</div></ReportsSessionBoundary>);
  act(() => notifySessionExpired());
  expect(screen.queryByText('Reportes')).not.toBeInTheDocument();
});
