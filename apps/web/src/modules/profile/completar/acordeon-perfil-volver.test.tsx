import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

import { ProfileStoreProvider } from '@/modules/profile/state/profile-store';
import type { ProfileRecords } from '@/modules/profile/types/profile-record';

import { AcordeonPerfil } from './acordeon-perfil';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const SIN_REGISTROS: ProfileRecords = { education: [], experience: [], certification: [] };

function renderAcordeon(returnTo?: string) {
  render(
    <ProfileStoreProvider initialRecords={SIN_REGISTROS}>
      <AcordeonPerfil returnTo={returnTo} />
    </ProfileStoreProvider>,
  );
}

describe('Completar perfil · botón Volver (HU-11)', () => {
  it('sin pantalla de origen vuelve a Mi perfil', () => {
    renderAcordeon();

    const back = screen.getByRole('link', { name: 'Volver a Mi perfil' });
    expect(back).toHaveAttribute('href', '/profile');
    expect(back).toHaveClass('min-h-[44px]');
  });

  it('si se llegó desde Mi afinidad conserva el regreso', () => {
    renderAcordeon('/afinidad');

    expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/afinidad');
  });
});
