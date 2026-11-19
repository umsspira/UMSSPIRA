import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MyPassesPage from './page';
import { apiClient } from '@/shared/services/api-client';
import { getOfflineQrPasses } from '@/features/event-passes/offline/offline-qr-storage';
import { getOfflineSessionUserId } from '@/features/event-passes/offline/offline-session';

jest.mock('@/shared/components/navbar/index', () => ({ ConnectedNavbar: () => null }));
jest.mock('@/shared/services/api-client', () => ({ apiClient: jest.fn() }));
jest.mock('@/features/event-passes/offline/offline-session', () => ({
  getOfflineSessionUserId: jest.fn(),
}));
jest.mock('@/features/event-passes/offline/offline-qr-storage', () => ({
  getOfflineQrPasses: jest.fn(),
}));
jest.mock('@/modules/events/components/EventPassCard', () => ({
  EventPassCard: ({ eventName, qrToken }: { eventName: string; qrToken: string }) => (
    <div data-testid="opened-offline-qr">{eventName}: {qrToken}</div>
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