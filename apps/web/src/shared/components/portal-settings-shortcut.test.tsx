import { render, screen } from '@testing-library/react';
import { PortalSettingsShortcut } from './portal-settings-shortcut';

let mockPathname = '/portal';
let mockToken: string | null = null;
let mockOfflineValid = false;

jest.mock('next/navigation', () => ({ usePathname: () => mockPathname }));
jest.mock('@/modules/auth/frontend/store', () => ({ useAuthStore: () => ({ accessToken: mockToken }) }));
jest.mock('@/features/event-passes/offline/offline-session', () => ({ isOfflineSessionValid: () => mockOfflineValid }));

beforeEach(() => {
  mockPathname = '/portal';
  mockToken = null;
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

  it('aparece sin conexión mientras la sesión offline siga vigente', () => {
    mockOfflineValid = true;
    render(<PortalSettingsShortcut />);
    expect(screen.getByTestId('portal-config-button')).toBeInTheDocument();
  });

  it('no aparece en la propia configuración ni en el inicio de sesión', () => {
    mockToken = 'token';
    for (const path of ['/portal/configuracion', '/login', '/register']) {
      mockPathname = path;
      const { unmount } = render(<PortalSettingsShortcut />);
      expect(screen.queryByTestId('portal-config-button')).not.toBeInTheDocument();
      unmount();
    }
  });
});
