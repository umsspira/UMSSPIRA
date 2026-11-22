import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { EventPassDto } from '@umsspira/shared-types';
import { EventPassQrCard } from './event-pass-qr-card';
import { saveOfflineQrPass } from './offline/offline-qr-storage';

jest.mock('./offline/offline-qr-storage', () => ({
  saveOfflineQrPass: jest.fn(),
}));

const activePass: EventPassDto = {
  id: 'pass-authorized-1',
  registrationId: 'registration-1',
  eventId: 'event-1',
  userId: 'user-1',
  qrToken: 'authorized-qr-token',
  status: 'ACTIVO',
  isValidForAccess: true,
  issuedAt: '2026-11-01T12:00:00.000Z',
  expiresAt: null,
  eventDetails: {
    name: 'Feria laboral',
    userName: 'Titulado de prueba',
    dateTime: '2026-12-01T14:00:00.000Z',
    location: 'Campus Central',
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(saveOfflineQrPass).mockResolvedValue({
    ...activePass,
    eventDetails: activePass.eventDetails!,
    savedAt: '2026-11-19T12:00:00.000Z',
  });
});

it('permite guardar un QR autorizado en el dispositivo y confirma el resultado', async () => {
  render(<EventPassQrCard pass={activePass} />);

  fireEvent.click(screen.getByRole('button', { name: 'Guardar nuevo QR' }));

  await waitFor(() => expect(saveOfflineQrPass).toHaveBeenCalledWith({
    id: 'pass-authorized-1',
    userId: 'user-1',
    qrToken: 'authorized-qr-token',
    eventDetails: {
      name: 'Feria laboral',
      userName: 'Titulado de prueba',
      dateTime: '2026-12-01T14:00:00.000Z',
      location: 'Campus Central',
    },
  }));
  expect(await screen.findByRole('status')).toHaveTextContent(
    'Tu pase QR se guardó en este dispositivo.',
  );
});

it('no ofrece guardar un QR cuya vigencia no pudo comprobarse sin conexión', () => {
  render(<EventPassQrCard pass={activePass} offline />);

  expect(screen.queryByRole('button', { name: 'Guardar nuevo QR' })).not.toBeInTheDocument();
  expect(saveOfflineQrPass).not.toHaveBeenCalled();
});

it('no ofrece guardar pases inválidos', () => {
  render(<EventPassQrCard pass={{ ...activePass, status: 'INVALIDADO', isValidForAccess: false }} />);

  expect(screen.queryByRole('button', { name: 'Guardar nuevo QR' })).not.toBeInTheDocument();
  expect(saveOfflineQrPass).not.toHaveBeenCalled();
});