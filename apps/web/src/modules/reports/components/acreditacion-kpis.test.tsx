import { render, screen } from '@testing-library/react';
import { AcreditacionKpis } from './acreditacion-kpis';

describe('AcreditacionKpis', () => {
  it('muestra el porcentaje redondeado a entero', () => {
    render(
      <AcreditacionKpis totalResponses={42} employedPercent={78.6} averageInsertionMonths={5.4} />,
    );
    expect(screen.getByText('79 %')).toBeTruthy();
  });

  it('muestra el promedio con 1 decimal y coma', () => {
    render(
      <AcreditacionKpis totalResponses={42} employedPercent={78.6} averageInsertionMonths={5.4} />,
    );
    expect(screen.getByText('5,4 meses')).toBeTruthy();
  });

  it('muestra «Sin datos» si nadie trabaja', () => {
    render(
      <AcreditacionKpis totalResponses={10} employedPercent={0} averageInsertionMonths={null} />,
    );
    expect(screen.getByText('Sin datos')).toBeTruthy();
  });
});