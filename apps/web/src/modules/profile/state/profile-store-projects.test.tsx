import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { EMPTY_PROFILE_RECORDS } from '@/modules/profile/data/profile-records-data';
import { PROFILE_PROJECTS_MOCK, PROFILE_RECORDS_MOCK, profileHeader } from '@/modules/profile/testing/profile-fixtures';

import { ProfileStoreProvider, useProfileStore } from './profile-store';

// Muestra los proyectos del estado y permite agregar, editar y quitar uno (T19.1)
function ProjectsProbe() {
  const { projects, addProject, updateProject, removeProject } = useProfileStore();
  return (
    <div>
      <ul>
        {projects.map((project) => (
          <li key={project.id}>
            {project.name} · {project.url}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => addProject({ name: 'App de turnos', url: 'https://turnos.example.com' })}
      >
        agregar
      </button>
      <button
        type="button"
        onClick={() => updateProject({ ...projects[0], name: 'Inventario v2' })}
      >
        editar
      </button>
      <button type="button" onClick={() => removeProject(projects[0].id)}>
        quitar
      </button>
    </div>
  );
}

function renderStore() {
  return render(
    <ProfileStoreProvider initialRecords={PROFILE_RECORDS_MOCK} initialProjects={PROFILE_PROJECTS_MOCK}>
      <ProjectsProbe />
    </ProfileStoreProvider>,
  );
}

describe('ProfileStoreProvider · proyectos (T19.1)', () => {
  it('parte de los 2 proyectos de ejemplo', () => {
    renderStore();

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText(/Sistema de inventario/)).toBeInTheDocument();
    expect(screen.getByText(/Portafolio personal/)).toBeInTheDocument();
  });

  it('sin proyectos iniciales la lista empieza vacía', () => {
    render(
      <ProfileStoreProvider initialRecords={PROFILE_RECORDS_MOCK}>
        <ProjectsProbe />
      </ProfileStoreProvider>,
    );

    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('addProject agrega el proyecto con id y fecha de registro', () => {
    renderStore();

    fireEvent.click(screen.getByRole('button', { name: 'agregar' }));

    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('App de turnos · https://turnos.example.com')).toBeInTheDocument();
  });

  it('updateProject reemplaza solo el proyecto con el mismo id', () => {
    renderStore();

    fireEvent.click(screen.getByRole('button', { name: 'editar' }));

    expect(screen.getByText(/Inventario v2/)).toBeInTheDocument();
    expect(screen.queryByText(/Sistema de inventario/)).not.toBeInTheDocument();
    expect(screen.getByText(/Portafolio personal/)).toBeInTheDocument();
  });

  it('removeProject quita el proyecto de la lista', () => {
    renderStore();

    fireEvent.click(screen.getByRole('button', { name: 'quitar' }));

    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.queryByText(/Sistema de inventario/)).not.toBeInTheDocument();
  });
});

describe('aislamiento de proyectos por egresado (T19.7)', () => {
  const ajeno = { ...PROFILE_PROJECTS_MOCK[0], id: 'project-ajeno', ownerId: 'otro-titulado' };

  it('no muestra, edita ni elimina proyectos de otro egresado', () => {
    let store: ReturnType<typeof useProfileStore> | undefined;
    function Espia() {
      store = useProfileStore();
      return null;
    }
    render(
      <ProfileStoreProvider
        initialRecords={EMPTY_PROFILE_RECORDS}
        initialHeader={profileHeader}
        initialProjects={[...PROFILE_PROJECTS_MOCK, ajeno]}
      >
        <Espia />
      </ProfileStoreProvider>,
    );

    expect(store?.projects.map((proyecto) => proyecto.id)).toEqual(['project-1', 'project-2']);

    act(() => {
      store?.updateProject({ ...ajeno, name: 'Cambiado', ownerId: profileHeader.id });
      store?.removeProject('project-ajeno');
    });
    expect(store?.projects.map((proyecto) => proyecto.id)).toEqual(['project-1', 'project-2']);

    act(() => store?.addProject({ name: 'Nuevo', url: 'https://nuevo.dev' }));
    expect(store?.projects.at(-1)?.ownerId).toBe(profileHeader.id);
  });
});
