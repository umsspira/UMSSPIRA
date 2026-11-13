import { act, fireEvent, render, screen } from '@testing-library/react';
import { EventScannerCamera } from './event-scanner-camera';

describe('Cámara del escáner', () => {
  const getUserMedia = jest.fn();
  const stop = jest.fn();
  const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
    jest.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    getUserMedia.mockResolvedValue(stream);
  });
  afterEach(() => jest.restoreAllMocks());

  it('solicita la cámara tras activarla y detiene las pistas al salir', async () => {
    const view = render(<EventScannerCamera />);
    expect(getUserMedia).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Activar cámara' }));
    await screen.findByText('Ubica el QR dentro del marco');
    expect(getUserMedia).toHaveBeenCalledWith({ audio: false, video: { facingMode: { ideal: 'environment' } } });
    view.unmount();
    expect(stop).toHaveBeenCalled();
  });

  it('informa la denegación del permiso y permite reintentar', async () => {
    getUserMedia.mockRejectedValueOnce(new DOMException('Denegado', 'NotAllowedError'));
    render(<EventScannerCamera />);
    fireEvent.click(screen.getByRole('button', { name: 'Activar cámara' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Permite el acceso');
    fireEvent.click(screen.getByRole('button', { name: 'Activar cámara' }));
    await screen.findByText('Ubica el QR dentro del marco');
  });

  it('libera una cámara cuyo permiso se concede después de abandonar la pantalla', async () => {
    let resolve!: (value: MediaStream) => void;
    getUserMedia.mockReturnValue(new Promise<MediaStream>((done) => { resolve = done; }));
    const view = render(<EventScannerCamera />);
    fireEvent.click(screen.getByRole('button', { name: 'Activar cámara' }));
    view.unmount();
    await act(async () => { resolve(stream); });
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
