import { fireEvent, render, screen } from '@testing-library/react';
import type { Applicant } from '../types/applicant';
import { MatchBreakdownView } from './match-breakdown-view';

const postulante: Applicant = {
  id: 'p-48',
  name: 'Postulante de prueba',
  email: 'postulante@example.com',
  location: null,
  experienceLevel: null,
  status: 'Postulado',
  appliedAt: '2026-11-20T10:00:00.000Z',
  hasCv: false,
  cvUrl: null,
  matchPercentage: 67,
  matchStatus: 'ready',
  matchCalculatedAt: null,
  comparison: [],
  matchError: null,
};

describe('MatchBreakdownView HU-20 T20.1', () => {
  it('abre el modal con desglose proporcionado por el motor, sin recalcularlo', () => {
    render(
      <MatchBreakdownView
        applicant={postulante}
        comparison={[
          { requirement: 'Node.js', matchedSkill: 'Node.js', result: 'exact' },
          { requirement: 'PostgreSQL', matchedSkill: 'PostgreSQL', result: 'exact' },
          { requirement: 'Docker', matchedSkill: null, result: 'not-found' },
        ]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '¿Cómo se calcula?' }));
    expect(screen.getByRole('dialog', { name: '¿Cómo se calcula?' })).toBeInTheDocument();
    expect(screen.getByText('2 de 3 requisitos = 67 %')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Entendido' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('no simula requisitos cuando el backend no entrega comparison', () => {
    render(<MatchBreakdownView applicant={postulante} />);
    fireEvent.click(screen.getByRole('button', { name: '¿Cómo se calcula?' }));
    expect(screen.getByText('El desglose por requisito todavía no está disponible.')).toBeInTheDocument();
    expect(screen.queryByText(/2 de 3 requisitos/)).not.toBeInTheDocument();
  });

  it('usa el desglose real que trae el postulante (HU-15) si no se pasa comparison', () => {
    render(
      <MatchBreakdownView
        applicant={{
          ...postulante,
          comparison: [
            { requirement: 'Node.js', matchedSkill: 'Node.js', result: 'exact' },
            { requirement: 'PostgreSQL', matchedSkill: 'PostgreSQL', result: 'exact' },
            { requirement: 'Docker', matchedSkill: null, result: 'not-found' },
          ],
        }}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: '¿Cómo se calcula?' }));
    expect(screen.getByText('2 de 3 requisitos = 67 %')).toBeInTheDocument();
  });

  it('no muestra enlace si el porcentaje no existe', () => {
    render(<MatchBreakdownView applicant={{ ...postulante, matchPercentage: null }} />);
    expect(screen.queryByRole('button', { name: '¿Cómo se calcula?' })).not.toBeInTheDocument();
  });
});
