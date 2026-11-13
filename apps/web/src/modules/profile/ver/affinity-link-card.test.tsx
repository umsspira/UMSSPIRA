import { render, screen } from '@testing-library/react';

import { AFFINITY_ROUTE } from '@/modules/profile/data/affinity-route';
import { fetchMiniAffinity } from '@/modules/profile/data/mini-affinity-source';
import AffinityLinkCard from './affinity-link-card';

jest.mock('@/modules/profile/data/mini-affinity-source', () => ({
  fetchMiniAffinity: jest.fn(),
}));

const fetchMiniAffinityMock = fetchMiniAffinity as jest.MockedFunction<typeof fetchMiniAffinity>;

const VALUES = [82, 64, 51, 45, 38, 30];

function mockCalculation() {
  fetchMiniAffinityMock.mockResolvedValue({ status: 'ok', values: VALUES });
}

describe('AffinityLinkCard', () => {
  beforeEach(() => {
    fetchMiniAffinityMock.mockReset();
  });

  it('muestra el título "Mi afinidad", la descripción y el botón "Ver mi afinidad"', async () => {
    mockCalculation();
    render(<AffinityLinkCard />);

    expect(screen.getByRole('heading', { name: 'Mi afinidad' })).toBeInTheDocument();
    expect(screen.getByText(/qué tan bien encaja tu perfil/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver mi afinidad' })).toBeInTheDocument();
    await screen.findByTestId('mini-radar');
  });

  
  it('muestra el mini radar con los valores del último cálculo', async () => {
    mockCalculation();
    render(<AffinityLinkCard />);

    const radar = await screen.findByRole('img', { name: /Mini radar de afinidad/ });
    expect(radar).toHaveAccessibleName(expect.stringContaining('Desarrollo de Software 82%'));
    expect(radar).toHaveAccessibleName(expect.stringContaining('Gestión TI 30%'));
  });

  
  it('toda la tarjeta lleva a /afinidad', async () => {
    mockCalculation();
    render(<AffinityLinkCard />);

    const card = screen.getByRole('region', { name: 'Mi afinidad' });
    const link = screen.getByRole('link', { name: 'Ver mi afinidad' });
    expect(AFFINITY_ROUTE).toBe('/afinidad');
    expect(link).toHaveAttribute('href', '/afinidad');
    expect(card).toHaveClass('relative');
    expect(link).toHaveClass('after:absolute', 'after:inset-0');
    // Un filtro (brightness) en el enlace encogería su "after:" al pasar el mouse
    expect(link.className).not.toMatch(/brightness|filter/);
    await screen.findByTestId('mini-radar');
  });

  
  it('dice «Actualizando tu afinidad…» mientras el cálculo no llega', () => {
    fetchMiniAffinityMock.mockReturnValue(new Promise(() => {}));
    render(<AffinityLinkCard />);

    expect(screen.getByRole('status')).toHaveTextContent('Actualizando tu afinidad…');
    expect(screen.queryByTestId('mini-radar')).not.toBeInTheDocument();
  });
});