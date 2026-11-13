import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { ApiError } from '@/shared/services/api-client';
import { crearCertificacion, crearExperiencia, crearFormacion } from '@/modules/profile/services/perfil-api';
import { ProfileStoreProvider, useProfileStore } from '@/modules/profile/state/profile-store';
import type { DraftRecord } from '@/modules/profile/state/drafts-store';
import type { ProfileRecords } from '@/modules/profile/types/profile-record';

import { afterBatchSave } from './after-batch-save';
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

const mockCrearFormacion = crearFormacion as jest.Mock;
const mockCrearExperiencia = crearExperiencia as jest.Mock;
const mockCrearCertificacion = crearCertificacion as jest.Mock;
const mockAfterBatchSave = afterBatchSave as jest.Mock;

const SIN_REGISTROS: ProfileRecords = { education: [], experience: [], certification: [] };

const BORRADORES: DraftRecord[] = [
  {
    id: 'b1',
    section: 'education',
    data: { institucion: 'UMSS', titulo: 'Ingeniería de Sistemas', anioEgreso: '2018', grado: 'Licenciatura' },
  },
  { id: 'b2', section: 'experience', data: { empresa: 'NTT DATA', cargo: 'Tech Lead', fechaInicio: '2023-07-01' } },
  {
    id: 'b3',
    section: 'certification',
    data: { nombre: 'AWS', entidadEmisora: 'Amazon Web Services', anioEmision: '2022', grado: '', respaldo: null },
  },
];

// Cantidad de registros por apartado en el estado del perfil (lo que ve Mis registros)
function RecordsCount() {
  const { records } = useProfileStore();
  return (
    <p data-testid="registros">
      {records.education.length}-{records.experience.length}-{records.certification.length}
    </p>
  );
}

function renderScreen(initialDrafts?: DraftRecord[]) {
  render(
    <ProfileStoreProvider initialRecords={SIN_REGISTROS}>
      <AddRecordsScreen initialDrafts={initialDrafts} />
      <RecordsCount />
    </ProfileStoreProvider>,
  );
}

const guardarPerfil = () => screen.getByRole('button', { name: /guardar perfil profesional/i });
const borradores = () => screen.getByRole('complementary', { name: 'Borradores' });

beforeEach(() => {
  jest.clearAllMocks();
  mockCrearFormacion.mockResolvedValue({ id: 'f1', ownerId: 't1', institution: 'UMSS', title: 'Ingeniería de Sistemas', graduationYear: '2018', degree: 'Licenciatura' });
  mockCrearExperiencia.mockResolvedValue({ id: 'e1', ownerId: 't1', company: 'NTT DATA', position: 'Tech Lead', startDate: '2023-07-01', endDate: '' });
  mockCrearCertificacion.mockResolvedValue({ id: 'c1', ownerId: 't1', name: 'AWS', issuer: 'Amazon Web Services', issueYear: '2022', degree: '' });
});

describe('Guardar perfil profesional (HU-13)', () => {
  it('sin borradores el botón está deshabilitado, explica por qué y no guarda nada', () => {
    renderScreen();
    expect(guardarPerfil()).toBeDisabled();
    expect(screen.getByText('Agrega al menos un borrador para poder guardar.')).toBeInTheDocument();
    fireEvent.click(guardarPerfil());
    expect(mockCrearFormacion).not.toHaveBeenCalled();
  });

  it('CA-04: guarda todos los borradores, los pasa a Mis registros y vacía la lista', async () => {
    renderScreen(BORRADORES);
    fireEvent.click(guardarPerfil());

    expect(await screen.findByText('Se guardaron 3 registros en tu perfil.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver en Mis registros' })).toHaveAttribute('href', '/profile/records');
    expect(screen.getByTestId('registros')).toHaveTextContent('1-1-1');
    expect(within(borradores()).getByText(/aún no hay borradores/i)).toBeInTheDocument();
    expect(mockCrearCertificacion).toHaveBeenCalledWith(BORRADORES[2].data, expect.any(String));
  });

  it('si falla, avisa y los borradores que faltan siguen en la lista; «Reintentar» guarda solo esos', async () => {
    mockCrearExperiencia.mockRejectedValueOnce(new ApiError(500, 'Error del servidor'));
    renderScreen(BORRADORES);
    fireEvent.click(guardarPerfil());

    expect(
      await screen.findByText('No se pudieron guardar los registros. Tus borradores siguen en este navegador.'),
    ).toBeInTheDocument();
    // La formación sí se guardó; experiencia y certificación siguen como borradores
    expect(screen.getByTestId('registros')).toHaveTextContent('1-0-0');
    expect(within(borradores()).getByText('2')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Se guardaron 2 registros en tu perfil.')).toBeInTheDocument();
    expect(screen.getByTestId('registros')).toHaveTextContent('1-1-1');
    expect(mockCrearFormacion).toHaveBeenCalledTimes(1);
  });

  it('CA-05: «Cancelar» vuelve a Mis registros sin guardar', () => {
    renderScreen(BORRADORES);
    expect(screen.getByRole('link', { name: 'Cancelar' })).toHaveAttribute('href', '/profile/records');
    expect(mockCrearFormacion).not.toHaveBeenCalled();
  });

  it('mientras guarda, el botón dice «Guardando…» y no se puede volver a presionar', async () => {
    let terminar: (valor: unknown) => void = () => {};
    mockCrearFormacion.mockReturnValueOnce(new Promise((resolve) => (terminar = resolve)));
    renderScreen([BORRADORES[0]]);
    fireEvent.click(guardarPerfil());

    const boton = screen.getByRole('button', { name: 'Guardando…' });
    expect(boton).toBeDisabled();
    terminar({ id: 'f1', ownerId: 't1', institution: 'UMSS', title: 'Ingeniería de Sistemas', graduationYear: '2018', degree: 'Licenciatura' });
    await waitFor(() => expect(screen.getByText('Se guardó 1 registro en tu perfil.')).toBeInTheDocument());
  });

  it('T13.6: al guardar varios registros se recalcula una sola vez, al final', async () => {
    renderScreen(BORRADORES);
    fireEvent.click(guardarPerfil());
    await screen.findByText('Se guardaron 3 registros en tu perfil.');
    expect(mockAfterBatchSave).toHaveBeenCalledTimes(1);
    expect(mockAfterBatchSave).toHaveBeenCalledWith(3);
  });

  it('T13.6: si falla a la mitad, se recalcula una vez por lo guardado y otra al reintentar', async () => {
    mockCrearExperiencia.mockRejectedValueOnce(new ApiError(500, 'Error del servidor'));
    renderScreen(BORRADORES);
    fireEvent.click(guardarPerfil());
    await screen.findByText('No se pudieron guardar los registros. Tus borradores siguen en este navegador.');
    expect(mockAfterBatchSave).toHaveBeenCalledTimes(1);
    expect(mockAfterBatchSave).toHaveBeenLastCalledWith(1);

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await screen.findByText('Se guardaron 2 registros en tu perfil.');
    expect(mockAfterBatchSave).toHaveBeenCalledTimes(2);
    expect(mockAfterBatchSave).toHaveBeenLastCalledWith(2);
  });

  it('T13.6: si no se guardó nada, no se recalcula', async () => {
    mockCrearFormacion.mockRejectedValueOnce(new ApiError(500, 'Error del servidor'));
    renderScreen(BORRADORES);
    fireEvent.click(guardarPerfil());
    await screen.findByText('No se pudieron guardar los registros. Tus borradores siguen en este navegador.');
    expect(mockAfterBatchSave).not.toHaveBeenCalled();
  });
});
