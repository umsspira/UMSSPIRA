import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { ProfileStoreProvider } from '@/modules/profile/state/profile-store';
import { PROFILE_PROJECTS_MOCK, PROFILE_RECORDS_MOCK, profileHeader } from '@/modules/profile/testing/profile-fixtures';
import ProfileSummary from '@/modules/profile/ver/profile-summary';
import ProjectsSummary from '@/modules/profile/ver/projects-summary';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

describe('ProjectsSummary (HU-19, T19.5)', () => {
  it('lista los proyectos del más reciente al más antiguo con su enlace', () => {
    render(<ProjectsSummary projects={PROFILE_PROJECTS_MOCK} />);

    const items = within(screen.getByRole('list', { name: 'Proyectos' })).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByRole('heading', { name: 'Portafolio personal' })).toBeInTheDocument();
    expect(within(items[1]).getByRole('heading', { name: 'Sistema de inventario' })).toBeInTheDocument();
    expect(within(items[1]).getByRole('link')).toHaveAttribute(
      'href',
      'https://github.com/carlos-mendoza/sistema-inventario',
    );
    expect(within(items[1]).getByText('Aplicación web para el control de stock de una ferretería.')).toBeInTheDocument();
  });

  it('muestra «Sin registros» cuando no hay proyectos', () => {
    render(<ProjectsSummary projects={[]} />);

    expect(screen.getByRole('heading', { name: 'Proyectos y portafolio' })).toBeInTheDocument();
    expect(screen.getByText('Sin registros')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Ver proyecto/ })).not.toBeInTheDocument();
  });

  it('cada tarjeta tiene «Ver proyecto» y avisa cuál se eligió (para HU-20)', () => {
    const onViewProject = jest.fn();
    render(<ProjectsSummary projects={PROFILE_PROJECTS_MOCK} onViewProject={onViewProject} />);

    expect(screen.getAllByRole('button', { name: /^Ver proyecto/ })).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Ver proyecto Sistema de inventario' }));
    expect(onViewProject).toHaveBeenCalledWith(PROFILE_PROJECTS_MOCK[0]);
  });

  it('«Ver proyecto» sin acción todavía no falla', () => {
    render(<ProjectsSummary projects={PROFILE_PROJECTS_MOCK} />);

    expect(() => fireEvent.click(screen.getByRole('button', { name: 'Ver proyecto Portafolio personal' }))).not.toThrow();
  });

  it('aparece en el resumen del perfil con los proyectos del estado compartido', () => {
    render(
      <ProfileStoreProvider
        initialRecords={PROFILE_RECORDS_MOCK}
        initialHeader={profileHeader}
        initialProjects={PROFILE_PROJECTS_MOCK}
      >
        <ProfileSummary />
      </ProfileStoreProvider>,
    );

    const seccion = screen.getByRole('region', { name: 'Proyectos y portafolio' });
    expect(within(seccion).getAllByRole('listitem')).toHaveLength(2);
  });
});
