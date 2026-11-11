import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { ProfileStoreProvider, useProfileStore } from '@/modules/profile/state/profile-store';
import type { ProfileRecords } from '@/modules/profile/types/profile-record';
import { MENSAJE_FORMACION_DUPLICADA } from '@/modules/profile/validation/reglas-perfil';

import { AddRecordsScreen } from './add-records-screen';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

const SIN_REGISTROS: ProfileRecords = { education: [], experience: [], certification: [] };

const CON_FORMACION: ProfileRecords = {
  ...SIN_REGISTROS,
  education: [
    {
      id: 'f1',
      ownerId: 'titulado-1',
      institution: 'UMSS',
      title: 'Ingeniería de Sistemas',
      graduationYear: '2018',
      degree: 'Licenciatura',
    },
  ],
};

// Muestra cuántas formaciones hay en el estado de registros (lo que ve Mis registros)
function EducationCount() {
  const { records } = useProfileStore();
  return <p data-testid="registros-formacion">{records.education.length}</p>;
}

function renderScreen(initialRecords: ProfileRecords = SIN_REGISTROS) {
  render(
    <ProfileStoreProvider initialRecords={initialRecords}>
      <AddRecordsScreen />
      <EducationCount />
    </ProfileStoreProvider>,
  );
}

function borradores() {
  return screen.getByRole('complementary', { name: 'Borradores' });
}

function llenarFormacionYGuardar() {
  const apartado = screen.getByRole('region', { name: /formación académica/i });
  fireEvent.change(within(apartado).getByLabelText('Institución'), { target: { value: 'UMSS' } });
  fireEvent.change(within(apartado).getByLabelText('Título'), { target: { value: 'Ingeniería de Sistemas' } });
  fireEvent.change(within(apartado).getByLabelText('Año de egreso'), { target: { value: '2018' } });
  fireEvent.change(within(apartado).getByLabelText('Grado'), { target: { value: 'Licenciatura' } });
  fireEvent.click(within(apartado).getByRole('button', { name: /guardar en borrador/i }));
  return apartado;
}

describe('Agregar registros (HU-13)', () => {
  it('CA-01: muestra el título, la palabra «Borrador» y los tres apartados', () => {
    renderScreen();
    expect(screen.getByRole('heading', { name: 'Agregar registros' })).toBeInTheDocument();
    expect(screen.getByText('Borrador')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /formación académica/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /experiencia laboral/i })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /certificaciones/i })).toBeInTheDocument();
  });

  it('CA-05: «Volver a Mis registros» lleva a Mis registros', () => {
    renderScreen();
    expect(screen.getByRole('link', { name: /volver a mis registros/i })).toHaveAttribute('href', '/profile/records');
  });

  it('cada apartado tiene el botón «Guardar en borrador»', () => {
    renderScreen();
    expect(screen.getAllByRole('button', { name: /guardar en borrador/i })).toHaveLength(3);
  });

  it('CA-02: «Guardar en borrador» con datos válidos manda a borradores, limpia el formulario y no toca Mis registros', async () => {
    renderScreen();
    expect(within(borradores()).getByText(/aún no hay borradores/i)).toBeInTheDocument();

    const apartado = llenarFormacionYGuardar();

    await waitFor(() => expect(within(borradores()).getByText('1')).toBeInTheDocument());
    expect(within(apartado).getByLabelText('Institución')).toHaveValue('');
    expect(screen.getByTestId('registros-formacion')).toHaveTextContent('0');
  });

  it('valida con las reglas existentes: una formación ya registrada no pasa a borradores', () => {
    renderScreen(CON_FORMACION);

    const apartado = llenarFormacionYGuardar();

    expect(within(apartado).getByText(MENSAJE_FORMACION_DUPLICADA)).toBeInTheDocument();
    expect(within(borradores()).getByText('0')).toBeInTheDocument();
  });

  it('valida también contra los borradores: la misma formación no se guarda dos veces', async () => {
    renderScreen();
    llenarFormacionYGuardar();
    await waitFor(() => expect(within(borradores()).getByText('1')).toBeInTheDocument());

    const apartado = llenarFormacionYGuardar();

    expect(within(apartado).getByText(MENSAJE_FORMACION_DUPLICADA)).toBeInTheDocument();
    expect(within(borradores()).getByText('1')).toBeInTheDocument();
  });
});
