import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';

import { ProfileStoreProvider } from '@/modules/profile/state/profile-store';
import { PROFILE_RECORDS_MOCK } from '@/modules/profile/testing/profile-fixtures';

import { AcordeonPerfil } from './acordeon-perfil';

const push = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

function renderAcordeon(returnTo?: string) {
  render(
    <ProfileStoreProvider initialRecords={PROFILE_RECORDS_MOCK}>
      <AcordeonPerfil returnTo={returnTo} />
    </ProfileStoreProvider>,
  );
}

describe('Completar perfil · ajustes de la revisión (HU-21)', () => {
  beforeEach(() => push.mockClear());

  it('CA-08: la barra lateral se titula «Tu base de datos de titulado»', () => {
    renderAcordeon();

    expect(screen.getByRole('heading', { name: 'Tu base de datos de titulado' })).toBeInTheDocument();
  });

  it('CA-02: no muestra «Información certificada directamente por el departamento de posgrado»', () => {
    renderAcordeon();

    expect(screen.queryByText(/departamento de posgrado/)).not.toBeInTheDocument();
  });

  it('CA-01: «Guardar perfil profesional» vuelve al resumen con el aviso de guardado', () => {
    renderAcordeon();

    fireEvent.click(screen.getByRole('button', { name: 'Guardar perfil profesional' }));

    expect(push).toHaveBeenCalledWith('/profile?guardado=1');
  });

  it('con returnTo (Mi afinidad) vuelve a esa pantalla como antes', () => {
    renderAcordeon('/afinidad');

    fireEvent.click(screen.getByRole('button', { name: 'Guardar perfil profesional' }));

    expect(push).toHaveBeenCalledWith('/afinidad');
  });
});
