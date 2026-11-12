import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { obtenerResumenPerfil } from '@/modules/profile/services/perfil-api';
import { ProfileStoreProvider } from '@/modules/profile/state/profile-store';
import { profileHeader } from '@/modules/profile/testing/profile-fixtures';
import type { ProfileRecords } from '@/modules/profile/types/profile-record';

import { AddRecordsScreen } from './add-records-screen';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock('@/modules/profile/services/perfil-api', () => ({
  obtenerResumenPerfil: jest.fn(),
}));

const mockObtenerResumenPerfil = obtenerResumenPerfil as jest.Mock;

const SIN_REGISTROS: ProfileRecords = { education: [], experience: [], certification: [] };

// Sin initialRecords el estado del perfil se carga desde la API (simulada aquí)
function renderFromApi() {
  return render(
    <ProfileStoreProvider>
      <AddRecordsScreen />
    </ProfileStoreProvider>,
  );
}

beforeEach(() => {
  mockObtenerResumenPerfil.mockReset();
});

describe('Agregar registros - estados (HU-13, T13.7)', () => {
  it('cargando: muestra «Cargando tu perfil…» y todavía no los formularios', () => {
    mockObtenerResumenPerfil.mockReturnValue(new Promise(() => {}));
    renderFromApi();

    expect(screen.getByRole('status')).toHaveTextContent('Cargando tu perfil…');
    expect(screen.queryByRole('region', { name: /formación académica/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /guardar perfil profesional/i })).not.toBeInTheDocument();
    // El camino de vuelta sigue disponible mientras carga
    expect(screen.getByRole('link', { name: /volver a mis registros/i })).toBeInTheDocument();
  });

  it('error: avisa con «Reintentar» y al reintentar muestra los apartados', async () => {
    mockObtenerResumenPerfil
      .mockRejectedValueOnce(new Error('Sin conexión'))
      .mockResolvedValueOnce({ header: profileHeader, records: SIN_REGISTROS, description: '' });
    renderFromApi();

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('No se pudo cargar tu perfil.');

    fireEvent.click(within(alerta).getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('region', { name: /formación académica/i })).toBeInTheDocument();
    expect(mockObtenerResumenPerfil).toHaveBeenCalledTimes(2);
  });

  it('vacío: sin borradores explica qué hacer y no deja guardar', async () => {
    mockObtenerResumenPerfil.mockResolvedValue({ header: profileHeader, records: SIN_REGISTROS, description: '' });
    renderFromApi();

    const bloque = await screen.findByRole('complementary', { name: 'Borradores' });
    expect(within(bloque).getByText('Aún no hay borradores. Llena un apartado y presiona «Guardar en borrador».')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /guardar perfil profesional/i })).toBeDisabled();
    expect(screen.getByText('Agrega al menos un borrador para poder guardar.')).toBeInTheDocument();
  });
});

describe('Agregar registros - celular 390 px (HU-13, T13.7)', () => {
  function renderLoaded() {
    return render(
      <ProfileStoreProvider initialRecords={SIN_REGISTROS}>
        <AddRecordsScreen />
      </ProfileStoreProvider>,
    );
  }

  it('el bloque «Borradores» solo tiene ancho fijo en escritorio; en celular va debajo a todo el ancho', () => {
    renderLoaded();
    const bloque = screen.getByRole('complementary', { name: 'Borradores' });
    expect(bloque).toHaveClass('lg:w-[380px]');
    expect(bloque.className).not.toMatch(/(^|\s)w-\[/);
    // La columna de apartados puede encogerse sin empujar el ancho de la pantalla
    expect(bloque.parentElement).toHaveClass('flex-col', 'lg:flex-row');
    expect(bloque.previousElementSibling).toHaveClass('min-w-0', 'flex-1');
  });

  it('«Guardar perfil profesional» y «Cancelar» van uno debajo del otro en celular', () => {
    renderLoaded();
    const acciones = screen.getByRole('button', { name: /guardar perfil profesional/i }).parentElement;
    expect(acciones).toHaveClass('flex-col', 'sm:flex-row');
    expect(within(acciones as HTMLElement).getByRole('link', { name: 'Cancelar' })).toBeInTheDocument();
  });

  it('los textos largos de un borrador se parten en vez de salirse de la tarjeta', () => {
    render(
      <ProfileStoreProvider initialRecords={SIN_REGISTROS}>
        <AddRecordsScreen
          initialDrafts={[
            {
              id: 'b1',
              section: 'education',
              data: {
                institucion: 'Universidad Mayor de San Simón',
                titulo: 'Licenciatura en Ingeniería de Sistemas con mención en Ciencia de Datos',
                anioEgreso: '2018',
                grado: 'Licenciatura',
              },
            },
          ]}
        />
      </ProfileStoreProvider>,
    );
    expect(screen.getByText('Licenciatura en Ingeniería de Sistemas con mención en Ciencia de Datos')).toHaveClass('break-words');
  });
});
