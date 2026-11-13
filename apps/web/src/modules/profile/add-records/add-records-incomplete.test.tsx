import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';

import type { DraftRecord } from '@/modules/profile/state/drafts-store';
import { ProfileStoreProvider } from '@/modules/profile/state/profile-store';
import type { ProfileRecords } from '@/modules/profile/types/profile-record';

import { AddRecordsScreen } from './add-records-screen';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

const SIN_REGISTROS: ProfileRecords = { education: [], experience: [], certification: [] };

const BORRADORES: DraftRecord[] = [
  {
    id: 'b1',
    section: 'education',
    data: { institucion: 'UMSS', titulo: 'Ingeniería de Sistemas', anioEgreso: '2018', grado: 'Licenciatura' },
  },
  {
    id: 'b2',
    section: 'education',
    data: { institucion: 'UCB', titulo: 'Maestría en Datos', anioEgreso: '2021', grado: 'Maestría' },
  },
];

function renderScreen() {
  render(
    <ProfileStoreProvider initialRecords={SIN_REGISTROS}>
      <AddRecordsScreen initialDrafts={BORRADORES} />
    </ProfileStoreProvider>,
  );
}

function apartadoFormacion() {
  return screen.getByRole('region', { name: /formación académica/i });
}

function borradores() {
  return screen.getByRole('complementary', { name: 'Borradores' });
}

describe('Borrador incompleto (HU-14, T14.1)', () => {
  it('al pulsar «Editar» sube lo escrito a medias con la etiqueta «borrador incompleto»', () => {
    renderScreen();
    fireEvent.change(within(apartadoFormacion()).getByLabelText('Institución'), { target: { value: 'UPB' } });
    fireEvent.click(within(borradores()).getByRole('button', { name: 'Editar Ingeniería de Sistemas' }));

    expect(within(borradores()).getByText('borrador incompleto')).toBeInTheDocument();
    expect(within(borradores()).getAllByRole('listitem')).toHaveLength(3);
    // El formulario queda con el borrador elegido
    expect(within(apartadoFormacion()).getByLabelText('Institución')).toHaveValue('UMSS');
  });

  it('solo hay uno incompleto por apartado: el nuevo reemplaza al anterior', () => {
    renderScreen();
    fireEvent.change(within(apartadoFormacion()).getByLabelText('Institución'), { target: { value: 'UPB' } });
    fireEvent.click(within(borradores()).getByRole('button', { name: 'Editar Ingeniería de Sistemas' }));
    // Se guarda el borrador editado y se empieza otro a medias
    fireEvent.click(within(apartadoFormacion()).getByRole('button', { name: /guardar en borrador/i }));
    fireEvent.change(within(apartadoFormacion()).getByLabelText('Título'), { target: { value: 'Derecho' } });
    fireEvent.click(within(borradores()).getByRole('button', { name: 'Editar Maestría en Datos' }));

    expect(within(borradores()).getAllByText('borrador incompleto')).toHaveLength(1);
    expect(within(borradores()).getByText('Derecho')).toBeInTheDocument();
    expect(within(borradores()).queryByText(/UPB/)).not.toBeInTheDocument();
    expect(within(borradores()).getAllByRole('listitem')).toHaveLength(3);
  });

  it('con el formulario vacío no sube nada', () => {
    renderScreen();
    fireEvent.click(within(borradores()).getByRole('button', { name: 'Editar Ingeniería de Sistemas' }));
    expect(within(borradores()).queryByText('borrador incompleto')).not.toBeInTheDocument();
    expect(within(borradores()).getAllByRole('listitem')).toHaveLength(2);
  });
});
