import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

import { ProfileRecordsManager } from '@/modules/profile/components/profile-records-manager';
import { obtenerResumenPerfil } from '@/modules/profile/services/perfil-api';
import { ProfileStoreProvider } from '@/modules/profile/state/profile-store';
import { SessionError } from '@/shared/services/auth-session';

jest.mock('@/modules/profile/services/perfil-api', () => ({
  ...jest.requireActual('@/modules/profile/services/perfil-api'),
  obtenerResumenPerfil: jest.fn(),
}));

const obtenerResumenPerfilMock = obtenerResumenPerfil as jest.MockedFunction<typeof obtenerResumenPerfil>;

function renderSinDatosIniciales() {
  render(
    <ProfileStoreProvider>
      <ProfileRecordsManager />
    </ProfileStoreProvider>,
  );
}

describe('Mis registros sin sesión (Observación 2)', () => {
  beforeEach(() => obtenerResumenPerfilMock.mockReset());

  it('sin sesión pide iniciar sesión y no muestra foto, «Agregar registros» ni pestañas', async () => {
    obtenerResumenPerfilMock.mockRejectedValue(new SessionError(401, 'Inicia sesión para continuar'));

    renderSinDatosIniciales();

    expect(await screen.findByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('link', { name: /agregar registros/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.queryByText(/elegir archivo/i)).not.toBeInTheDocument();
  });

  it('otros errores de carga siguen mostrando «Reintentar» en la pantalla completa', async () => {
    obtenerResumenPerfilMock.mockRejectedValue(new Error('Servicio no disponible'));

    renderSinDatosIniciales();

    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Iniciar sesión' })).not.toBeInTheDocument();
  });
});
