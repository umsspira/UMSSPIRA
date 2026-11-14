import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AccreditationHeatmapPage from './page';
import { authenticatedFetch } from '@/shared/services/auth-session';
import { notifySessionExpired } from '@/modules/auth/frontend/services/session-expired';

jest.mock('@/shared/services/auth-session', () => {
  class SessionError extends Error {
    constructor(public status: number, message: string) { super(message); }
  }
  return { authenticatedFetch: jest.fn(), SessionError };
});

// Los filtros de la T3.2 leen y escriben la URL con el router de Next.
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  usePathname: () => '/reports/acreditacion',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/modules/auth/frontend/services/session-expired', () => ({
  notifySessionExpired: jest.fn(),
}));

jest.mock('@/modules/reports/services/competency-heatmap.adapter', () => ({
  loadCompetencyHeatmap: jest.fn(),
}));

jest.mock('@/modules/reports/components/competency-heatmap', () => ({
  ConnectedCompetencyHeatmap: ({ careerName, load }: { careerName: string; load: unknown }) => (
    <div data-testid="connected-heatmap">{careerName} / {typeof load}</div>
  ),
}));

const mockedFetch = authenticatedFetch as jest.Mock;
const ok = (data: unknown) => ({ ok: true, status: 200, json: async () => ({ data }) });

describe('HU-EP09-06: integración del mapa con la sesión administrativa', () => {
  beforeEach(() => jest.clearAllMocks());

  it('muestra la carrera autorizada y monta el loader real', async () => {
    mockedFetch.mockResolvedValueOnce(ok({
      role: 'administrador', scopes: { careerIds: ['career-1'] },
    })).mockResolvedValueOnce(ok([{ id: 'career-1', nombre: 'Ingeniería de Sistemas' }]));

    render(<AccreditationHeatmapPage />);
    expect(await screen.findByTestId('connected-heatmap')).toHaveTextContent('Ingeniería de Sistemas / function');
    expect(mockedFetch).toHaveBeenNthCalledWith(1, '/api/v1/auth/me', expect.objectContaining({ cache: 'no-store' }));
    expect(mockedFetch).toHaveBeenNthCalledWith(2, '/api/v1/registrations/careers', expect.objectContaining({ cache: 'no-store' }));
  });

  it('enlaza las pestañas antiguas sin cambiar sus componentes', async () => {
    mockedFetch.mockResolvedValueOnce(ok({
      role: 'administrador', scopes: { careerIds: ['career-1'] },
    })).mockResolvedValueOnce(ok([{ id: 'career-1', nombre: 'Ingeniería de Sistemas' }]));
    render(<AccreditationHeatmapPage />);
    await screen.findByTestId('connected-heatmap');
    const tab = screen.getByRole('link', { name: 'Titulados' });
    tab.addEventListener('click', (event) => event.preventDefault());
    fireEvent.click(tab);
    expect(window.localStorage.getItem('umsspira:reports-active-tab')).toBe('graduates');
  });

  it('no monta el mapa si el administrador no tiene carreras autorizadas', async () => {
    mockedFetch.mockResolvedValueOnce(ok({ role: 'administrador', scopes: { careerIds: [] } }));
    render(<AccreditationHeatmapPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No hay carreras autorizadas');
    expect(screen.queryByTestId('connected-heatmap')).not.toBeInTheDocument();
  });

  it('no muestra datos si la identidad devuelve un 401', async () => {
    mockedFetch.mockResolvedValueOnce({ ok: false, status: 401 });
    render(<AccreditationHeatmapPage />);
    await waitFor(() => expect(notifySessionExpired).toHaveBeenCalled());
    expect(screen.queryByTestId('connected-heatmap')).not.toBeInTheDocument();
  });

  it('puede mostrar el mapa aun si falla la carga del nombre de carrera', async () => {
    mockedFetch.mockResolvedValueOnce(ok({
      role: 'administrador', scopes: { careerIds: ['career-1'] },
    })).mockRejectedValueOnce(new Error('Catálogo no disponible'));
    render(<AccreditationHeatmapPage />);
    expect(await screen.findByTestId('connected-heatmap')).toHaveTextContent('Carrera asignada (nombre no disponible)');
  });
});
