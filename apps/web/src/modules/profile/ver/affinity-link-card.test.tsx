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

  // HU-17 CA-01
  it('muestra el mini radar con los valores del último cálculo', async () => {
    mockCalculation();
    render(<AffinityLinkCard />);

    const radar = await screen.findByRole('img', { name: /Mini radar de afinidad/ });
    expect(radar).toHaveAccessibleName(expect.stringContaining('Desarrollo de Software 82%'));
    expect(radar).toHaveAccessibleName(expect.stringContaining('Gestión TI 30%'));
  });

  it('el botón lleva a la pantalla de afinidad de la Épica 3', async () => {
    mockCalculation();
    render(<AffinityLinkCard />);

    expect(AFFINITY_ROUTE).toBe('/afinidad');
    expect(screen.getByRole('link', { name: 'Ver mi afinidad' })).toHaveAttribute('href', '/afinidad');
    await screen.findByTestId('mini-radar');
  });
});