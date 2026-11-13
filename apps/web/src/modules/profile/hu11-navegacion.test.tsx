import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';

import { AcordeonPerfil } from '@/modules/profile/completar/acordeon-perfil';
import { EditRecordLayout } from '@/modules/profile/components/edit-record-layout';
import { ProfileRecordsManager } from '@/modules/profile/components/profile-records-manager';
import { ProfileStoreProvider } from '@/modules/profile/state/profile-store';
import { PROFILE_RECORDS_MOCK } from '@/modules/profile/testing/profile-fixtures';
import type { ProfileRecords } from '@/modules/profile/types/profile-record';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const SIN_REGISTROS: ProfileRecords = { education: [], experience: [], certification: [] };

// CA-04: desde cada pantalla del perfil hay camino directo a Mi perfil, Mis registros y Mi afinidad
function expectQuickLinks(current?: string) {
  const nav = screen.getByRole('navigation', { name: 'Accesos del perfil' });
  const destinations = [
    ['Mi perfil', '/profile'],
    ['Mis registros', '/profile/records'],
    ['Mi afinidad', '/afinidad'],
  ];
  destinations.forEach(([label, href]) => {
    if (label === current) {
      expect(within(nav).getByText(label)).toHaveAttribute('aria-current', 'page');
    } else {
      expect(within(nav).getByRole('link', { name: label })).toHaveAttribute('href', href);
    }
  });
}

describe('Navegación entre pantallas del perfil (HU-11)', () => {
  it('Mis registros tiene «Volver» y los accesos, con Mis registros como pantalla actual', () => {
    render(<ProfileRecordsManager initialRecords={PROFILE_RECORDS_MOCK} />);

    expect(screen.getByRole('link', { name: 'Volver a Mi perfil' })).toBeInTheDocument();
    expectQuickLinks('Mis registros');
  });

  it('Completar perfil tiene «Volver» y los accesos', () => {
    render(
      <ProfileStoreProvider initialRecords={SIN_REGISTROS}>
        <AcordeonPerfil />
      </ProfileStoreProvider>,
    );

    expect(screen.getByRole('link', { name: 'Volver a Mi perfil' })).toBeInTheDocument();
    expectQuickLinks();
  });

  it('las pantallas de edición tienen «Volver», «Cancelar» y los accesos', () => {
    render(
      <EditRecordLayout
        title="Editar certificación"
        description=""
        number="03"
        sectionTitle="Certificaciones"
        sectionSubtitle=""
        isSaved={false}
        onSubmit={jest.fn()}
        onCancel={jest.fn()}
      >
        <p>campos</p>
      </EditRecordLayout>,
    );

    expect(screen.getByRole('button', { name: 'Volver a Mis registros' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
    expectQuickLinks();
  });
});
