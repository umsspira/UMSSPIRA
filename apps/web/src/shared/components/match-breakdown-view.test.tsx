import { fireEvent, render, screen, within } from '@testing-library/react';
import type { Applicant } from '../types/applicant';
import { MatchBreakdownView } from './match-breakdown-view';

const applicant: Applicant = {
  id: 'test',
  name: 'Postulante de prueba',
  email: 'prueba@example.com',
  location: null,
  experienceLevel: null,
  status: 'Postulado',
  appliedAt: null,
  cvUrl: null,
  matchPercentage: 80,
  skills: [{ skill: 'React', percentage: 80 }],
};

it('presenta el desglose como lista textual y permite navegar las pestañas con teclado', () => {
  render(<MatchBreakdownView applicant={applicant} />);

  const tab = screen.getByRole('tab', { name: 'Coincidencia técnica' });
  const panel = screen.getByRole('tabpanel', { name: 'Coincidencia técnica' });
  expect(tab).toHaveAttribute('aria-controls', panel.id);
  expect(within(panel).getByRole('list')).toHaveTextContent('React');
  expect(within(panel).getByRole('list')).toHaveTextContent('80%');

  tab.focus();
  fireEvent.keyDown(tab, { key: 'ArrowRight' });
  expect(screen.getByRole('tab', { name: 'CV' })).toHaveFocus();
  expect(screen.getByRole('tab', { name: 'CV' })).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByRole('tabpanel', { name: 'CV' })).toHaveTextContent('CV no disponible');
});
