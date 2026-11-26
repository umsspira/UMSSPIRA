import { render, screen } from '@testing-library/react';
import AyudaBolsaTrabajoPage from '@/app/(dashboard)/ayuda/bolsa-de-trabajo/page';
import { ComoFuncionaAfinidad, FORMULA_AFINIDAD } from './como-funciona-afinidad';

describe('ComoFuncionaAfinidad', () => {
  it('muestra la fórmula del CA-07, los pesos de la HU-11 y los tres ejemplos del CA-08', () => {
    render(<ComoFuncionaAfinidad />);
    expect(FORMULA_AFINIDAD).toBe('Afinidad = requisitos cumplidos ÷ total de requisitos');
    expect(screen.getByText(FORMULA_AFINIDAD)).toBeInTheDocument();
    expect(screen.getByText(/suma el requisito completo/)).toBeInTheDocument();
    expect(screen.getByText(/suma la mitad del requisito/)).toBeInTheDocument();
    expect(screen.getAllByText('0 %')).toHaveLength(2);
    expect(screen.getAllByText('67 %')).toHaveLength(2);
    expect(screen.getAllByText('100 %')).toHaveLength(2);
  });

  it('no muestra el texto de más que no está en el mock-up (bug 1 del QA)', () => {
    render(<ComoFuncionaAfinidad />);
    expect(screen.queryByText(/se redondea al entero/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ejemplos educativos/)).not.toBeInTheDocument();
    expect(screen.queryByText(/alias, plural o género/)).not.toBeInTheDocument();
    expect(screen.queryByText(/React Native/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Java no cumple JavaScript/)).not.toBeInTheDocument();
  });

  it('permite ajustar el peso parcial si la HU-11 lo cambia', () => {
    render(<ComoFuncionaAfinidad pesoParcial={30} />);
    expect(screen.getByText(/suma el 30 % del requisito/)).toBeInTheDocument();
  });

  it('se muestra en la pestaña «Cómo funciona la afinidad» de la página de ayuda', () => {
    render(<AyudaBolsaTrabajoPage searchParams={{ tab: 'afinidad' }} />);
    expect(screen.getByRole('heading', { name: 'Fórmula' })).toBeVisible();
    expect(screen.getByText(FORMULA_AFINIDAD)).toBeVisible();
    expect(screen.queryByText('Contenido de afinidad pendiente')).not.toBeInTheDocument();
  });
});
