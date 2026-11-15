import { act, render, screen } from '@testing-library/react';
import type { EventPassDto } from '@umsspira/shared-types';
import EventPassDetailPage from './event-pass-detail-page';
import { getMyEventPass } from './event-passes-service';
import { ApiClientError } from '@/shared/services/api-client';
import { authStore } from '@/modules/auth/frontend/store';

jest.mock('./event-passes-service', () => ({ getMyEventPass: jest.fn() }));

const pass: EventPassDto = {
  id: 'pass-1', registrationId: 'registration-1', eventId: 'event-1', userId: 'user-1',
  qrToken: 'test-private-qr-token', status: 'ACTIVO', isValidForAccess: true,
  issuedAt: '2026-10-01T12:00:00Z', expiresAt: null,
  eventDetails: { name: 'Feria de empleo', userName: 'Titulado de prueba',
    dateTime: '2026-11-12T13:00:00Z', location: 'Campus Central' },
};

it('muestra el pase seleccionado y permite volver al listado de origen', async () => {
  jest.mocked(getMyEventPass).mockResolvedValueOnce(pass);
  render(<EventPassDetailPage passId="pass-1" backHref="/events/catalog/passes" />);

  expect(screen.getByRole('status')).toHaveTextContent('Cargando pase QR');
  expect(await screen.findByText('Feria de empleo')).toBeInTheDocument();
  expect(screen.getByText('Titulado de prueba')).toBeInTheDocument();
  expect(screen.getByText('Campus Central')).toBeInTheDocument();
  expect(screen.getByText(/pass-1/)).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Volver a mis pases/ })).toHaveAttribute('href', '/events/catalog/passes');
  expect(screen.queryByRole('region', { name: 'Listado de mis pases' })).not.toBeInTheDocument();
  expect(getMyEventPass).toHaveBeenCalledWith('pass-1', expect.any(AbortSignal));
});

it('no revela un pase inexistente o ajeno', async () => {
  jest.mocked(getMyEventPass).mockResolvedValueOnce(null);
  render(<EventPassDetailPage passId="other-pass" backHref="/mis-pases" />);
  expect(await screen.findByRole('alert')).toHaveTextContent('no pertenece a tu cuenta');
  expect(screen.getByRole('link', { name: /Volver a mis pases/ })).toHaveAttribute('href', '/mis-pases');
});

it('maneja sesión expirada sin exponer detalles del servidor', async () => {
  jest.mocked(getMyEventPass).mockRejectedValueOnce(new ApiClientError('internal private error', 401));
  render(<EventPassDetailPage passId="pass-1" backHref="/mis-pases" />);
  expect(await screen.findByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login');
  expect(screen.queryByText('internal private error')).not.toBeInTheDocument();
});

it('borra el QR al invalidarse la sesión', async () => {
  jest.mocked(getMyEventPass).mockResolvedValueOnce(pass);
  render(<EventPassDetailPage passId="pass-1" backHref="/mis-pases" />);
  expect(await screen.findByText('Feria de empleo')).toBeInTheDocument();
  act(() => authStore.reset());
  expect(screen.queryByText('Feria de empleo')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toBeInTheDocument();
});
