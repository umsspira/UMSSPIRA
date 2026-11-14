import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { ProfileStoreProvider, useProfileStore } from '@/modules/profile/state/profile-store';
import type { ProfileRecords } from '@/modules/profile/types/profile-record';
import { MENSAJE_FORMACION_DUPLICADA } from '@/modules/profile/validation/reglas-perfil';

import type { DraftRecord } from '@/modules/profile/state/drafts-store';

import { AddRecordsScreen } from './add-records-screen';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

const SIN_REGISTROS: ProfileRecords = { education: [], experience: [], certification: [], project: [] };

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

const BORRADORES: DraftRecord[] = [
  {
    id: 'b1',
    section: 'education',
    data: { institucion: 'Universidad Mayor de San Simón', titulo: 'Licenciatura en Ingeniería de Sistemas', anioEgreso: '2018', grado: 'Licenciatura' },
  },
  {
    id: 'b2',
    section: 'experience',
    data: { empresa: 'NTT DATA', cargo: 'Tech Lead', fechaInicio: '2023-07-01' },
  },
];

function renderScreen(initialRecords: ProfileRecords = SIN_REGISTROS, initialDrafts?: DraftRecord[]) {
  render(
    <ProfileStoreProvider initialRecords={initialRecords}>
      <AddRecordsScreen initialDrafts={initialDrafts} />
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
    expect(screen.getAllByRole('button', { name: /guardar en borrador/i })).toHaveLength(4);
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

  it('CA-03: el bloque muestra solo borradores, cada uno con «Editar» y «Quitar»', () => {
    renderScreen(CON_FORMACION, BORRADORES);
    const bloque = borradores();
    expect(within(bloque).getAllByRole('listitem')).toHaveLength(2);
    expect(within(bloque).getByText('Formación guardada en borrador')).toBeInTheDocument();
    expect(within(bloque).getByText('Experiencia guardada en borrador')).toBeInTheDocument();
    expect(within(bloque).getByText('NTT DATA · Jul 2023 – Presente')).toBeInTheDocument();
    // La formación ya registrada (CON_FORMACION) no aparece en el bloque
    expect(within(bloque).queryByText('Ingeniería de Sistemas')).not.toBeInTheDocument();
    expect(within(bloque).getAllByRole('button', { name: /^editar/i })).toHaveLength(2);
    expect(within(bloque).getAllByRole('button', { name: /^quitar/i })).toHaveLength(2);
  });

  it('«Quitar» saca el borrador de la lista', () => {
    renderScreen(SIN_REGISTROS, BORRADORES);
    fireEvent.click(within(borradores()).getByRole('button', { name: 'Quitar Tech Lead' }));
    expect(within(borradores()).queryByText('Tech Lead')).not.toBeInTheDocument();
    expect(within(borradores()).getByText('1')).toBeInTheDocument();
  });

  it('«Editar» devuelve el borrador a su formulario y al guardar lo reemplaza sin duplicarlo', async () => {
    renderScreen(SIN_REGISTROS, BORRADORES);
    fireEvent.click(within(borradores()).getByRole('button', { name: 'Editar Licenciatura en Ingeniería de Sistemas' }));

    const apartado = screen.getByRole('region', { name: /formación académica/i });
    expect(within(apartado).getByLabelText('Institución')).toHaveValue('Universidad Mayor de San Simón');
    expect(within(apartado).getByLabelText('Título')).toHaveValue('Licenciatura en Ingeniería de Sistemas');

    fireEvent.change(within(apartado).getByLabelText('Título'), { target: { value: 'Ingeniería Informática' } });
    fireEvent.click(within(apartado).getByRole('button', { name: /guardar en borrador/i }));

    await waitFor(() => expect(within(borradores()).getByText('Ingeniería Informática')).toBeInTheDocument());
    expect(within(borradores()).queryByText('Licenciatura en Ingeniería de Sistemas')).not.toBeInTheDocument();
    expect(within(borradores()).getByText('2')).toBeInTheDocument();
    expect(within(apartado).getByLabelText('Institución')).toHaveValue('');
  });

  it('«Editar» una experiencia actual la carga con «Actualmente trabajo aquí» marcado', () => {
    renderScreen(SIN_REGISTROS, BORRADORES);
    fireEvent.click(within(borradores()).getByRole('button', { name: 'Editar Tech Lead' }));
    const apartado = screen.getByRole('region', { name: /experiencia laboral/i });
    expect(within(apartado).getByDisplayValue('NTT DATA')).toBeInTheDocument();
    expect(within(apartado).getByRole('checkbox', { name: /actualmente trabajo aquí/i })).toBeChecked();
  });
});
