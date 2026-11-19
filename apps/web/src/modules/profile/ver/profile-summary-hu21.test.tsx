import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';

import { PROFILE_RECORDS_MOCK, profileHeader } from '@/modules/profile/testing/profile-fixtures';
import { ProfileStoreProvider } from '@/modules/profile/state/profile-store';
import ProfileSummary from '@/modules/profile/ver/profile-summary';

const replace = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace }),
}));

function renderSummary(showSavedNotice?: boolean) {
  render(
    <ProfileStoreProvider initialRecords={PROFILE_RECORDS_MOCK} initialHeader={profileHeader}>
      <ProfileSummary showSavedNotice={showSavedNotice} />
    </ProfileStoreProvider>,
  );
}

describe('ProfileSummary · ajustes de la revisión (HU-21)', () => {
  beforeEach(() => replace.mockClear());

  it('CA-01: al volver tras guardar muestra «Se guardó correctamente» y se cierra con la X', () => {
    renderSummary(true);

    // Al integrar hay otros avisos con role="status" (por ejemplo Mi afinidad, HU-17): se busca el de guardado
    expect(screen.getAllByRole('status').some((aviso) => aviso.textContent?.includes('Se guardó correctamente'))).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }));

    expect(screen.queryByText('Se guardó correctamente')).not.toBeInTheDocument();
    expect(replace).toHaveBeenCalledWith('/profile');
  });

  it('CA-01: sin venir de guardar no muestra el aviso', () => {
    renderSummary();

    expect(screen.queryByText('Se guardó correctamente')).not.toBeInTheDocument();
  });

  it('CA-02: no muestra textos, contadores ni etiquetas de validación de respaldos', () => {
    renderSummary();

    expect(screen.queryByText(/Respaldos validados/)).not.toBeInTheDocument();
    expect(screen.queryByText(/han sido validados/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Respaldo verificado|Respaldo en revisión|Sin respaldo/)).not.toBeInTheDocument();
    expect(screen.queryByText(/departamento de posgrado/)).not.toBeInTheDocument();
  });
});
