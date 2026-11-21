import { fireEvent, render, screen } from '@testing-library/react';
import OfflinePage from './page';

const setOnline = (value: boolean) => Object.defineProperty(window.navigator, 'onLine', { value, configurable: true });

beforeEach(() => {
  window.localStorage.clear();
  window.history.pushState({}, '', '/portal/institucional');
  setOnline(true);
});

describe('HU14 · página de respaldo', () => {
  it('CA-01/CA-04: explica que la pantalla no se guardó y ofrece lo disponible sin conexión', () => {
    render(<OfflinePage />);
    expect(screen.getByTestId('offline-title')).toHaveTextContent('Sin conexión a Internet');
    expect(screen.getByText(/todavía no se guardó en tu dispositivo/i)).toBeInTheDocument();
    expect(screen.getByTestId('offline-link-passes')).toHaveTextContent('Mis códigos QR');
    expect(screen.getByTestId('offline-link-events')).toHaveTextContent('Eventos visitados');
    expect(screen.getByTestId('offline-link-settings')).toHaveTextContent('Configuración');
  });

  it('HU09 CA-02: el acceso a Mis códigos QR es destacado y va antes que los otros accesos', () => {
    render(<OfflinePage />);
    const hero = screen.getByTestId('offline-link-passes');
    // Destacado: enlace a la ruta de HU09 con el estilo promocionado (fondo oscuro).
    expect(hero).toHaveAttribute('href', '/mis-pases');
    expect(hero.className).toContain('bg-[#1B2632]');
    // Aparece en el DOM antes que los accesos secundarios (sin recorrer el menú).
    const links = Array.from(hero.parentElement!.querySelectorAll('a'));
    expect(links.indexOf(hero as HTMLAnchorElement)).toBe(0);
  });

  it('CA-03: sin conexión, Reintentar avisa y no consulta la red ni recarga', async () => {
    setOnline(false);
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<OfflinePage />);
    fireEvent.click(screen.getByTestId('offline-retry'));
    expect(await screen.findByText('Todavía no hay conexión')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('offline-retry')).toBeEnabled();
  });

  it('CA-06: en una ruta privada y sin sesión pide iniciar sesión', () => {
    window.history.pushState({}, '', '/portal/mensajes');
    render(<OfflinePage />);
    expect(screen.getByTestId('offline-title')).toHaveTextContent('Inicia sesión para continuar');
    expect(screen.getByTestId('offline-login')).toHaveAttribute('href', '/login');
  });

  it('CA-07: con sesión vigente mantiene la barra de la aplicación con el usuario', async () => {
    window.history.pushState({}, '', '/portal/eventos');
    window.localStorage.setItem('umsspira.offline.session-validation', JSON.stringify({ userId: 'u1', validatedAt: Date.now() }));
    window.localStorage.setItem('umsspira.offline.nav-user', JSON.stringify({ name: 'admin', initials: 'AD', role: 'titulado' }));
    render(<OfflinePage />);
    expect(await screen.findByText('AD')).toBeInTheDocument();
    const menu = screen.getByRole('navigation', { name: /navegación principal/i });
    expect(Array.from(menu.querySelectorAll('a')).map(link => link.textContent)).toEqual(
      ['Inicio', 'Beneficios y convenios', 'Directorio', 'Bolsa de trabajo', 'Mentorías', 'Eventos'],
    );
    expect(screen.getByText('Eventos', { selector: 'a' })).toHaveAttribute('aria-current', 'page');
    expect(screen.queryByTestId('offline-login')).not.toBeInTheDocument();
  });
});
