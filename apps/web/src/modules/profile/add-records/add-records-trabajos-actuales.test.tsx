import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

import type { DraftRecord } from '@/modules/profile/state/drafts-store';
import { ProfileStoreProvider } from '@/modules/profile/state/profile-store';
import type { ExperienceRecord, ProfileRecords } from '@/modules/profile/types/profile-record';

import { AddRecordsScreen } from './add-records-screen';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

function trabajo(id: string, endDate: string): ExperienceRecord {
  return { id, ownerId: 'titulado-1', company: `Empresa ${id}`, position: 'Desarrollador', startDate: '2023-01-01', endDate };
}

function renderScreen(experience: ExperienceRecord[], initialDrafts: DraftRecord[] = []) {
  const records: ProfileRecords = { education: [], experience, certification: [], project: [] };
  render(
    <ProfileStoreProvider initialRecords={records}>
      <AddRecordsScreen initialDrafts={initialDrafts} />
    </ProfileStoreProvider>,
  );
}

const casillaActual = () => screen.getByRole('checkbox', { name: /actualmente trabajo aquí/i });

describe('Agregar registros · máximo de 2 trabajos actuales (HU-21 CA-09)', () => {
  it('con 2 trabajos actuales guardados no se puede marcar un tercero', () => {
    renderScreen([trabajo('e1', ''), trabajo('e2', '')]);
    expect(casillaActual()).toBeDisabled();
    expect(screen.getByText('Ya tienes dos trabajos actuales')).toBeInTheDocument();
  });

  it('cuenta también los trabajos actuales que están en borrador', () => {
    renderScreen([trabajo('e1', '')], [
      { id: 'borrador-1', section: 'experience', data: { empresa: 'Jalasoft', cargo: 'QA', fechaInicio: '2024-02-01' } },
    ]);
    expect(casillaActual()).toBeDisabled();
  });

  it('los trabajos terminados no cuentan y la casilla sigue disponible', () => {
    renderScreen([trabajo('e1', ''), trabajo('e2', '2024-06-30')]);
    expect(casillaActual()).toBeEnabled();
  });

  it('no lista en el formulario las experiencias ya guardadas', () => {
    renderScreen([trabajo('e1', '')]);
    expect(screen.queryByText('Empresa e1')).not.toBeInTheDocument();
  });
});
