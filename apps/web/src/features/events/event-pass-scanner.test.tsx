import { act, fireEvent, render, screen } from '@testing-library/react';
import { EventPassScanner } from './event-pass-scanner';
import { validateScannedPass } from './validate-scanned-pass';
import type { EventAttendanceResult } from '@umsspira/shared-types';
import { ApiClientError } from '@/shared/services/api-client';
import { SessionError } from '@/shared/services/auth-session';

const attendance: EventAttendanceResult = {
  code: 'ATTENDANCE_RECORDED', attendanceRecorded: true,
  eventId: 'evento', eventTitle: 'Evento de prueba', registrationId: 'inscripcion',
  participantName: 'Ana Pérez', attendedAt: '2026-11-12T20:00:00Z',
};

jest.mock('./validate-scanned-pass', () => ({ validateScannedPass: jest.fn() }));
jest.mock('./event-scanner-camera', () => ({
  EventScannerCamera: ({ onRead, onStart, disabled, startLabel }: {
    onRead: (value: string) => void; onStart: () => void; disabled: boolean; startLabel: string;
  }) => (
    <div>
      <button disabled={disabled} onClick={() => onRead('token-leido')}>Leer QR</button>
      <button disabled={disabled} onClick={onStart}>{startLabel}</button>
    </div>
  ),
}));

describe('Validación desde el escáner', () => {
  beforeEach(() => jest.resetAllMocks());

  it('impide nuevas lecturas mientras valida y distingue la validación del registro', async () => {
    let resolve!: (result: EventAttendanceResult) => void;
    jest.mocked(validateScannedPass).mockReturnValue(new Promise<EventAttendanceResult>((done) => { resolve = done; }));
    render(<EventPassScanner eventId="evento" />);
    fireEvent.click(screen.getByRole('button', { name: 'Leer QR' }));
    expect(screen.getByRole('button', { name: 'Leer QR' })).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Comprobando pase');
    expect(validateScannedPass).toHaveBeenCalledWith('evento', 'token-leido', expect.any(AbortSignal));
    await act(async () => { resolve(attendance); });
    expect(screen.getByRole('heading', { name: 'Asistencia registrada' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Ana Pérez');
    expect(screen.getByRole('button', { name: 'Escanear otro pase' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Escanear otro pase' }));
    expect(screen.queryByText('Ana Pérez')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Cómo escanear' })).toBeInTheDocument();
  });

  it('muestra el rechazo del servidor y permite escanear otra vez', async () => {
    jest.mocked(validateScannedPass).mockRejectedValue(new ApiClientError('El pase corresponde a otro evento', 409, 'PASS_EVENT_MISMATCH'));
    render(<EventPassScanner eventId="evento" />);
    fireEvent.click(screen.getByRole('button', { name: 'Leer QR' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('El pase corresponde a otro evento');
    fireEvent.click(screen.getByRole('button', { name: 'Escanear otro pase' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('cancela la espera del cliente al salir de la pantalla', () => {
    jest.mocked(validateScannedPass).mockReturnValue(new Promise(() => {}));
    const view = render(<EventPassScanner eventId="evento" />);
    fireEvent.click(screen.getByRole('button', { name: 'Leer QR' }));
    const signal = jest.mocked(validateScannedPass).mock.calls[0][2];
    view.unmount();
    expect(signal.aborted).toBe(true);
  });

  it('permite cancelar y evita que una respuesta tardía sustituya una nueva validación', async () => {
    let finishFirst!: (result: EventAttendanceResult) => void;
    let finishSecond!: (result: EventAttendanceResult) => void;
    jest.mocked(validateScannedPass)
      .mockReturnValueOnce(new Promise<EventAttendanceResult>((resolve) => { finishFirst = resolve; }))
      .mockReturnValueOnce(new Promise<EventAttendanceResult>((resolve) => { finishSecond = resolve; }));
    render(<EventPassScanner eventId="evento" />);
    fireEvent.click(screen.getByRole('button', { name: 'Leer QR' }));
    const firstSignal = jest.mocked(validateScannedPass).mock.calls[0][2];
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar validación' }));
    expect(firstSignal.aborted).toBe(true);
    expect(screen.getByRole('alert')).toHaveTextContent('La asistencia puede haberse registrado');
    fireEvent.click(screen.getByRole('button', { name: 'Leer QR' }));
    await act(async () => { finishFirst(attendance); });
    expect(screen.getByRole('status')).toHaveTextContent('Comprobando pase');
    expect(screen.getByRole('button', { name: 'Leer QR' })).toBeDisabled();
    await act(async () => { finishSecond(attendance); });
    expect(screen.getByRole('status')).toHaveTextContent('Ana Pérez');
  });

  it('identifica un ingreso repetido y muestra los datos del registro original', async () => {
    jest.mocked(validateScannedPass).mockResolvedValue({
      ...attendance, code: 'ATTENDANCE_ALREADY_RECORDED',
    });
    render(<EventPassScanner eventId="evento" />);
    fireEvent.click(screen.getByRole('button', { name: 'Leer QR' }));
    expect(await screen.findByRole('heading', { name: 'Asistencia ya registrada' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Evento de prueba');
  });

  it.each([
    new TypeError('Failed to fetch'),
    new ApiClientError('Detalle interno del servidor', 500, 'INTERNAL_ERROR'),
  ])('informa el resultado incierto ante un fallo de conexión o servidor (%#)', async (error) => {
    jest.mocked(validateScannedPass).mockRejectedValue(error);
    render(<EventPassScanner eventId="evento" />);
    fireEvent.click(screen.getByRole('button', { name: 'Leer QR' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('vuelve a escanear el pase para verificar su estado');
    expect(screen.queryByText(error.message)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Escanear otro pase' })).toBeEnabled();
  });

  it('conserva el mensaje de sesión expirada del cliente de autenticación', async () => {
    jest.mocked(validateScannedPass).mockRejectedValue(new SessionError(401, 'Inicia sesión para continuar'));
    render(<EventPassScanner eventId="evento" />);
    fireEvent.click(screen.getByRole('button', { name: 'Leer QR' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Inicia sesión para continuar');
  });
});
