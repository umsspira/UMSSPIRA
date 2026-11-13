import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { AcordeonPerfil } from '@/modules/profile/completar/acordeon-perfil';
import { ProfileRecordsManager } from '@/modules/profile/components/profile-records-manager';
import { ProfileStoreProvider } from '@/modules/profile/state/profile-store';
import {
  PROFILE_PROJECTS_MOCK,
  PROFILE_RECORDS_MOCK,
  profileHeader,
} from '@/modules/profile/testing/profile-fixtures';
import type { ProjectRecord } from '@/modules/profile/types/profile-record';
import ProfileSummary from '@/modules/profile/ver/profile-summary';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

// Proyecto de otro egresado que no debe verse ni poder borrarse
const PROYECTO_AJENO: ProjectRecord = {
  id: 'project-ajeno',
  ownerId: 'otro-titulado',
  name: 'Proyecto de otra persona',
  url: 'https://otra-persona.dev',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function renderPerfil(projects: ProjectRecord[] = PROFILE_PROJECTS_MOCK, pantalla: 'completar' | 'registros' = 'completar') {
  render(
    <ProfileStoreProvider initialRecords={PROFILE_RECORDS_MOCK} initialHeader={profileHeader} initialProjects={projects}>
      {pantalla === 'completar' ? (
        <AcordeonPerfil returnTo="/profile" seccionInicial="proyectos-portafolio" />
      ) : (
        <ProfileRecordsManager initialSection="projects" />
      )}
      <ProfileSummary />
    </ProfileStoreProvider>,
  );
}

function resumenProyectos() {
  return screen.getByRole('region', { name: 'Proyectos y portafolio' });
}

function nombresEnResumen() {
  return within(resumenProyectos())
    .queryAllByRole('heading', { level: 3 })
    .map((titulo) => titulo.textContent);
}

function completitud() {
  return screen.getByRole('region', { name: 'Completitud del perfil' });
}

describe('HU-19 de punta a punta: proyectos y portafolio (T19.7)', () => {
  it('con un enlace https inválido no guarda y muestra el error junto al campo', () => {
    renderPerfil([]);

    fireEvent.change(screen.getByLabelText(/Nombre del proyecto/), { target: { value: 'Mi API' } });
    for (const invalido of ['http://mi-api.dev', 'mi-api.dev', 'https://', 'ftp://mi-api.dev']) {
      fireEvent.change(screen.getByLabelText(/^Enlace/), { target: { value: invalido } });
      fireEvent.click(screen.getByRole('button', { name: 'Agregar proyecto' }));
      expect(screen.getByText('Ingresa una dirección https válida')).toBeInTheDocument();
    }

    expect(within(resumenProyectos()).getByText('Sin registros')).toBeInTheDocument();
    expect(within(completitud()).getByRole('link', { name: 'Completar Proyectos' })).toBeInTheDocument();
  });

  it('con un enlace https válido lo agrega y aparece primero en el resumen, del más reciente al más antiguo', async () => {
    renderPerfil();
    expect(nombresEnResumen()).toEqual(['Portafolio personal', 'Sistema de inventario']);

    fireEvent.change(screen.getByLabelText(/Nombre del proyecto/), { target: { value: 'Mi API' } });
    fireEvent.change(screen.getByLabelText(/^Enlace/), { target: { value: '  https://mi-api.dev/docs  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar proyecto' }));

    await waitFor(() => expect(nombresEnResumen()).toEqual(['Mi API', 'Portafolio personal', 'Sistema de inventario']));
    expect(screen.queryByText('Ingresa una dirección https válida')).not.toBeInTheDocument();
    expect(within(resumenProyectos()).getByRole('link', { name: /https:\/\/mi-api\.dev\/docs/ })).toHaveAttribute(
      'href',
      'https://mi-api.dev/docs',
    );
  });

  it('sin proyectos el resumen dice «Sin registros» y la completitud marca Proyectos como faltante', () => {
    renderPerfil([], 'registros');

    expect(within(resumenProyectos()).getByText('Sin registros')).toBeInTheDocument();
    expect(screen.getByText('Aún no tienes proyectos guardados.')).toBeInTheDocument();
    // Registros en las 3 secciones, sin descripción ni proyectos: 3 de 5
    expect(within(completitud()).getByText('60%')).toBeInTheDocument();
    expect(within(completitud()).getByRole('link', { name: 'Completar Proyectos' })).toBeInTheDocument();
  });

  it('elimina un proyecto desde Mis registros solo después de confirmar, y el resumen se actualiza', () => {
    renderPerfil(PROFILE_PROJECTS_MOCK, 'registros');
    const tabla = screen.getByRole('table');
    const fila = within(tabla).getAllByRole('row')[1];

    fireEvent.click(within(fila).getByRole('button', { name: 'Eliminar proyecto' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }));
    expect(nombresEnResumen()).toEqual(['Portafolio personal', 'Sistema de inventario']);

    fireEvent.click(within(fila).getByRole('button', { name: 'Eliminar proyecto' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar' }));

    expect(nombresEnResumen()).toEqual(['Sistema de inventario']);
    expect(screen.getByRole('status')).toHaveTextContent('Proyecto eliminado');
  });

  it('cada egresado ve solo sus proyectos: uno ajeno no sale en el resumen ni en Mis registros ni cuenta', () => {
    renderPerfil([PROYECTO_AJENO], 'registros');

    expect(screen.queryByText('Proyecto de otra persona')).not.toBeInTheDocument();
    expect(within(resumenProyectos()).getByText('Sin registros')).toBeInTheDocument();
    expect(screen.getByText('Aún no tienes proyectos guardados.')).toBeInTheDocument();
    expect(within(completitud()).getByRole('link', { name: 'Completar Proyectos' })).toBeInTheDocument();
  });

  it('en celular los proyectos se ven como tarjetas que se ajustan al ancho', () => {
    renderPerfil(PROFILE_PROJECTS_MOCK, 'registros');

    // Mis registros: la tabla es solo de escritorio y en celular hay una lista de tarjetas
    expect(screen.getByRole('table').parentElement).toHaveClass('hidden', 'md:block');
    const tarjetas = screen
      .getAllByRole('list')
      .find((lista) => lista.classList.contains('md:hidden'));
    expect(tarjetas).toBeDefined();
    expect(within(tarjetas as HTMLElement).getAllByRole('listitem')).toHaveLength(2);

    // Resumen: cada tarjeta se apila en celular, los enlaces largos se cortan y «Ver proyecto» ocupa el ancho
    const [tarjeta] = within(resumenProyectos()).getAllByRole('listitem');
    expect(tarjeta).toHaveClass('flex-col', 'sm:flex-row');
    expect(within(tarjeta).getByRole('link')).toHaveClass('break-all');
    expect(within(tarjeta).getByRole('button', { name: /^Ver proyecto/ })).toHaveClass('w-full', 'sm:w-auto');
  });
});
