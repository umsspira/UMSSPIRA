import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { ProfileStoreProvider } from '@/modules/profile/state/profile-store';
import type { DraftRecord } from '@/modules/profile/state/drafts-store';
import type { ProfileRecords } from '@/modules/profile/types/profile-record';
import { draftsStorageKey } from '@/modules/profile/utils/drafts-storage';

import { AcordeonPerfil } from './acordeon-perfil';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
}));

const TITULADO = { id: 'titulado-1', name: 'María Pérez', career: 'Ingeniería de Sistemas', graduationYear: 2020 };
const VACIO: ProfileRecords = { education: [], experience: [], certification: [], project: [] };

function renderAcordeon(records: ProfileRecords = VACIO, description = '') {
  render(
    <ProfileStoreProvider initialRecords={records} initialDescription={description} initialHeader={TITULADO}>
      <AcordeonPerfil seccionInicial="formacion-academica" />
    </ProfileStoreProvider>,
  );
}

const guardados = (): DraftRecord[] =>
  JSON.parse(window.localStorage.getItem(draftsStorageKey(TITULADO.id)) ?? '[]');

describe('Completar perfil · Guardar borrador y Guardar perfil profesional', () => {
  beforeEach(() => {
    mockPush.mockClear();
    window.localStorage.clear();
  });

  it('«Guardar borrador» conserva lo escrito como borrador incompleto en Agregar registros', async () => {
    renderAcordeon();
    fireEvent.change(screen.getByLabelText('Institución'), { target: { value: 'UMSS' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }));

    await waitFor(() => expect(guardados()).toHaveLength(1));
    expect(guardados()[0]).toMatchObject({ section: 'education', isIncomplete: true, data: { institucion: 'UMSS' } });
    expect(await screen.findByRole('status')).toHaveTextContent('Borrador guardado: lo encontrarás en Agregar registros');
  });

  it('«Guardar borrador» sin nada escrito no dice que guardó', async () => {
    renderAcordeon();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }));

    expect(await screen.findByRole('status')).toHaveTextContent('No hay datos escritos para guardar como borrador');
    expect(guardados()).toEqual([]);
  });

  it('con el perfil vacío «Guardar perfil profesional» avisa y no vuelve al resumen (HU-12)', () => {
    renderAcordeon();
    fireEvent.click(screen.getByRole('button', { name: 'Guardar perfil profesional' }));

    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('Agrega al menos un registro o tu descripción profesional');
  });

  it('con datos guardados vuelve al resumen con el aviso de guardado', () => {
    renderAcordeon(VACIO, 'Desarrollador backend');
    fireEvent.click(screen.getByRole('button', { name: 'Guardar perfil profesional' }));

    expect(mockPush).toHaveBeenCalledWith('/profile?guardado=1');
  });
});
