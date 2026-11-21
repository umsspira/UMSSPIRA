import { render, screen } from '@testing-library/react';
import { MatchBreakdownView } from '@/shared/components/match-breakdown-view';
import type { Applicant } from '@/shared/types/applicant';

// Contrato de HU-15 (G6): el desglose llega como comparison[] del motor de afinidad
const applicant: Applicant = {
  id: 'prueba-1', name: 'Titulado de prueba', email: 'titulado@example.test', status: 'Postulado',
  appliedAt: null, hasCv: false, cvUrl: null, matchPercentage: null, matchStatus: null,
  matchCalculatedAt: null, comparison: [], matchError: null,
};

it('distingue el desglose ausente de los resultados recibidos', () => {
  const { rerender } = render(<MatchBreakdownView applicant={applicant} />);
  expect(screen.getByText(/no hay requisitos técnicos disponibles para comparar/i)).toBeInTheDocument();
  rerender(
    <MatchBreakdownView
      applicant={{
        ...applicant,
        matchPercentage: 80,
        matchStatus: 'ready',
        comparison: [{ requirement: 'SQL', matchedSkill: 'sql', result: 'exact' }],
      }}
    />,
  );
  expect(screen.getByText('SQL')).toBeInTheDocument();
  expect(screen.getByText('Exacta')).toBeInTheDocument();
});
