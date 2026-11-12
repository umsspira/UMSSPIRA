import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { ProfileStoreProvider } from '@/modules/profile/state/profile-store';
import { PROFILE_PROJECTS_MOCK } from '@/modules/profile/testing/profile-fixtures';
import type { ProfileRecords } from '@/modules/profile/types/profile-record';
import { ApiError } from '@/shared/services/api-client';

import { AcordeonPerfil } from './acordeon-perfil';
import { FormularioProyectos } from './proyectos-portafolio';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

function llenar(nombre: string, enlace: string, descripcion = '') {
  fireEvent.change(screen.getByLabelText(/Nombre del proyecto/), { target: { value: nombre } });
  fireEvent.change(screen.getByLabelText(/Enlace/), { target: { value: enlace } });
  if (descripcion) {
    fireEvent.change(screen.getByLabelText('Descripción corta (opcional)'), { target: { value: descripcion } });
  }
}

const agregar = () => fireEvent.click(screen.getByRole('button', { name: 'Agregar proyecto' }));

describe('FormularioProyectos (T19.3)', () => {
  it('muestra nombre, enlace y descripción corta opcional', () => {
    render(<FormularioProyectos proyectos={[]} onAgregar={jest.fn()} />);

    expect(screen.getByLabelText(/Nombre del proyecto/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Enlace/)).toBeInTheDocument();
    expect(screen.getByLabelText('Descripción corta (opcional)')).toBeInTheDocument();
  });

  it('no deja agregar sin nombre ni enlace', () => {
    render(<FormularioProyectos proyectos={[]} onAgregar={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Agregar proyecto' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Nombre del proyecto/), { target: { value: 'Inventario' } });
    expect(screen.getByRole('button', { name: 'Agregar proyecto' })).toBeDisabled();
  });

  it.each(['http://ana.dev', 'ana.dev', 'https://ana dev'])(
    'con el enlace "%s" muestra el error junto al campo y no guarda',
    (enlace) => {
      const onAgregar = jest.fn();
      render(<FormularioProyectos proyectos={[]} onAgregar={onAgregar} />);

      llenar('Inventario', enlace);
      agregar();

      expect(screen.getByRole('alert')).toHaveTextContent('Ingresa una dirección https válida');
      expect(screen.getByLabelText(/Enlace/)).toHaveAttribute('aria-invalid', 'true');
      expect(onAgregar).not.toHaveBeenCalled();
    },
  );

  it('quita el error al corregir el enlace y guarda los datos sin espacios', async () => {
    const onAgregar = jest.fn().mockResolvedValue(undefined);
    render(<FormularioProyectos proyectos={[]} onAgregar={onAgregar} />);

    llenar('  Inventario ', 'http://ana.dev', '  Control de stock ');
    agregar();
    fireEvent.change(screen.getByLabelText(/Enlace/), { target: { value: 'https://ana.dev' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    agregar();

    await waitFor(() =>
      expect(onAgregar).toHaveBeenCalledWith({
        nombre: 'Inventario',
        enlace: 'https://ana.dev',
        descripcion: 'Control de stock',
      }),
    );
    await waitFor(() => expect(screen.getByLabelText(/Nombre del proyecto/)).toHaveValue(''));
  });

  it('sin descripción no la envía', async () => {
    const onAgregar = jest.fn().mockResolvedValue(undefined);
    render(<FormularioProyectos proyectos={[]} onAgregar={onAgregar} />);

    llenar('Portafolio', 'https://ana.dev');
    agregar();

    await waitFor(() => expect(onAgregar).toHaveBeenCalledWith({ nombre: 'Portafolio', enlace: 'https://ana.dev' }));
  });

  it('si la API rechaza el proyecto muestra su mensaje y conserva lo escrito', async () => {
    const onAgregar = jest.fn().mockRejectedValue(new ApiError(400, 'No se pudo guardar el proyecto'));
    render(<FormularioProyectos proyectos={[]} onAgregar={onAgregar} />);

    llenar('Portafolio', 'https://ana.dev');
    agregar();

    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar el proyecto');
    expect(screen.getByLabelText(/Nombre del proyecto/)).toHaveValue('Portafolio');
  });

  it('lista los proyectos del más reciente al más antiguo con su enlace', () => {
    render(<FormularioProyectos proyectos={PROFILE_PROJECTS_MOCK} onAgregar={jest.fn()} />);

    const items = screen.getAllByRole('listitem');
    expect(within(items[0]).getByText('Portafolio personal')).toBeInTheDocument();
    expect(within(items[1]).getByText('Sistema de inventario')).toBeInTheDocument();
    expect(within(items[0]).getByRole('link', { name: 'https://carlos-mendoza.dev' })).toHaveAttribute(
      'href',
      'https://carlos-mendoza.dev',
    );
  });
});

describe('Completar perfil · sección Proyectos y portafolio (T19.3)', () => {
  const SIN_REGISTROS: ProfileRecords = { education: [], experience: [], certification: [] };

  it('agrega el proyecto al estado compartido y lo muestra en la sección', async () => {
    render(
      <ProfileStoreProvider initialRecords={SIN_REGISTROS}>
        <AcordeonPerfil />
      </ProfileStoreProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /proyectos y portafolio/i }));
    llenar('Sistema de inventario', 'https://github.com/ana/inventario');
    agregar();

    expect(await screen.findByText('Sistema de inventario')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://github.com/ana/inventario' })).toBeInTheDocument();
  });

  it('con un enlace inválido no agrega nada a la sección', () => {
    render(
      <ProfileStoreProvider initialRecords={SIN_REGISTROS}>
        <AcordeonPerfil />
      </ProfileStoreProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /proyectos y portafolio/i }));
    llenar('Sistema de inventario', 'http://inventario.com');
    agregar();

    expect(screen.getByRole('alert')).toHaveTextContent('Ingresa una dirección https válida');
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });
});
