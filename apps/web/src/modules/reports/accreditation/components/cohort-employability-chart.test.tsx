import { render, screen } from '@testing-library/react';
import { CohortEmployabilityChart } from './cohort-employability-chart';

describe('Task 1.4 — Empleabilidad por cohorte', () => {
  it('muestra el texto definido por el mock-up', () => {
    render(
      <CohortEmployabilityChart
        cohorts={[
          {
            cohort: 2022,
            responses: 8,
            employed: 6,
          },
        ]}
      />,
    );

    expect(
      screen.getByText('Porcentaje de titulados empleados por cohorte'),
    ).toBeInTheDocument();

    expect(
      screen.queryByText(/egreso/i),
    ).not.toBeInTheDocument();
  });

  it('CA-03: muestra una barra vertical y el porcentaje con al menos 5 respuestas', () => {
    render(
      <CohortEmployabilityChart
        cohorts={[
          {
            cohort: 2022,
            responses: 8,
            employed: 6,
          },
        ]}
      />,
    );

    expect(
      screen.getByTestId('employability-bar-2022'),
    ).toHaveStyle({
      height: '75%',
    });

    expect(
      screen.getByText('75 %'),
    ).toBeInTheDocument();

    expect(
      screen.getByText('2022'),
    ).toBeInTheDocument();
  });

  it('calcula correctamente el porcentaje de otra cohorte', () => {
    render(
      <CohortEmployabilityChart
        cohorts={[
          {
            cohort: 2023,
            responses: 10,
            employed: 7,
          },
        ]}
      />,
    );

    expect(
      screen.getByTestId('employability-bar-2023'),
    ).toHaveStyle({
      height: '70%',
    });

    expect(
      screen.getByText('70 %'),
    ).toBeInTheDocument();
  });

  it.each([1, 2, 3, 4])(
    'CA-04: con %i respuestas muestra Sin datos suficientes en lugar de una barra',
    (responses) => {
      render(
        <CohortEmployabilityChart
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
        screen.queryByTestId('employability-bar-2024'),
      ).not.toBeInTheDocument();
    },
  );

  it('no muestra públicamente la cantidad de respuestas insuficientes', () => {
    render(
      <CohortEmployabilityChart
        cohorts={[
          {
            cohort: 2024,
            responses: 3,
            employed: 2,
          },
        ]}
      />,
    );

    expect(
      screen.queryByText('3 respuestas'),
    ).not.toBeInTheDocument();

    expect(
      screen.getByText('Sin datos suficientes'),
    ).toBeInTheDocument();
  });

  it('CA-03: con exactamente 5 respuestas muestra la barra', () => {
    render(
      <CohortEmployabilityChart
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
      screen.getByTestId('employability-bar-2024'),
    ).toHaveStyle({
      height: '80%',
    });

    expect(
      screen.getByText('80 %'),
    ).toBeInTheDocument();

    expect(
      screen.queryByText('Sin datos suficientes'),
    ).not.toBeInTheDocument();
  });

  it('muestra un estado vacío cuando no existen cohortes', () => {
    render(<CohortEmployabilityChart cohorts={[]} />);

    expect(
      screen.getByText(
        'No hay información de cohortes disponible.',
      ),
    ).toBeInTheDocument();
  });
});