import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { crearFormacion } from '@/modules/profile/services/perfil-api';
import type { DraftRecord } from '@/modules/profile/state/drafts-store';
import { ProfileStoreProvider } from '@/modules/profile/state/profile-store';
import type { ProfileRecords } from '@/modules/profile/types/profile-record';

import { AddRecordsScreen } from './add-records-screen';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('./after-batch-save', () => ({ afterBatchSave: jest.fn() }));

jest.mock('@/modules/profile/services/perfil-api', () => ({
  crearFormacion: jest.fn(),
  crearExperiencia: jest.fn(),
  crearCertificacion: jest.fn(),
  subirRespaldo: jest.fn(),
}));

const SIN_REGISTROS: ProfileRecords = { education: [], experience: [], certification: [], project: [] };
const MOTIVO = 'Termina o quita el borrador incompleto para guardar tu perfil.';

const BORRADORES: DraftRecord[] = [
  {
    id: 'b1',
    section: 'education',
    data: { institucion: 'UMSS', titulo: 'Ingeniería de Sistemas', anioEgreso: '2018', grado: 'Licenciatura' },
  },
  {
    id: 'b2',
    section: 'education',
    data: { institucion: 'UPB', titulo: 'Derecho', anioEgreso: '', grado: '' },
    isIncomplete: true,
  },
];

function renderScreen() {
  render(
    <ProfileStoreProvider initialRecords={SIN_REGISTROS}>
      <AddRecordsScreen initialDrafts={BORRADORES} />
    </ProfileStoreProvider>,
  );
}

const guardarPerfil = () => screen.getByRole('button', { name: /guardar perfil profesional/i });
const borradores = () => screen.getByRole('complementary', { name: 'Borradores' });

beforeEach(() => jest.clearAllMocks());

describe('Guardar perfil con borrador incompleto (HU-14, T14.5)', () => {
  it('deshabilita «Guardar perfil profesional» y muestra el motivo', () => {
    renderScreen();
    expect(guardarPerfil()).toBeDisabled();
    expect(guardarPerfil()).toHaveAccessibleDescription(MOTIVO);
    expect(screen.getByText(MOTIVO)).toBeVisible();
  });

  it('no manda nada a la API mientras haya un borrador incompleto', () => {
    renderScreen();
    fireEvent.click(guardarPerfil());
    expect(crearFormacion).not.toHaveBeenCalled();
  });

  it('se vuelve a habilitar al quitar el borrador incompleto', () => {
    renderScreen();
    fireEvent.click(within(borradores()).getByRole('button', { name: 'Quitar Derecho' }));
    expect(guardarPerfil()).toBeEnabled();
    expect(screen.queryByText(MOTIVO)).not.toBeInTheDocument();
  });
});
