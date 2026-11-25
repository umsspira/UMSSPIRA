import { render, screen } from '@testing-library/react';
import { PortalSettingsShortcut } from './portal-settings-shortcut';

let mockPathname = '/portal';
let mockToken: string | null = null;
let mockRole: string | null = null;
let mockOfflineValid = false;

jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }));
jest.mock('@/modules/auth/frontend/store', () => ({ useAuthStore: () => ({ accessToken: mockToken, role: mockRole }) }));
jest.mock('@/features/event-passes/offline/offline-session', () => ({ isOfflineSessionValid: () => mockOfflineValid }));

const setOnline = (value: boolean) => Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });

beforeEach(() => {
  setOnline(true);
  mockPathname = '/portal';
  mockToken = null;
  mockRole = null;
  mockOfflineValid = false;
});

describe('PortalSettingsShortcut', () => {
  it('no aparece para un visitante sin sesión', () => {
    render(<PortalSettingsShortcut />);
    expect(screen.queryByTestId('portal-config-button')).not.toBeInTheDocument();
  });

  it('aparece con sesión iniciada, con su nombre accesible y apuntando a la configuración', () => {
    mockToken = 'token';
    render(<PortalSettingsShortcut />);
    const link = screen.getByRole('link', { name: 'Abrir configuración de la aplicación' });
    expect(link).toHaveAttribute('href', '/portal/configuracion');
  });

  it('no aparece para empresa ni administrador, solo para el titulado', () => {
    mockToken = 'token';
    for (const role of ['empresa', 'administrador']) {
      mockRole = role;
      const { unmount } = render(<PortalSettingsShortcut />);
      expect(screen.queryByTestId('portal-config-button')).not.toBeInTheDocument();
      unmount();
    }
    mockRole = 'titulado';
    render(<PortalSettingsShortcut />);
    expect(screen.getByTestId('portal-config-button')).toBeInTheDocument();
  });

  it('con conexión una marca offline vieja NO basta: un visitante no ve el botón', () => {
    mockOfflineValid = true;
    render(<PortalSettingsShortcut />);
    expect(screen.queryByTestId('portal-config-button')).not.toBeInTheDocument();
  });

  it('aparece sin conexión mientras la sesión offline siga vigente', () => {
    setOnline(false);
    mockOfflineValid = true;
    render(<PortalSettingsShortcut />);
    expect(screen.getByTestId('portal-config-button')).toBeInTheDocument();
  });

  it('no aparece en la configuración, la página institucional ni el inicio de sesión', () => {
    mockToken = 'token';
    for (const path of ['/portal/configuracion', '/portal/institucional', '/login', '/register']) {
      mockPathname = path;
      const { unmount } = render(<PortalSettingsShortcut />);
      expect(screen.queryByTestId('portal-config-button')).not.toBeInTheDocument();
      unmount();
    }
  });
});
