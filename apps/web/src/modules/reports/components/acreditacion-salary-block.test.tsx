import { render, screen } from '@testing-library/react';
import { AcreditacionSalaryBlock } from './acreditacion-salary-block';

describe('AcreditacionSalaryBlock', () => {
  it('muestra siempre los cinco rangos, aunque no lleguen datos', () => {
    render(<AcreditacionSalaryBlock ranges={[]} />);
    for (const range of ['0–2.999', '3.000–5.000', '5.001–8.000', '8.001–12.000', '12.001–21.000']) {
      expect(screen.getByText(range)).toBeTruthy();
    }
  });
});