import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { FormularioProyectos } from '@/modules/profile/completar/proyectos';
import { ProfileRecordsTable } from '@/modules/profile/components/profile-records-table';
import { DeleteRecordModal } from '@/modules/profile/components/delete-record-modal';
import { aProjectRecord } from '@/modules/profile/services/perfil-api';
import type { ProjectRecord } from '@/modules/profile/types/profile-record';
import { MENSAJE_ENLACE_PROYECTO, validarEnlaceProyecto } from '@/modules/profile/validation/reglas-perfil';
import ProjectsSection, { sortProjectsByRecency } from '@/modules/profile/ver/projects-section';

const proyecto = (id: string, createdAt?: string): ProjectRecord => ({
  id,
  ownerId: 'titulado-1',
  name: `Proyecto ${id}`,
  url: `https://${id}.example.com`,
  description: `Descripción ${id}`,
  createdAt,
});

function llenar(enlace: string) {
  fireEvent.change(screen.getByLabelText('Nombre del proyecto'), { target: { value: 'Portafolio' } });
  fireEvent.change(screen.getByLabelText('Enlace del proyecto'), { target: { value: enlace } });
  fireEvent.change(screen.getByLabelText('Descripción corta'), { target: { value: 'Mis trabajos' } });
}

describe('HU-19 · Proyectos y portafolio', () => {
  it('T19.2: solo acepta enlaces https válidos', () => {
    expect(validarEnlaceProyecto('https://mi-sitio.dev')).toBeUndefined();
    expect(validarEnlaceProyecto('http://mi-sitio.dev')).toBe(MENSAJE_ENLACE_PROYECTO);
    expect(validarEnlaceProyecto('javascript:alert(1)')).toBe(MENSAJE_ENLACE_PROYECTO);
    expect(validarEnlaceProyecto('mi-sitio.dev')).toBe(MENSAJE_ENLACE_PROYECTO);
  });

  it('CA-01: el formulario tiene nombre, enlace, descripción corta y tecnologías (opcional)', () => {
    render(<FormularioProyectos proyectos={[]} onAgregar={jest.fn()} />);

    expect(screen.getByLabelText('Nombre del proyecto')).toBeRequired();
    expect(screen.getByLabelText('Enlace del proyecto')).toBeRequired();
    expect(screen.getByLabelText('Descripción corta')).toBeRequired();
    expect(screen.getByLabelText('Tecnologías (opcional)')).not.toBeRequired();
  });

  it('CA-02: un enlace que no es https muestra el mensaje junto al campo y no se guarda', () => {
    const onAgregar = jest.fn();
    render(<FormularioProyectos proyectos={[]} onAgregar={onAgregar} />);

    llenar('http://mi-sitio.dev');
    fireEvent.click(screen.getByRole('button', { name: 'Agregar proyecto' }));

    expect(screen.getByText(MENSAJE_ENLACE_PROYECTO)).toBeInTheDocument();
    expect(screen.getByLabelText('Enlace del proyecto')).toHaveAttribute('aria-invalid', 'true');
    expect(onAgregar).not.toHaveBeenCalled();
  });

  it('CA-02: con un enlace https válido se guarda y el formulario se limpia', async () => {
    const onAgregar = jest.fn().mockResolvedValue(undefined);
    render(<FormularioProyectos proyectos={[]} onAgregar={onAgregar} />);

    llenar(' https://mi-sitio.dev ');
    fireEvent.change(screen.getByLabelText('Tecnologías (opcional)'), { target: { value: 'React' } });
    fireEvent.click(screen.getByRole('button', { name: 'Agregar proyecto' }));

    await waitFor(() =>
      expect(onAgregar).toHaveBeenCalledWith({
        nombre: 'Portafolio',
        enlace: 'https://mi-sitio.dev',
        descripcion: 'Mis trabajos',
        tecnologias: 'React',
      }),
    );
    await waitFor(() => expect(screen.getByLabelText('Nombre del proyecto')).toHaveValue(''));
  });

  it('«Cancelar» limpia el formulario y avisa para cerrar la sección', () => {
    const onCancelar = jest.fn();
    render(<FormularioProyectos proyectos={[]} onAgregar={jest.fn()} onCancelar={onCancelar} />);

    llenar('https://mi-sitio.dev');
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByLabelText('Nombre del proyecto')).toHaveValue('');
    expect(onCancelar).toHaveBeenCalledTimes(1);
  });

  it('T19.3: traduce el proyecto de la API al registro del perfil', () => {
    expect(
      aProjectRecord({
        id: 'p-1',
        idTitulado: 't-1',
        fechaCreacion: '2026-11-13T10:00:00.000Z',
        nombre: 'Portafolio',
        enlace: 'https://mi-sitio.dev',
        descripcion: 'Mis trabajos',
        tecnologias: null,
      }),
    ).toEqual({
      id: 'p-1',
      ownerId: 't-1',
      name: 'Portafolio',
      url: 'https://mi-sitio.dev',
      description: 'Mis trabajos',
      technologies: undefined,
      createdAt: '2026-11-13T10:00:00.000Z',
    });
  });

  it('CA-03: el resumen muestra los proyectos del más reciente al más antiguo, cada uno con «Ver proyecto»', () => {
    const projects = [proyecto('a', '2026-01-01T00:00:00Z'), proyecto('b', '2026-06-01T00:00:00Z'), proyecto('c')];
    expect(sortProjectsByRecency(projects).map((project) => project.id)).toEqual(['b', 'a', 'c']);

    render(<ProjectsSection projects={projects} />);
    const titulos = within(screen.getByRole('region', { name: 'Proyectos' })).getAllByRole('heading', { level: 3 });
    expect(titulos.map((titulo) => titulo.textContent)).toEqual(['Proyecto b', 'Proyecto a', 'Proyecto c']);
    expect(screen.getAllByRole('button', { name: 'Ver proyecto' })).toHaveLength(3);
  });

  it('CA-03: sin proyectos el resumen dice «Sin registros»', () => {
    render(<ProjectsSection projects={[]} />);

    expect(within(screen.getByRole('region', { name: 'Proyectos' })).getByText('Sin registros')).toBeInTheDocument();
  });

  it('T19.5 + HU-20: «Ver proyecto» abre la vista embebida del proyecto', () => {
    render(<ProjectsSection projects={[proyecto('a')]} />);

    fireEvent.click(screen.getByRole('button', { name: 'Ver proyecto' }));
    expect(screen.getByRole('dialog', { name: 'Proyecto a' })).toBeInTheDocument();
  });

  it('CA-04 (T19.4): la pestaña Proyectos lista con «Editar» y «Eliminar», y vacía muestra su aviso', () => {
    const onDelete = jest.fn();
    const { unmount } = render(<ProfileRecordsTable section="project" records={[proyecto('a')]} onDelete={onDelete} />);

    expect(screen.getAllByText('Proyecto a').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Editar registro' })[0]).toHaveAttribute('href', '/profile/projects/a/edit');
    fireEvent.click(screen.getAllByRole('button', { name: 'Eliminar registro' })[0]);
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
    unmount();

    render(<ProfileRecordsTable section="project" records={[]} onDelete={onDelete} />);
    expect(screen.getByText('Aún no tienes proyectos registrados')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Agregar proyecto' })).toHaveAttribute(
      'href',
      '/profile/completar?seccion=proyectos&returnTo=%2Fprofile',
    );
  });

  it('CA-04 (T19.4): eliminar un proyecto pide confirmación', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    render(
      <DeleteRecordModal
        section="project"
        record={proyecto('a')}
        isDeleting={false}
        errorCode={null}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    expect(screen.getByText('Proyectos')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /cancelar/i }));
    expect(onCancel).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
