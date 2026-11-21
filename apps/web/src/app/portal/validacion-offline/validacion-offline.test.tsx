import { render, screen, waitFor } from '@testing-library/react';
import ValidacionOffline from './validacion-offline';
import { getOfflineQrPasses } from '@/features/event-passes/offline/offline-qr-storage';
import { getOfflineSessionUserId } from '@/features/event-passes/offline/offline-session';

jest.mock('@/features/event-passes/offline/offline-qr-storage', () => ({ getOfflineQrPasses: jest.fn() }));
jest.mock('@/features/event-passes/offline/offline-session', () => ({ getOfflineSessionUserId: jest.fn() }));

const setOnline = (value: boolean) => Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });

beforeEach(() => {
  jest.resetAllMocks();
  (getOfflineSessionUserId as jest.Mock).mockReturnValue(null);
  (getOfflineQrPasses as jest.Mock).mockResolvedValue([]);
  setOnline(true);
});

describe('HU08 · pantalla de validación sin conexión', () => {
  it('muestra el encabezado y las dos tarjetas del mockup', () => {
    render(<ValidacionOffline />);
    expect(screen.getByText('Sprint 3 · Demo de calificación')).toBeInTheDocument();
    expect(screen.getByText('Validación del funcionamiento sin conexión.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Flujo en Modo Avión' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Auditoría y navegadores' })).toBeInTheDocument();
    for (const paso of ['1. Iniciar sesión y guardar el QR', '2. Activar el Modo Avión', '3. Abrir o recargar la PWA', '4. Abrir el pase guardado']) {
      expect(screen.getByText(paso)).toBeInTheDocument();
    }
    expect(screen.getByText('Lighthouse: PWA instalable')).toBeInTheDocument();
    expect(screen.getByText('Lighthouse: responde sin conexión')).toBeInTheDocument();
    expect(screen.getByText('Lighthouse: Service Worker registrado')).toBeInTheDocument();
    expect(screen.getByText('Chrome (escritorio y Android)')).toBeInTheDocument();
    expect(screen.getByText('Firefox (escritorio y móvil)')).toBeInTheDocument();
  });

  it('con conexión y sin QR guardado, los pasos 1 y 2 quedan pendientes', async () => {
    render(<ValidacionOffline />);
    await waitFor(() => expect(getOfflineSessionUserId).toHaveBeenCalled());
    expect(screen.getByTestId('hu8-paso-1')).toHaveAttribute('data-estado', 'pendiente');
    expect(screen.getByTestId('hu8-paso-2')).toHaveAttribute('data-estado', 'pendiente');
  });

  it('con un QR guardado y sin conexión, marca los pasos 1 y 2 como cumplidos', async () => {
    (getOfflineSessionUserId as jest.Mock).mockReturnValue('u1');
    (getOfflineQrPasses as jest.Mock).mockResolvedValue([{ passId: 'p1' }]);
    setOnline(false);
    render(<ValidacionOffline />);
    await waitFor(() => expect(screen.getByTestId('hu8-paso-1')).toHaveAttribute('data-estado', 'ok'));
    expect(screen.getByTestId('hu8-paso-2')).toHaveAttribute('data-estado', 'ok');
  });

  it('los navegadores no se muestran aprobados mientras no se registre la prueba E2E', () => {
    render(<ValidacionOffline />);
    expect(screen.queryByText('✔ Aprobado')).not.toBeInTheDocument();
    expect(screen.getAllByText('Pendiente').length).toBeGreaterThanOrEqual(2);
  });
});
