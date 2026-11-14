import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { EventScannerCamera } from './event-scanner-camera';
import jsQR from 'jsqr';

jest.mock('jsqr', () => ({ __esModule: true, default: jest.fn() }));

describe('Cámara del escáner', () => {
  const getUserMedia = jest.fn();
  const stop = jest.fn();
  const track = Object.assign(new EventTarget(), { stop });
  const stream = { getTracks: () => [track] } as unknown as MediaStream;

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia } });
    jest.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
    jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    getUserMedia.mockResolvedValue(stream);
  });
  afterEach(() => jest.restoreAllMocks());

  it('solicita la cámara tras activarla y detiene las pistas al salir', async () => {
    const view = render(<EventScannerCamera />);
    expect(getUserMedia).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Activar cámara' }));
    await screen.findByText('Ubica el QR dentro del marco');
    expect(screen.queryByRole('button', { name: 'Detener cámara' })).not.toBeInTheDocument();
    expect(getUserMedia).toHaveBeenCalledWith({ audio: false, video: { facingMode: { ideal: 'environment' } } });
    view.unmount();
    expect(stop).toHaveBeenCalled();
  });

  it('permite iniciar la cámara desde el panel lateral con el mismo control', async () => {
    const actions = document.createElement('div');
    document.body.appendChild(actions);
    const view = render(<EventScannerCamera actionContainer={actions} inactiveMessage="Lectura completada" startLabel="Escanear otro pase" />);
    try {
      expect(screen.getByRole('status')).toHaveTextContent('Lectura completada');
      fireEvent.click(within(actions).getByRole('button', { name: 'Escanear otro pase' }));
      await screen.findByText('Ubica el QR dentro del marco');
      expect(getUserMedia).toHaveBeenCalledTimes(1);
    } finally {
      view.unmount();
      actions.remove();
    }
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

  it('notifica el permiso denegado al panel sin duplicar el mensaje de error', async () => {
    getUserMedia.mockRejectedValueOnce(new DOMException('Denegado', 'NotAllowedError'));
    const onError = jest.fn();
    render(<EventScannerCamera onError={onError} />);
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Activar cámara' })); });
    expect(onError).toHaveBeenCalledWith({
      kind: 'permission-denied',
      message: 'Permite el acceso a la cámara en tu navegador y vuelve a intentarlo.',
    });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
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

  it('informa la desconexión y permite activar la cámara de nuevo', async () => {
    render(<EventScannerCamera />);
    fireEvent.click(screen.getByRole('button', { name: 'Activar cámara' }));
    await screen.findByText('Ubica el QR dentro del marco');
    act(() => { track.dispatchEvent(new Event('ended')); });
    expect(screen.getByRole('alert')).toHaveTextContent('Se interrumpió la cámara');
    expect(stop).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Activar cámara' }));
    await screen.findByText('Ubica el QR dentro del marco');
  });

  it('rechaza la lectura si el navegador no permite procesar la imagen', async () => {
    const onRead = jest.fn();
    render(<EventScannerCamera onRead={onRead} />);
    fireEvent.click(screen.getByRole('button', { name: 'Activar cámara' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('no permite procesar imágenes');
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(onRead).not.toHaveBeenCalled();
  });

  it('envía una sola lectura y libera la cámara cuando encuentra un QR', async () => {
    jest.useFakeTimers();
    try {
      const context = { drawImage: jest.fn(), getImageData: () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 }) };
      jest.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(context as unknown as CanvasRenderingContext2D);
      jest.mocked(jsQR).mockReturnValue({ data: 'token-leido' } as ReturnType<typeof jsQR>);
      const onRead = jest.fn();
      render(<EventScannerCamera onRead={onRead} />);
      const video = screen.getByLabelText('Cámara del escáner');
      Object.defineProperties(video, { readyState: { value: 2 }, videoWidth: { value: 640 }, videoHeight: { value: 480 } });
      await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Activar cámara' })); });
      await act(async () => { jest.advanceTimersByTime(200); });
      await act(async () => { jest.advanceTimersByTime(1000); });
      expect(onRead).toHaveBeenCalledTimes(1);
      expect(onRead).toHaveBeenCalledWith('token-leido');
      expect(stop).toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});
