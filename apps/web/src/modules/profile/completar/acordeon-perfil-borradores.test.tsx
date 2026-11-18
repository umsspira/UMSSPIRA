import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ProfileStoreProvider } from '@/modules/profile/state/profile-store';
import type { ProfileRecords } from '@/modules/profile/types/profile-record';
import { DRAFTS_STORAGE_KEY, loadDrafts } from '@/modules/profile/utils/drafts-storage';

import { AcordeonPerfil, BORRADORES_ROUTE, MENSAJE_BORRADOR_VACIO } from './acordeon-perfil';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

const SIN_REGISTROS: ProfileRecords = { education: [], experience: [], certification: [], project: [] };

function renderAcordeon() {
  return render(
    <ProfileStoreProvider initialRecords={SIN_REGISTROS}>
      <AcordeonPerfil />
    </ProfileStoreProvider>,
  );
}

describe('Completar perfil · borradores (sugerencias del equipo)', () => {
  beforeEach(() => window.localStorage.clear());

  it('sin datos escritos no deja guardar el borrador y explica por qué', () => {
    renderAcordeon();

    expect(screen.getByRole('button', { name: 'Guardar borrador' })).toBeDisabled();
    expect(screen.getByText(MENSAJE_BORRADOR_VACIO)).toBeInTheDocument();
  });

  it('guarda lo escrito como borrador, lo conserva al recargar y lo muestra en «Ver borradores»', async () => {
    const { unmount } = renderAcordeon();

    fireEvent.change(screen.getByLabelText('Institución'), { target: { value: 'UMSS' } });
    const guardar = screen.getByRole('button', { name: 'Guardar borrador' });
    expect(guardar).toBeEnabled();
    fireEvent.click(guardar);

    expect(screen.getByRole('status')).toHaveTextContent('Borrador guardado');
    await waitFor(() => expect(window.localStorage.getItem(DRAFTS_STORAGE_KEY)).not.toBeNull());
    const [borrador] = loadDrafts();
    expect(borrador).toMatchObject({ section: 'education', isIncomplete: true, data: { institucion: 'UMSS' } });
    expect(screen.getByRole('link', { name: /Ver borradores/ })).toHaveAttribute('href', BORRADORES_ROUTE);

    // Al volver a entrar (recargar) el formulario arranca con lo guardado
    unmount();
    await act(async () => {
      renderAcordeon();
    });
    expect(screen.getByLabelText('Institución')).toHaveValue('UMSS');
    expect(screen.getByRole('link', { name: /Ver borradores/ })).toHaveTextContent('1');
  });
});
