import { fireEvent, render, screen } from '@testing-library/react';
import { ComoSeCalculaModal } from './como-se-calcula-modal';

const datos = [
  { requirement: 'Node.js', matchedSkill: 'Node.js', result: 'exact' as const },
  { requirement: 'PostgreSQL', matchedSkill: 'PostgreSQL', result: 'exact' as const },
  { requirement: 'Docker', matchedSkill: null, result: 'not-found' as const },
];

describe('ComoSeCalculaModal', () => {
  it('muestra los requisitos y la explicación coherente con el 67 % informado', () => {
    render(<ComoSeCalculaModal open onClose={jest.fn()} percentage={67} comparison={datos} />);
    expect(screen.getByRole('dialog', { name: '¿Cómo se calcula?' })).toBeInTheDocument();
    expect(screen.getByText('2 de 3 requisitos = 67 %')).toBeInTheDocument();
    expect(screen.getAllByText('Exacta')).toHaveLength(2);
    expect(screen.getByText('No encontrada')).toBeInTheDocument();
  });

  it('muestra el equivalente ponderado cuando llegan pesos coherentes del motor', () => {
    const comparison = [
      { requirement: 'React', matchedSkill: 'React', result: 'exact' as const, weight: 1 },
      { requirement: 'Docker Compose', matchedSkill: 'Docker', result: 'similar' as const, weight: 0.5 },
    ];
    render(<ComoSeCalculaModal open onClose={jest.fn()} percentage={75} comparison={comparison} />);
    expect(screen.getByText('Similar')).toBeInTheDocument();
    expect(screen.getByText('1,5 de 2 requisitos equivalentes = 75 %')).toBeInTheDocument();
  });

  it('sin weight de la API, usa el peso parcial de la HU-11 y muestra la cuenta (CA-10)', () => {
    const comparison = [
      { requirement: 'Node.js', matchedSkill: 'Node.js', result: 'exact' as const },
      { requirement: 'PostgreSQL', matchedSkill: 'Postgres', result: 'similar' as const },
      { requirement: 'Docker', matchedSkill: null, result: 'not-found' as const },
    ];
    render(<ComoSeCalculaModal open onClose={jest.fn()} percentage={50} comparison={comparison} />);
    expect(screen.getByText('1 exacta + 1 parcial de 3 requisitos = 50 %')).toBeInTheDocument();
    expect(screen.getByText('Similar')).toBeInTheDocument();
  });

  it('acepta el redondeo a entero de la API en la cuenta con parciales', () => {
    const comparison = [
      { requirement: 'React', matchedSkill: 'React', result: 'exact' as const },
      { requirement: 'TypeScript', matchedSkill: 'TypeScript', result: 'exact' as const },
      { requirement: 'Next.js', matchedSkill: 'React', result: 'similar' as const },
    ];
    render(<ComoSeCalculaModal open onClose={jest.fn()} percentage={83} comparison={comparison} />);
    expect(screen.getByText('2 exactas + 1 parcial de 3 requisitos = 83 %')).toBeInTheDocument();
  });

  it('no inventa la cuenta si el porcentaje recibido no corresponde a los pesos', () => {
    render(
      <ComoSeCalculaModal
        open
        onClose={jest.fn()}
        percentage={30}
        comparison={[{ requirement: 'React Native', matchedSkill: 'React', result: 'similar' }]}
      />,
    );
    expect(screen.getByText('Afinidad informada por el motor: 30 %')).toBeInTheDocument();
    expect(screen.getByText(/no se recalcula aquí/)).toBeInTheDocument();
  });

  it('se cierra tanto por Entendido como por X y Escape', () => {
    const cerrar = jest.fn();
    const { rerender } = render(<ComoSeCalculaModal open onClose={cerrar} percentage={67} comparison={datos} />);
    fireEvent.click(screen.getByRole('button', { name: 'Entendido' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar explicación' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(cerrar).toHaveBeenCalledTimes(3);
    rerender(<ComoSeCalculaModal open={false} onClose={cerrar} percentage={67} comparison={datos} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('presenta estado sin desglose sin construir porcentajes falsos', () => {
    render(<ComoSeCalculaModal open onClose={jest.fn()} percentage={0} comparison={[]} />);
    expect(screen.getByText('El desglose por requisito todavía no está disponible.')).toBeInTheDocument();
  });
});
