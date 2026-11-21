import { fireEvent, render, screen } from '@testing-library/react';
import MisVacantesPage from './page';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('@/shared/services/auth-session', () => ({
  getAccessToken: () => 'token-de-prueba',
}));

describe('Mis vacantes · enlace Ayuda (T20.2)', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('abre la guía del reclutador y conserva publicación, búsqueda y acciones existentes', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        { id: 'vacante-prueba', titulo: 'Desarrollador', estado: 'PUBLICADA', modalidad: 'REMOTO', nivel_experiencia: 'JUNIOR' },
        { id: 'otra-vacante', titulo: 'Analista', estado: 'PAUSADA', modalidad: 'PRESENCIAL', nivel_experiencia: 'SENIOR' },
      ],
    });
    render(<MisVacantesPage />);

    expect(await screen.findByRole('link', { name: 'Ayuda' })).toHaveAttribute(
      'href', '/ayuda/bolsa-de-trabajo?tab=reclutador',
    );
    expect(screen.getByRole('link', { name: 'Publicar vacante' })).toHaveAttribute('href', '/empresa/vacantes/publicar');
    const search = screen.getByPlaceholderText('Buscar por título...');
    fireEvent.change(search, { target: { value: 'Desarrollador' } });
    // La vacante puede aparecer en la tabla y en su tarjeta móvil: basta con que esté visible.
    expect(screen.getAllByText('Desarrollador')[0]).toBeVisible();
    expect(screen.queryByText('Analista')).not.toBeInTheDocument();

    expect(screen.getAllByRole('button', { name: 'Editar' }).length).toBeGreaterThan(0);
    expect(global.fetch).toHaveBeenCalledWith('/api/v1/vacantes/mis-vacantes', expect.objectContaining({ method: 'GET' }));
  });
});
