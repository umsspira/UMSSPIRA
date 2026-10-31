import { act, fireEvent, render, screen, within } from '@testing-library/react';
import type { EventPassDto } from '@umsspira/shared-types';
import MyQrPassesPage from './my-qr-passes-page';
import { getMyEventPasses } from './event-passes-service';
import { ApiClientError } from '@/shared/services/api-client';
import { authStore } from '@/modules/auth/frontend/store';

jest.mock('./event-passes-service', () => ({ getMyEventPasses: jest.fn() }));

const activePass: EventPassDto = {
  id: 'pass-1', registrationId: 'registration-1', eventId: 'event-1', userId: 'user-1',
  qrToken: 'real-test-token', status: 'ACTIVO', isValidForAccess: true,
  issuedAt: '2026-10-01T12:00:00Z', expiresAt: null,
  eventDetails: { name: 'Feria de empleo', userName: 'Titulado de prueba',
    dateTime: '2026-11-12T13:00:00Z', location: 'Campus Central' },
};

it('filtra pases reales y abre el componente de pase sin mostrar QR en el invalidado', async () => {
  jest.mocked(getMyEventPasses).mockResolvedValueOnce([
    activePass,
    { ...activePass, id: 'pass-2', eventId: 'event-2', status: 'INVALIDADO',
      isValidForAccess: false, eventDetails: { ...activePass.eventDetails!, name: 'Evento cancelado' } },
  ]);
  render(<MyQrPassesPage />);

  expect(await screen.findByText('Feria de empleo')).toBeInTheDocument();
  expect(screen.getByText('1 pase vigente')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'NO VIGENTES' }));
  expect(screen.queryByText('Feria de empleo')).not.toBeInTheDocument();
  const invalidCard = screen.getByRole('article');
  expect(within(invalidCard).getByText('Evento cancelado')).toBeInTheDocument();
  expect(invalidCard.querySelector('svg')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'TODOS' }));
  expect(screen.getByText('Feria de empleo')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'NO VIGENTES' }));
  fireEvent.click(within(invalidCard).getByRole('button', { name: 'Ver detalle' }));
  expect(screen.getByRole('region', { name: 'Detalle del pase' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /Volver a mis pases/ }));
  expect(screen.queryByRole('region', { name: 'Detalle del pase' })).not.toBeInTheDocument();
});

it('elimina pases y detalle abierto al invalidarse la sesión', async () => {
  jest.mocked(getMyEventPasses).mockResolvedValueOnce([activePass]);
  render(<MyQrPassesPage />);
  expect(await screen.findByText('Feria de empleo')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Abrir pase' }));
  expect(screen.getByRole('region', { name: 'Detalle del pase' })).toBeInTheDocument();

  act(() => authStore.reset());

  expect(screen.queryByText('Feria de empleo')).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Detalle del pase' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Iniciar sesión' })).toBeInTheDocument();
});

it('navega entre Explorar, Mis eventos y Mis pases usando rutas existentes', async () => {
  jest.mocked(getMyEventPasses).mockResolvedValueOnce([]);
  render(<MyQrPassesPage />);

  expect(await screen.findByText('Todavía no tienes pases QR')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Explorar' })).toHaveAttribute('href', '/portal/eventos');
  expect(screen.getByRole('link', { name: 'Mis eventos' })).toHaveAttribute('href', '/portal/eventos/mis-eventos');
  expect(screen.getByRole('link', { name: 'Mis pases' })).toHaveAttribute('href', '/events/catalog/passes');
});

it('envía a iniciar sesión cuando la consulta de pases responde 401', async () => {
  jest.mocked(getMyEventPasses).mockRejectedValueOnce(new ApiClientError('detalle interno', 401));
  render(<MyQrPassesPage />);

  expect(await screen.findByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login');
  expect(screen.queryByText('detalle interno')).not.toBeInTheDocument();
});
