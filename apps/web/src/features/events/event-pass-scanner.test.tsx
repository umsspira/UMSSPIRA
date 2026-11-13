import { act, fireEvent, render, screen } from '@testing-library/react';
import { EventPassScanner } from './event-pass-scanner';
import { validateScannedPass } from './validate-scanned-pass';

jest.mock('./validate-scanned-pass', () => ({ validateScannedPass: jest.fn() }));
jest.mock('./event-scanner-camera', () => ({
  EventScannerCamera: ({ onRead, disabled }: { onRead: (value: string) => void; disabled: boolean }) => (
    <button disabled={disabled} onClick={() => onRead('token-leido')}>Leer QR</button>
  ),
}));

describe('Validación desde el escáner', () => {
  beforeEach(() => jest.resetAllMocks());

  it('impide nuevas lecturas mientras valida y distingue la validación del registro', async () => {
    let resolve!: () => void;
    jest.mocked(validateScannedPass).mockReturnValue(new Promise<void>((done) => { resolve = done; }));
    render(<EventPassScanner eventId="evento" />);
    fireEvent.click(screen.getByRole('button', { name: 'Leer QR' }));
    expect(screen.getByRole('button')).toBeDisabled();
    expect(validateScannedPass).toHaveBeenCalledWith('evento', 'token-leido', expect.any(AbortSignal));
    await act(async () => { resolve(); });
    expect(screen.getByRole('status')).toHaveTextContent('Pase válido. El registro de asistencia aún está pendiente.');
    expect(screen.getByRole('button')).toBeEnabled();
  });

  it('muestra el rechazo del servidor y permite escanear otra vez', async () => {
    jest.mocked(validateScannedPass).mockRejectedValue(new Error('El pase corresponde a otro evento'));
    render(<EventPassScanner eventId="evento" />);
    fireEvent.click(screen.getByRole('button', { name: 'Leer QR' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('El pase corresponde a otro evento');
    expect(screen.getByRole('button')).toBeEnabled();
  });

  it('cancela la espera del cliente al salir de la pantalla', () => {
    jest.mocked(validateScannedPass).mockReturnValue(new Promise(() => {}));
    const view = render(<EventPassScanner eventId="evento" />);
    fireEvent.click(screen.getByRole('button', { name: 'Leer QR' }));
    const signal = jest.mocked(validateScannedPass).mock.calls[0][2];
    view.unmount();
    expect(signal.aborted).toBe(true);
  });
});
