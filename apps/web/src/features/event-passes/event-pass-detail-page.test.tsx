import { act, fireEvent, render, screen } from '@testing-library/react';
import type { EventPassDto } from '@umsspira/shared-types';
import EventPassDetailPage from './event-pass-detail-page';
import { getMyEventPass } from './event-passes-service';
import * as offlineStorage from './offline-pass-storage';
import { ApiClientError } from '@/shared/services/api-client';
import { authStore } from '@/modules/auth/frontend/store';

jest.mock('./event-passes-service', () => ({ getMyEventPass: jest.fn() }));
jest.mock('./offline-pass-storage', () => ({
  saveOfflinePass: jest.fn().mockResolvedValue(undefined),
  getOfflinePass: jest.fn().mockResolvedValue(null),
}));

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


it('actualiza el pase si fue invalidado al recuperar la conexión', async () => {
  jest.mocked(getMyEventPass)
    .mockResolvedValueOnce(pass)
    .mockResolvedValueOnce({
      ...pass,
      status: 'INVALIDADO',
      isValidForAccess: false,
    });

  render(<EventPassDetailPage passId="pass-1" backHref="/mis-pases" />);
  expect(await screen.findByText('Feria de empleo')).toBeInTheDocument();

  act(() => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    window.dispatchEvent(new Event('offline'));
  });

  expect(screen.getByText('Modo sin conexión')).toBeInTheDocument();
  expect(screen.getByText('SIN CONEXIÓN')).toBeInTheDocument();

  act(() => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
    window.dispatchEvent(new Event('online'));
  });

  expect(await screen.findByText('PASE INVALIDADO')).toBeInTheDocument();
  expect(screen.queryByText('VÁLIDO')).not.toBeInTheDocument();
});


it('mantiene visible el pase si no se puede guardar sin conexión', async () => {
  const guardar = jest.mocked(offlineStorage.saveOfflinePass);
  guardar.mockRejectedValueOnce(new Error('Almacenamiento no disponible'));

  try {
    jest.mocked(getMyEventPass).mockResolvedValueOnce(pass);

    render(<EventPassDetailPage passId="pass-1" backHref="/mis-pases" />);

    expect(await screen.findByText('Feria de empleo')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No se pudo guardar el pase para consultarlo sin conexión.',
    );
    expect(screen.getByText('Feria de empleo')).toBeInTheDocument();
  } finally {
    guardar.mockReset();
    guardar.mockResolvedValue(undefined);
  }
});


it('permite reintentar si falla la sincronización', async () => {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: true,
  });

  jest.mocked(getMyEventPass)
    .mockResolvedValueOnce(pass)
    .mockRejectedValueOnce(new Error('Servidor no disponible'));

  render(<EventPassDetailPage passId="pass-1" backHref="/mis-pases" />);
  expect(await screen.findByText('Feria de empleo')).toBeInTheDocument();

  act(() => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    window.dispatchEvent(new Event('offline'));
  });

  act(() => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
    window.dispatchEvent(new Event('online'));
  });

  expect(
    await screen.findByText('No pudimos comprobar el estado del pase'),
  ).toBeInTheDocument();

  jest.mocked(getMyEventPass).mockResolvedValueOnce(pass);
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

  expect(await screen.findByText('Feria de empleo')).toBeInTheDocument();
});
