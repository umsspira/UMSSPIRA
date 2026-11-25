import { act, render, screen } from '@testing-library/react';
import { ConnectionStatusBanner, RESTORED_VISIBLE_MS } from './connection-status-banner';

let mockPathname = '/portal/comunidad';
jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }));

const setOnline = (value: boolean) => Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });
const emit = (name: 'online' | 'offline') => act(() => { window.dispatchEvent(new Event(name)); });

beforeEach(() => {
  jest.useFakeTimers();
  mockPathname = '/portal/comunidad';
  setOnline(true);
});
afterEach(() => jest.useRealTimers());

describe('Indicador global de conexión (HU05)', () => {
  it('con conexión no muestra nada', () => {
    render(<ConnectionStatusBanner />);
    expect(screen.queryByTestId('connection-status-banner')).not.toBeInTheDocument();
  });

  it('CA-02/04: al perder la conexión muestra «Sin señal» sin recargar', () => {
    render(<ConnectionStatusBanner />);
    setOnline(false);
    emit('offline');
    expect(screen.getByTestId('connection-status-banner')).toHaveAttribute('data-estado', 'sin-conexion');
    expect(screen.getByText('Sin señal')).toBeInTheDocument();
  });

  it('si el sistema informa que no hay ningún tipo de red muestra «Modo avión»', () => {
    Object.defineProperty(window.navigator, 'connection', { value: { type: 'none' }, configurable: true });
    render(<ConnectionStatusBanner />);
    setOnline(false);
    emit('offline');
    expect(screen.getByTestId('connection-status-banner')).toHaveAttribute('data-tipo', 'modo-avion');
    expect(screen.getByText('Modo avión')).toBeInTheDocument();
    Object.defineProperty(window.navigator, 'connection', { value: undefined, configurable: true });
  });

  it('CA-03: al volver la red aparece «En línea» y luego desaparece', async () => {
    render(<ConnectionStatusBanner />);
    setOnline(false);
    emit('offline');
    setOnline(true);
    // «online» se confirma con una comprobación real (asíncrona); sin fetch en las pruebas se da por buena.
    await act(async () => { window.dispatchEvent(new Event('online')); });
    expect(screen.getByText('En línea')).toBeInTheDocument();
    expect(screen.queryByText('Sin señal')).not.toBeInTheDocument();
    act(() => { jest.advanceTimersByTime(RESTORED_VISIBLE_MS + 10); });
    expect(screen.queryByTestId('connection-status-banner')).not.toBeInTheDocument();
  });

  it('no repite el aviso en el inicio del portal, que ya tiene el suyo', () => {
    mockPathname = '/portal';
    render(<ConnectionStatusBanner />);
    setOnline(false);
    emit('offline');
    expect(screen.queryByTestId('connection-status-banner')).not.toBeInTheDocument();
  });

  it('CA-05: es solo informativo (no captura toques)', () => {
    render(<ConnectionStatusBanner />);
    setOnline(false);
    emit('offline');
    expect(screen.getByTestId('connection-status-banner').className).toContain('pointer-events-none');
  });
});
