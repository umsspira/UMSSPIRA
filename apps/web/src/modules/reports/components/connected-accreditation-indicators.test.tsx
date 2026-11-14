import { render, screen } from '@testing-library/react';
import type { AccreditationIndicators } from '../types/acreditacion.types';
import { ConnectedAccreditationIndicators } from './connected-accreditation-indicators';

const data: AccreditationIndicators = {
  totalResponses: 39,
  employedGraduates: 28,
  employedPercent: 72,
  averageInsertionMonths: 5.4,
  salaryRanges: [
    { range: '0–2.999', count: 4 },
    { range: '3.000–5.000', count: 9 },
    { range: '5.001–8.000', count: 8 },
    { range: '8.001–12.000', count: 5 },
    { range: '12.001–21.000', count: 2 },
  ],
  cohorts: [
    { cohort: 2019, responses: 6, employed: 4 },
    { cohort: 2023, responses: 0, employed: 0 },
  ],
};

function filtersState(cohort = '', semester = '') {
  return {
    filters: { cohort, semester },
    setCohort: jest.fn(),
    setSemester: jest.fn(),
    clearFilters: jest.fn(),
    isSemesterActive: semester !== '',
    hasActiveFilters: cohort !== '' || semester !== '',
  };
}

describe('Tablero de acreditación (T1.3)', () => {
  it('muestra los filtros, los indicadores y el gráfico por cohorte (HU-001 CA-01 a CA-04)', async () => {
    render(
      <ConnectedAccreditationIndicators
        careerName="Ingeniería de Sistemas"
        load={() => Promise.resolve(data)}
        filtersState={filtersState()}
      />,
    );

    expect(await screen.findByText('Carrera: Ingeniería de Sistemas')).toBeInTheDocument();
    expect(screen.getByLabelText('Cohorte')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: '2019' })).toBeInTheDocument();
    expect(screen.getByText('Total de respuestas')).toBeInTheDocument();
    expect(screen.getByText('Empleabilidad por cohorte')).toBeInTheDocument();
    expect(screen.getByText('67 %')).toBeInTheDocument();
    expect(screen.getByText('Sin datos suficientes')).toBeInTheDocument();
  });

  it('con un filtro sin datos muestra «No hay información para el periodo seleccionado» (HU-003 CA-08)', async () => {
    render(
      <ConnectedAccreditationIndicators
        careerName="Ingeniería de Sistemas"
        load={() => Promise.resolve({ ...data, totalResponses: 0 })}
        filtersState={filtersState('2018')}
      />,
    );

    expect(
      await screen.findByText('No hay información para el periodo seleccionado'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Total de respuestas')).not.toBeInTheDocument();
  });
});
