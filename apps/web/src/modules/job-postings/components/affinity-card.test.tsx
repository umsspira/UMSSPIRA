import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import AffinityCard from './affinity-card';
import type { VacancyAffinityResponse } from '@umsspira/shared-types';

describe('AffinityCard Component', () => {
  const vacancyId = '80000000-0000-4000-8000-000000000001';

  it('debe renderizar el porcentaje de afinidad, badge vigente y enlace a la comparación', () => {
    const mockAffinity: VacancyAffinityResponse = {
      idVacante: vacancyId,
      idEgresado: 'egresado-1',
      porcentaje: 86,
      estado: 'SUCCESS',
      mensaje: 'Afinidad calculada',
      calculadoEn: '2026-10-19T10:42:00.000Z',
    };

    render(
      <AffinityCard
        vacancyId={vacancyId}
        affinity={mockAffinity}
        comparisonHref="/job-postings/vac-1/afinidad"
      />,
    );

    expect(screen.getByRole('heading', { name: 'Tu afinidad con esta oferta' })).toBeInTheDocument();
    expect(screen.getByText('86 %')).toBeInTheDocument();
    expect(screen.getByText('Vigente')).toBeInTheDocument();
    expect(
      screen.getByText(/Estimación orientativa semántica ponderada/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Ver comparación/ }),
    ).toHaveAttribute('href', '/job-postings/vac-1/afinidad');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '86');
  });

  it('debe mostrar alerta clara y amigable ante un perfil incompleto (Criterio 7)', () => {
    const mockIncomplete: VacancyAffinityResponse = {
      idVacante: vacancyId,
      idEgresado: 'egresado-1',
      porcentaje: null,
      estado: 'INCOMPLETE_PROFILE',
      mensaje: 'El perfil profesional del egresado está incompleto.',
      calculadoEn: '2026-10-19T10:42:00.000Z',
    };

    render(<AffinityCard vacancyId={vacancyId} affinity={mockIncomplete} />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Perfil incompleto para evaluar afinidad',
    );
    expect(screen.getByRole('button', { name: 'Completar mi perfil' })).toBeInTheDocument();
    expect(screen.queryByText(/86 %/)).not.toBeInTheDocument();
  });

  it('debe indicar requisitos insuficientes sin inventar porcentajes (Criterio 8)', () => {
    const mockInsufficient: VacancyAffinityResponse = {
      idVacante: vacancyId,
      idEgresado: 'egresado-1',
      porcentaje: null,
      estado: 'INSUFFICIENT_REQUIREMENTS',
      mensaje: 'Esta vacante no cuenta con requisitos técnicos registrados.',
      calculadoEn: '2026-10-19T10:42:00.000Z',
    };

    render(<AffinityCard vacancyId={vacancyId} affinity={mockInsufficient} />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Requisitos técnicos insuficientes',
    );
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('debe capturar errores de NLP de forma controlada y permitir reintentar (Criterio 9)', () => {
    const onRetry = jest.fn();
    const mockError: VacancyAffinityResponse = {
      idVacante: vacancyId,
      idEgresado: 'egresado-1',
      porcentaje: null,
      estado: 'NLP_ERROR',
      mensaje: 'Servicio no disponible',
      calculadoEn: '2026-10-19T10:42:00.000Z',
    };

    render(
      <AffinityCard
        vacancyId={vacancyId}
        affinity={mockError}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Servicio temporalmente no disponible',
    );
    const retryBtn = screen.getByRole('button', { name: /Reintentar cálculo/ });
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
