import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { crearExperiencia, crearFormacion } from '@/modules/profile/services/perfil-api';
import type { DraftRecord } from '@/modules/profile/state/drafts-store';
import { ProfileStoreProvider } from '@/modules/profile/state/profile-store';
import type { ProfileRecords } from '@/modules/profile/types/profile-record';
import { DRAFTS_STORAGE_KEY } from '@/modules/profile/utils/drafts-storage';

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

const BORRADORES: DraftRecord[] = [
  {
    id: 'borrador-1',
    section: 'education',
    data: { institucion: 'UMSS', titulo: 'Ingeniería de Sistemas', anioEgreso: '2018', grado: 'Licenciatura' },
  },
  { id: 'borrador-2', section: 'experience', data: { empresa: 'NTT DATA', cargo: 'Tech Lead', fechaInicio: '2023-07-01' } },
];

// Sin initialDrafts, para que la pantalla restaure lo guardado en el navegador como en la app real
function renderScreen() {
  window.localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(BORRADORES));
  render(
    <ProfileStoreProvider initialRecords={SIN_REGISTROS}>
      <AddRecordsScreen />
    </ProfileStoreProvider>,
  );
}

const borradores = () => screen.getByRole('complementary', { name: 'Borradores' });
const guardados = (): DraftRecord[] => JSON.parse(window.localStorage.getItem(DRAFTS_STORAGE_KEY) ?? '[]');

describe('Borradores provisionales (HU-14, T14.4)', () => {
  it('muestra el aviso con el texto exacto junto a los borradores', () => {
    renderScreen();
    expect(within(borradores()).getByRole('note')).toHaveTextContent(
      /^Tus borradores son provisionales y solo se guardan en este navegador$/,
    );
  });

  it('al quitar un borrador también se borra del navegador', async () => {
    renderScreen();
    fireEvent.click(await within(borradores()).findByRole('button', { name: 'Quitar Ingeniería de Sistemas' }));
    await waitFor(() => expect(guardados().map((draft) => draft.id)).toEqual(['borrador-2']));
  });

  it('al guardar el perfil profesional se limpian del navegador', async () => {
    (crearFormacion as jest.Mock).mockResolvedValue({ id: 'f1' });
    (crearExperiencia as jest.Mock).mockResolvedValue({ id: 'e1' });
    renderScreen();
    await within(borradores()).findByRole('button', { name: 'Quitar Tech Lead' });
    fireEvent.click(screen.getByRole('button', { name: /guardar perfil profesional/i }));
    await waitFor(() => expect(window.localStorage.getItem(DRAFTS_STORAGE_KEY)).toBeNull());
  });
});
