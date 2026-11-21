import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';

import { ProfileStoreProvider } from '@/modules/profile/state/profile-store';
import type { ProfileRecords } from '@/modules/profile/types/profile-record';

import { AcordeonPerfil } from './acordeon-perfil';

const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));

const SIN_REGISTROS: ProfileRecords = { education: [], experience: [], certification: [], project: [] };

function renderAcordeon(returnTo?: string) {
  render(
    <ProfileStoreProvider initialRecords={SIN_REGISTROS}>
      <AcordeonPerfil returnTo={returnTo} />
    </ProfileStoreProvider>,
  );
}

describe('Completar perfil · botón Volver (HU-11)', () => {
  it('sin pantalla de origen no enlaza a /profile, que con el perfil vacío reenvía aquí (Observación 1)', () => {
    renderAcordeon();

    const back = screen.getByRole('button', { name: 'Volver' });
    expect(back).not.toHaveAttribute('href');
    expect(back).toHaveClass('min-h-[44px]');
  });

  it('si se llegó desde Mi afinidad conserva el regreso', () => {
    renderAcordeon('/afinidad');

    expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/afinidad');
  });

  it('al presionar Volver sin pantalla de origen regresa a la pantalla anterior del historial', () => {
    mockBack.mockClear();
    mockPush.mockClear();
    window.history.pushState({}, '', '/profile/records/education/1/edit');
    window.history.pushState({}, '', '/profile/completar');
    renderAcordeon();

    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalledWith('/profile');
  });
});
