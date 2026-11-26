import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MyPassesPage from './page';
import { apiClient } from '@/shared/services/api-client';
import { deleteOfflineQrPass, getOfflineQrPasses, saveOfflineQrPass } from '@/features/event-passes/offline/offline-qr-storage';
import { getOfflineSessionUserId } from '@/features/event-passes/offline/offline-session';

jest.mock('@/shared/components/navbar/index', () => ({ ConnectedNavbar: () => null }));
jest.mock('@/shared/services/api-client', () => ({ apiClient: jest.fn() }));
jest.mock('@/features/event-passes/offline/offline-session', () => ({
  getOfflineSessionUserId: jest.fn(),
}));
jest.mock('@/features/event-passes/offline/offline-qr-storage', () => ({
  getOfflineQrPasses: jest.fn(),
  saveOfflineQrPass: jest.fn(),
  deleteOfflineQrPass: jest.fn(),
}));
jest.mock('@/modules/events/components/EventPassCard', () => ({
  EventPassCard: ({
    eventName,
    qrToken,
    onSaveOffline,
    saveOfflineMessage,
  }: {
    eventName: string;
    qrToken: string;
    onSaveOffline?: () => void;
    saveOfflineMessage?: string;
  }) => (
    <>
      <div data-testid="opened-offline-qr">{eventName}: {qrToken}</div>
      {onSaveOffline && (
        <button type="button" onClick={onSaveOffline}>Guardar nuevo QR</button>
      )}
      {saveOfflineMessage && <p role="status">{saveOfflineMessage}</p>}
    </>
  ),
}));

const savedPass = {
  id: 'pass-1',
  userId: 'user-1',
  qrToken: 'offline-qr-token',
  eventDetails: {
    name: 'Feria laboral',
    userName: 'Titulado de prueba',
    dateTime: '2026-12-01T14:00:00.000Z',
    location: 'Campus Central',
  },
  savedAt: '2026-11-19T12:00:00.000Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(apiClient).mockResolvedValue([]);
  jest.mocked(getOfflineSessionUserId).mockReturnValue('user-1');
  jest.mocked(getOfflineQrPasses).mockResolvedValue([savedPass]);
  jest.mocked(saveOfflineQrPass).mockResolvedValue(savedPass);
  jest.mocked(deleteOfflineQrPass).mockResolvedValue(true);
});

it('identifica Mis códigos QR y explica cómo abrir uno guardado', async () => {
  render(<MyPassesPage />);

  expect(await screen.findByRole('heading', { name: 'Mis códigos QR' })).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: /Feria laboral.*Ver QR/ })).toBeInTheDocument();
});

it('abre y oculta el QR guardado con un toque en su acción', async () => {
  render(<MyPassesPage />);

  const openButton = await screen.findByRole('button', { name: /Feria laboral.*Ver QR/ });
  fireEvent.click(openButton);

  expect(await screen.findByTestId('opened-offline-qr')).toHaveTextContent(
    'Feria laboral: offline-qr-token',
  );
  fireEvent.click(screen.getByRole('button', { name: /Feria laboral.*Ocultar QR/ }));
  await waitFor(() => expect(screen.queryByTestId('opened-offline-qr')).not.toBeInTheDocument());
});

it('conserva el QR cuando se cancela la confirmación de eliminación', async () => {
  const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
  render(<MyPassesPage />);

  fireEvent.click(await screen.findByRole('button', { name: 'Eliminar de este dispositivo: Feria laboral' }));

  expect(confirmSpy).toHaveBeenCalled();
  expect(deleteOfflineQrPass).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: /Feria laboral.*Ver QR/ })).toBeInTheDocument();
  confirmSpy.mockRestore();
});

it('elimina el QR guardado solo después de confirmar', async () => {
  const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
  render(<MyPassesPage />);

  fireEvent.click(await screen.findByRole('button', { name: 'Eliminar de este dispositivo: Feria laboral' }));

  await waitFor(() => expect(deleteOfflineQrPass).toHaveBeenCalledWith('pass-1', 'user-1'));
  expect(await screen.findByRole('status')).toHaveTextContent('El QR se eliminó de este dispositivo.');
  expect(screen.queryByRole('button', { name: /Feria laboral.*Ver QR/ })).not.toBeInTheDocument();
  confirmSpy.mockRestore();
});

it('muestra Guardar nuevo QR en pases vigentes de la pantalla principal', async () => {
  jest.mocked(apiClient).mockResolvedValue([{
    id: 'server-pass-1',
    registrationId: 'registration-1',
    eventId: 'event-1',
    userId: 'user-1',
    qrToken: 'authorized-server-token',
    status: 'ACTIVO',
    isValidForAccess: true,
    issuedAt: '2026-11-01T12:00:00.000Z',
    eventDetails: savedPass.eventDetails,
  }]);
  jest.mocked(getOfflineQrPasses).mockResolvedValue([]);

  render(<MyPassesPage />);
  // El pase sale compacto: primero se toca «Ver QR» para abrirlo.
  fireEvent.click(await screen.findByRole('button', { name: /Feria laboral.*Ver QR/ }));
  fireEvent.click(await screen.findByRole('button', { name: 'Guardar nuevo QR' }));

  await waitFor(() => expect(saveOfflineQrPass).toHaveBeenCalledWith({
    id: 'server-pass-1',
    userId: 'user-1',
    qrToken: 'authorized-server-token',
    eventDetails: savedPass.eventDetails,
  }));
  expect(await screen.findByRole('status')).toHaveTextContent(
    'Tu pase QR se guardó en este dispositivo.',
  );
});