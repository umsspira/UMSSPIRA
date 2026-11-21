import { render, screen } from '@testing-library/react';
import { MatchBreakdownView } from '@/shared/components/match-breakdown-view';
import type { Applicant } from '@/shared/types/applicant';

const applicant: Applicant = {
  id: 'prueba-1', name: 'Titulado de prueba', email: 'titulado@example.test', location: null,
  experienceLevel: null, status: 'Postulado', appliedAt: null, cvUrl: null, matchPercentage: null, skills: null,
};

it('distingue el desglose ausente de los resultados recibidos', () => {
  const { rerender } = render(<MatchBreakdownView applicant={applicant} />);
  expect(screen.getByText(/desglose por habilidades:/i)).toBeInTheDocument();
  rerender(<MatchBreakdownView applicant={{ ...applicant, matchPercentage: 80, skills: [{ skill: 'SQL', percentage: 70 }] }} />);
  expect(screen.getByText('SQL')).toBeInTheDocument();
  expect(screen.getByText(/70\s*%/)).toBeInTheDocument();
});
