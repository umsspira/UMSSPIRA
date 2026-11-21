import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ConfiguracionPage from './page';
import { getOfflineQrPasses } from '@/features/event-passes/offline/offline-qr-storage';
import { getOfflineSessionUserId } from '@/features/event-passes/offline/offline-session';

jest.mock('@/features/event-passes/offline/offline-qr-storage', () => ({ getOfflineQrPasses: jest.fn() }));
jest.mock('@/features/event-passes/offline/offline-session', () => ({ getOfflineSessionUserId: jest.fn() }));
jest.mock('../../../hooks/useServiceWorkerUpdate', () => ({
  useServiceWorkerUpdate: () => ({ updateAvailable: false, applyUpdate: jest.fn(), dismissUpdate: jest.fn() }),
}));

const setOnline = (value: boolean) => Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });

function mockBrowser({ guardadas }: { guardadas: string[] }) {
  Object.defineProperty(window, 'caches', {
    configurable: true,
    value: {
      keys: jest.fn().mockResolvedValue(['umsspira-core-portal-v1.0.1']),
      match: jest.fn(async (ruta: string) => (guardadas.includes(ruta) ? {} : undefined)),
    },
  });
  Object.defineProperty(window.navigator, 'serviceWorker', {
    configurable: true,
    value: {
      controller: {},
      getRegistrations: jest.fn().mockResolvedValue([{ active: {} }]),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    },
  });
  (global as unknown as { fetch: jest.Mock }).fetch = jest.fn().mockResolvedValue({ ok: true });
}

const TODAS = ['/events/catalog/passes', '/portal/eventos', '/portal/configuracion'];

beforeEach(() => {
  jest.resetAllMocks();
  (getOfflineSessionUserId as jest.Mock).mockReturnValue('u1');
  (getOfflineQrPasses as jest.Mock).mockResolvedValue([{ passId: 'p1' }]);
  setOnline(true);
});

describe('Configuración PWA', () => {
  it('con todo guardado no muestra el error de «página de respaldo no está en caché»', async () => {
    mockBrowser({ guardadas: TODAS });
    render(<ConfiguracionPage />);
    await waitFor(() => expect(screen.getByTestId('config-estado')).toHaveAttribute('data-guardado', 'ok'));
    expect(screen.queryByText(/No está en caché/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('config-fila-respaldo')).toHaveAttribute('data-estado', 'ok');
  });

  it('sin conexión con todo guardado muestra «Sin conexión» y que no hubo errores', async () => {
    mockBrowser({ guardadas: TODAS });
    setOnline(false);
    render(<ConfiguracionPage />);
    await waitFor(() => expect(screen.getByTestId('config-estado')).toHaveAttribute('data-guardado', 'ok'));
    expect(screen.getByTestId('config-estado')).toHaveAttribute('data-modo', 'sin-conexion');
    expect(screen.getByTestId('config-estado-titulo')).toHaveTextContent('Sin conexión');
    expect(screen.getByText(/No hubo ningún error/i)).toBeInTheDocument();
  });

  it('si falta guardar algo lo dice (no afirma que todo está bien)', async () => {
    mockBrowser({ guardadas: ['/portal/eventos'] });
    render(<ConfiguracionPage />);
    await waitFor(() => expect(screen.getByTestId('config-estado')).toHaveAttribute('data-guardado', 'incompleto'));
    expect(screen.getByTestId('config-fila-qr-pantalla')).toHaveAttribute('data-estado', 'falta');
    expect(screen.getByText(/Falta guardar/i)).toBeInTheDocument();
  });

  it('no tener QR guardados no cuenta como error', async () => {
    mockBrowser({ guardadas: TODAS });
    (getOfflineQrPasses as jest.Mock).mockResolvedValue([]);
    render(<ConfiguracionPage />);
    await waitFor(() => expect(screen.getByTestId('config-estado')).toHaveAttribute('data-guardado', 'ok'));
    expect(screen.getByTestId('config-fila-qr')).toHaveAttribute('data-estado', 'info');
  });

  it('muestra las tarjetas de la HU08 y se pueden plegar', async () => {
    mockBrowser({ guardadas: TODAS });
    render(<ConfiguracionPage />);
    expect(screen.getByRole('heading', { name: 'Flujo en Modo Avión' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Auditoría y navegadores' })).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('config-validacion-toggle'));
    expect(screen.queryByRole('heading', { name: 'Flujo en Modo Avión' })).not.toBeInTheDocument();
  });

  it('sin conexión las tarjetas de la HU08 empiezan plegadas', async () => {
    mockBrowser({ guardadas: TODAS });
    setOnline(false);
    render(<ConfiguracionPage />);
    await waitFor(() => expect(screen.getByTestId('config-estado')).toHaveAttribute('data-modo', 'sin-conexion'));
    expect(screen.queryByRole('heading', { name: 'Flujo en Modo Avión' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('config-validacion-toggle'));
    expect(screen.getByRole('heading', { name: 'Flujo en Modo Avión' })).toBeInTheDocument();
  });
});
<<<<<<< HEAD

=======
>>>>>>> c1eba0aa97bb678662ac6c48cdda67cce95cf2db
