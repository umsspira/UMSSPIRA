import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';

import { ProfileStoreProvider } from '@/modules/profile/state/profile-store';
import { PROFILE_RECORDS_MOCK, profileHeader } from '@/modules/profile/testing/profile-fixtures';
import ProfileSummary from '@/modules/profile/ver/profile-summary';
import { NAVBAR_ACCOUNT_LINKS, NAVBAR_SECTIONS } from '@/shared/components/navbar/navigation';
import { clearAccessToken, setAccessToken } from '@/shared/services/auth-session';

const replaceMock = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: replaceMock }),
}));

// jsdom no trae fetch: se simula con la forma mínima que usa apiFetch
const fetchMock = jest.fn();

const emptyProfile = {
  titulado: { id: 'titulado-1', nombre: 'Ana Rojas', carrera: null, promocion: null },
  formacionAcademica: { registros: [] },
  experienciaLaboral: { registros: [] },
  certificaciones: { registros: [] },
};

beforeEach(() => {
  replaceMock.mockReset();
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
  setAccessToken('token-de-prueba');
});

afterEach(() => {
  clearAccessToken();
});

describe('ProfileSummary - perfil vacío lleva a Completar perfil (HU-12)', () => {
  it('con el perfil vacío redirige a /profile/completar sin mostrar el resumen', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: emptyProfile }) });

    render(
      <ProfileStoreProvider>
        <ProfileSummary />
      </ProfileStoreProvider>,
    );

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/profile/completar'));
    expect(screen.getByRole('status')).toHaveTextContent('Cargando tu perfil…');
    expect(screen.queryByRole('heading', { name: 'Ana Rojas' })).not.toBeInTheDocument();
  });

  it('con solo la descripción profesional muestra el resumen', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: { ...emptyProfile, descripcionProfesional: 'Ingeniero de sistemas.' } }),
    });

    render(
      <ProfileStoreProvider>
        <ProfileSummary />
      </ProfileStoreProvider>,
    );

    expect(await screen.findByRole('heading', { name: 'Ana Rojas' })).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('con al menos un registro muestra el resumen', () => {
    render(
      <ProfileStoreProvider initialRecords={PROFILE_RECORDS_MOCK} initialHeader={profileHeader}>
        <ProfileSummary />
      </ProfileStoreProvider>,
    );

    expect(screen.getByRole('heading', { name: /Carlos Mendoza/i })).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('mientras el perfil carga muestra el estado de carga y no redirige', () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));

    render(
      <ProfileStoreProvider>
        <ProfileSummary />
      </ProfileStoreProvider>,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Cargando tu perfil…');
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('si falla la carga muestra el error con «Reintentar» y no redirige', async () => {
    fetchMock.mockRejectedValue(new Error('Sin conexión'));

    render(
      <ProfileStoreProvider>
        <ProfileSummary />
      </ProfileStoreProvider>,
    );

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('«Mi perfil profesional» de los menús lleva a /profile, donde se aplica la regla', () => {
    const links = [...NAVBAR_SECTIONS.flatMap((section) => section.items), ...NAVBAR_ACCOUNT_LINKS].filter(
      (link) => link.label === 'Mi perfil profesional',
    );

    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) => expect(link.href).toBe('/profile'));
  });
});
