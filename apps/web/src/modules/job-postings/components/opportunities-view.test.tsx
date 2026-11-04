import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import OpportunitiesView from './opportunities-view';

describe('OpportunitiesView Component', () => {
  it('debe renderizar el título, nota informativa superior y el panel de perfil', () => {
    render(<OpportunitiesView />);

    expect(
      screen.getByRole('heading', { name: 'Oportunidades para ti' }),
    ).toBeInTheDocument();

    expect(
      screen.getByText('Una orientación personalizada, no una decisión de selección'),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('heading', { name: 'Tu perfil profesional' }),
    ).toBeInTheDocument();
    expect(screen.getByText('María Fernández')).toBeInTheDocument();
    expect(screen.getByText('Datos suficientes')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Actualizar perfil' }),
    ).toBeInTheDocument();
  });

  it('debe listar las vacantes con sus respectivos bloques de afinidad calculada', () => {
    render(<OpportunitiesView />);

    expect(screen.getByText('Desarrollador Frontend')).toBeInTheDocument();
    expect(screen.getByText('80 %')).toBeInTheDocument();
    expect(
      screen.getByText('4 habilidades coincidentes y 1 similitud relevante'),
    ).toBeInTheDocument();

    expect(screen.getByText('Desarrollador Backend')).toBeInTheDocument();
    expect(screen.getByText('64 %')).toBeInTheDocument();

    expect(screen.getByText('Analista de Datos')).toBeInTheDocument();
    expect(screen.getByText('32 %')).toBeInTheDocument();

    expect(screen.getByText('Ingeniero Agrónomo')).toBeInTheDocument();
    expect(screen.getByText('0 %')).toBeInTheDocument();
    expect(
      screen.getByText('Datos suficientes; no se identificaron coincidencias'),
    ).toBeInTheDocument();

    expect(screen.getAllByText('Afinidad calculada')).toHaveLength(4);
    expect(screen.getAllByRole('link', { name: /Ver detalle:/ })).toHaveLength(4);
  });

  it('debe filtrar vacantes interactivamente mediante la barra de búsqueda', () => {
    render(<OpportunitiesView />);

    const searchInput = screen.getByRole('searchbox', {
      name: 'Buscar oportunidades',
    });
    fireEvent.change(searchInput, { target: { value: 'Frontend' } });

    expect(screen.getByText('Desarrollador Frontend')).toBeInTheDocument();
    expect(screen.queryByText('Desarrollador Backend')).not.toBeInTheDocument();
    expect(screen.queryByText('Analista de Datos')).not.toBeInTheDocument();
  });
});
