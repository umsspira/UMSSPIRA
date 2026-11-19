import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RecruiterCandidatesView } from './recruiter-candidates-view';

describe('RecruiterCandidatesView', () => {
  it('muestra el estado de dependencia por defecto y no datos de ejemplo', () => {
    render(<RecruiterCandidatesView />);

    expect(
      screen.getByText('Esta vista aún no está disponible'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Épica 4 \(contrato de candidatos\)/)).toBeInTheDocument();
    expect(screen.queryByTestId('recruiter-demo-notice')).not.toBeInTheDocument();
    expect(screen.queryByText('Ana Sofía Gutiérrez')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Comparativa de Titulados & Hexágonos de Afinidad'),
    ).not.toBeInTheDocument();
  });

  it('solo revela la demostración cuando se solicita explícitamente', () => {
    render(<RecruiterCandidatesView />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Ver demostración con datos de ejemplo' }),
    );

    expect(screen.getByTestId('recruiter-demo-notice')).toHaveTextContent(
      'datos de ejemplo y no corresponden a postulaciones reales',
    );
    expect(screen.getAllByText('Ana Sofía Gutiérrez').length).toBeGreaterThan(0);
    expect(
      screen.getByText('Mostrando 1 - 3 de 8 candidatos'),
    ).toBeInTheDocument();
  });

  it('permite abrir la demostración al montar para pruebas o demos', () => {
    render(<RecruiterCandidatesView initialDemoMode />);

    expect(screen.getByTestId('recruiter-demo-notice')).toBeInTheDocument();
    expect(screen.getAllByText('Ana Sofía Gutiérrez').length).toBeGreaterThan(0);
  });

  it('ordena la demostración con el buscador provisto por la vista', async () => {
    render(<RecruiterCandidatesView initialDemoMode />);

    fireEvent.change(
      screen.getByPlaceholderText(/Senior Full Stack, Cloud & Microservicios/),
      { target: { value: 'cloud' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));

    await waitFor(() => {
      const headings = screen
        .getAllByRole('heading', { level: 3 })
        .map((heading) => heading.textContent);

      // El encabezado de la sección es el primer h3; la primera tarjeta es la siguiente.
      expect(headings[1]).toBe('Luis Ramírez');
    });
  });

  it('no muestra el panel de evidencia sin candidato seleccionado', () => {
    render(<RecruiterCandidatesView />);

    expect(
      screen.queryByRole('heading', { name: /Desglose de Evidencia/ }),
    ).not.toBeInTheDocument();
  });

  it('mantiene la demostración separada de la vista operativa', () => {
    const { container } = render(<RecruiterCandidatesView initialDemoMode />);

    expect(screen.getByTestId('recruiter-demo-notice')).toHaveTextContent(
      'datos de ejemplo',
    );
    expect(container.querySelector('a[href="/companies"]')).toBeInTheDocument();
  });
});
