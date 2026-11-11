import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { ProfileStoreProvider, useProfileStore } from '@/modules/profile/state/profile-store';
import type { ProfileRecords } from '@/modules/profile/types/profile-record';

import { AddRecordsScreen } from './add-records-screen';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

const SIN_REGISTROS: ProfileRecords = { education: [], experience: [], certification: [] };

// Muestra cuántas formaciones hay en el estado de registros (lo que ve Mis registros)
function EducationCount() {
  const { records } = useProfileStore();
  return <p data-testid="registros-formacion">{records.education.length}</p>;
}

function renderScreen() {
  render(
    <ProfileStoreProvider initialRecords={SIN_REGISTROS}>
      <AddRecordsScreen />
      <EducationCount />
    </ProfileStoreProvider>,
  );
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

  it('agregar una formación la manda a borradores y no a los registros', async () => {
    renderScreen();
    const bloque = screen.getByRole('complementary', { name: 'Borradores' });
    expect(within(bloque).getByText(/aún no hay borradores/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Institución'), { target: { value: 'UMSS' } });
    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Ingeniería de Sistemas' } });
    fireEvent.change(screen.getByLabelText('Año de egreso'), { target: { value: '2018' } });
    fireEvent.change(screen.getByLabelText('Grado'), { target: { value: 'Licenciatura' } });
    fireEvent.click(screen.getByRole('button', { name: /agregar formación/i }));

    await waitFor(() => expect(within(bloque).getByText('1')).toBeInTheDocument());
    expect(screen.getByTestId('registros-formacion')).toHaveTextContent('0');
  });
});
