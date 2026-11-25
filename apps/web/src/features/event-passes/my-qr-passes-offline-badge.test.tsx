import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { EventPassDto } from '@umsspira/shared-types';
import MyQrPassesPage from './my-qr-passes-page';
import { getMyEventPasses } from './event-passes-service';
import { ApiClientError } from '@/shared/services/api-client';
import { deleteOfflineQrPass, getOfflineQrPasses } from './offline/offline-qr-storage';

jest.mock('./event-passes-service', () => ({ getMyEventPasses: jest.fn() }));
jest.mock('./offline/offline-qr-storage', () => ({ ...jest.requireActual('./offline/offline-qr-storage'), getOfflineQrPasses: jest.fn(), deleteOfflineQrPass: jest.fn() }));
jest.mock('./offline/offline-session', () => ({ ...jest.requireActual('./offline/offline-session'), getOfflineSessionUserId: () => 'user-1' }));


const pass = (id: string, name: string): EventPassDto => ({
  id, registrationId: 'r', eventId: 'e', userId: 'user-1', qrToken: `token-${id}`, status: 'ACTIVO',
  isValidForAccess: true, issuedAt: '2026-10-01T12:00:00Z', expiresAt: null,
  eventDetails: { name, userName: 'Titulado', dateTime: '2026-11-12T13:00:00Z', location: 'Campus' },
});

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(getMyEventPasses).mockResolvedValue([pass('p1', 'Feria de empleo'), pass('p2', 'Charla')]);
  jest.mocked(getOfflineQrPasses).mockResolvedValue([{ id: 'p1' }] as never);
  jest.mocked(deleteOfflineQrPass).mockResolvedValue(true);
});

describe('Mis pases QR · HU02', () => {
  it('CA-02: solo el pase guardado en el dispositivo lleva «Disponible offline»', async () => {
    render(<MyQrPassesPage />);
    await screen.findByText('Feria de empleo');
    await waitFor(() => expect(screen.getAllByTestId('pass-offline-badge')).toHaveLength(1));
    expect(screen.getByText('Disponible offline')).toBeInTheDocument();
  });

  it('CA-07: «Eliminar de este dispositivo» pide confirmación y borra solo lo guardado localmente', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    render(<MyQrPassesPage />);
    fireEvent.click(await screen.findByTestId('pass-remove-from-device'));
    await waitFor(() => expect(deleteOfflineQrPass).toHaveBeenCalledWith('p1', 'user-1'));
    await waitFor(() => expect(screen.queryByTestId('pass-offline-badge')).not.toBeInTheDocument());
    // El pase sigue en la cuenta: continúa en la lista.
    expect(screen.getByText('Feria de empleo')).toBeInTheDocument();
  });

  it('CA-07: si la persona cancela no se borra nada', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(false);
    render(<MyQrPassesPage />);
    fireEvent.click(await screen.findByTestId('pass-remove-from-device'));
    expect(deleteOfflineQrPass).not.toHaveBeenCalled();
    expect(screen.getByTestId('pass-offline-badge')).toBeInTheDocument();
  });

  it('HU13 CA-02: si un servicio responde 500 se muestra lo guardado con el aviso', async () => {
    jest.mocked(getMyEventPasses).mockRejectedValue(new ApiClientError('caído', 503));
    jest.mocked(getOfflineQrPasses).mockResolvedValue([
      { id: 'p1', userId: 'user-1', qrToken: 't', savedAt: '2026-10-01T12:00:00Z', eventDetails: { name: 'Feria de empleo', userName: 'Titulado', dateTime: '2026-11-12T13:00:00Z', location: 'Campus' } },
    ] as never);
    render(<MyQrPassesPage />);
    expect(await screen.findByTestId('pases-servicios-no-responden')).toHaveTextContent(
      'Algunos servicios no responden. Mostrando lo guardado en tu dispositivo.',
    );
  });
});
