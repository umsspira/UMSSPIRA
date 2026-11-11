import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';

import { ProfileStoreProvider } from '@/modules/profile/state/profile-store';
import { PROFILE_RECORDS_MOCK } from '@/modules/profile/testing/profile-fixtures';

import { AcordeonPerfil } from './acordeon-perfil';

const push = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

function renderAcordeon(returnTo?: string) {
  render(
    <ProfileStoreProvider initialRecords={PROFILE_RECORDS_MOCK}>
      <AcordeonPerfil returnTo={returnTo} />
    </ProfileStoreProvider>,
  );
}

describe('Completar perfil · ajustes de la revisión (HU-21)', () => {
  beforeEach(() => push.mockClear());

  it('CA-08: la barra lateral se titula «Tu base de datos de titulado»', () => {
    renderAcordeon();

    expect(screen.getByRole('heading', { name: 'Tu base de datos de titulado' })).toBeInTheDocument();
  });

  it('CA-02: no muestra «Información certificada directamente por el departamento de posgrado»', () => {
    renderAcordeon();

    expect(screen.queryByText(/departamento de posgrado/)).not.toBeInTheDocument();
  });

  it('CA-01: «Guardar perfil profesional» vuelve al resumen con el aviso de guardado', () => {
    renderAcordeon();

    fireEvent.click(screen.getByRole('button', { name: 'Guardar perfil profesional' }));

    expect(push).toHaveBeenCalledWith('/profile?guardado=1');
  });

  it('con returnTo (Mi afinidad) vuelve a esa pantalla como antes', () => {
    renderAcordeon('/afinidad');

    fireEvent.click(screen.getByRole('button', { name: 'Guardar perfil profesional' }));

    expect(push).toHaveBeenCalledWith('/afinidad');
  });

  it('CA-06: «Cancelar» en Formación académica limpia el formulario, cierra la sección y sigue en la página', () => {
    renderAcordeon();
    fireEvent.click(screen.getByRole('button', { name: /formación académica/i }));
    const institucion = screen.getAllByRole('textbox')[0];
    fireEvent.change(institucion, { target: { value: 'UMSS' } });

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByRole('button', { name: /formación académica/i, expanded: false })).toBeInTheDocument();
    expect(institucion).toHaveValue('');
    expect(push).not.toHaveBeenCalled();
  });

  it('CA-06: «Cancelar» en Experiencia laboral limpia el formulario y cierra la sección', () => {
    renderAcordeon();
    fireEvent.click(screen.getByRole('button', { name: /experiencia laboral/i }));
    const empresa = screen.getByPlaceholderText('Ej. Jalasoft');
    fireEvent.change(empresa, { target: { value: 'Jalasoft' } });

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByRole('button', { name: /experiencia laboral/i, expanded: false })).toBeInTheDocument();
    expect(empresa).toHaveValue('');
    expect(push).not.toHaveBeenCalled();
  });

  it('CA-06: «Cancelar» en Descripción profesional descarta lo escrito y cierra la sección', () => {
    renderAcordeon();
    fireEvent.click(screen.getByRole('button', { name: /descripción profesional/i }));
    const texto = screen.getByLabelText('Descripción profesional');
    const original = (texto as HTMLTextAreaElement).value;
    fireEvent.change(texto, { target: { value: 'Texto a medias' } });

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByRole('button', { name: /descripción profesional/i, expanded: false })).toBeInTheDocument();
    expect(texto).toHaveValue(original);
    expect(push).not.toHaveBeenCalled();
  });
});
