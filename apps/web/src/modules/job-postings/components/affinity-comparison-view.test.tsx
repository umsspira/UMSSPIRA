import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import AffinityComparisonView from './affinity-comparison-view';

describe('AffinityComparisonView Component', () => {
  const vacancyId = '80000000-0000-4000-8000-000000000001';

  it('debe renderizar la cabecera, enlace de retorno y resumen de vacante', () => {
    render(<AffinityComparisonView vacancyId={vacancyId} />);

    expect(
      screen.getByRole('heading', { name: 'Resultados de afinidad' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Volver a la oferta' }),
    ).toHaveAttribute('href', `/job-postings/${vacancyId}`);
    expect(
      screen.getByText('Desarrollador Frontend Junior'),
    ).toBeInTheDocument();
  });

  it('debe mostrar la tabla comparativa con las 3 columnas y los badges de resultado', () => {
    render(<AffinityComparisonView vacancyId={vacancyId} />);

    expect(
      screen.getByRole('columnheader', { name: 'Requisito de la oferta' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Habilidad de tu perfil' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: 'Resultado' }),
    ).toBeInTheDocument();

    // Badges de clasificación de resultados
    expect(screen.getAllByText('Exacta')).toHaveLength(3);
    expect(screen.getAllByText('Similar - NLP')).toHaveLength(2);
    expect(screen.getAllByText('No encontrada')).toHaveLength(2);

    // Contadores en badges superiores
    expect(screen.getByText('3 exactas')).toBeInTheDocument();
    expect(screen.getByText('2 similares - NLP')).toBeInTheDocument();
    expect(screen.getByText('2 no encontradas')).toBeInTheDocument();
  });

  it('debe mostrar las secciones explicativas y de habilidades del perfil', () => {
    render(<AffinityComparisonView vacancyId={vacancyId} />);

    expect(
      screen.getByRole('heading', { name: 'Habilidades de tu perfil' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Actualizar habilidades' }),
    ).toBeInTheDocument();

    expect(
      screen.getByRole('heading', { name: '¿Cómo se estima la afinidad?' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Se revisan los datos')).toBeInTheDocument();
    expect(screen.getByText('Se compara el significado')).toBeInTheDocument();
    expect(screen.getByText('Se pondera la relevancia')).toBeInTheDocument();

    expect(
      screen.getByRole('heading', { name: 'Tu siguiente paso' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Postular a la oferta' }),
    ).toBeInTheDocument();
  });
});
