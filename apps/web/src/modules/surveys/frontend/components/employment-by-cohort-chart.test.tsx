import { render, screen } from '@testing-library/react';
import { EmploymentByCohortChart } from './employment-by-cohort-chart';

describe('Task 1.4 — Empleabilidad por cohorte', () => {
  it('CA-03: muestra una barra por cohorte cuando existen al menos 5 respuestas', () => {
    render(
      <EmploymentByCohortChart
        cohorts={[
          {
            cohort: 2022,
            responses: 8,
            employed: 6,
          },
          {
            cohort: 2023,
            responses: 10,
            employed: 7,
          },
        ]}
      />,
    );

    expect(
      screen.getByTestId('employment-bar-2022'),
    ).toHaveStyle({ width: '75%' });

    expect(
      screen.getByTestId('employment-bar-2023'),
    ).toHaveStyle({ width: '70%' });

    expect(
      screen.getByLabelText('Cohorte 2022: 75% de empleabilidad'),
    ).toBeInTheDocument();
  });

  it.each([1, 2, 3, 4])(
    'CA-04: con %i respuestas muestra Sin datos suficientes y no una barra',
    (responses) => {
      render(
        <EmploymentByCohortChart
          cohorts={[
            {
              cohort: 2024,
              responses,
              employed: Math.min(responses, 2),
            },
          ]}
        />,
      );

      expect(
        screen.getByText('Sin datos suficientes'),
      ).toBeInTheDocument();

      expect(
        screen.queryByTestId('employment-bar-2024'),
      ).not.toBeInTheDocument();
    },
  );

  it('CA-03: con exactamente 5 respuestas muestra la barra', () => {
    render(
      <EmploymentByCohortChart
        cohorts={[
          {
            cohort: 2024,
            responses: 5,
            employed: 4,
          },
        ]}
      />,
    );

    expect(
      screen.getByTestId('employment-bar-2024'),
    ).toHaveStyle({ width: '80%' });

    expect(
      screen.queryByText('Sin datos suficientes'),
    ).not.toBeInTheDocument();
  });

  it('muestra un estado vacío si no existen cohortes', () => {
    render(<EmploymentByCohortChart cohorts={[]} />);

    expect(
      screen.getByText('No hay información de cohortes disponible.'),
    ).toBeInTheDocument();
  });
});