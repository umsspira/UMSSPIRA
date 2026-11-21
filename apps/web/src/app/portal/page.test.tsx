import { render, screen } from '@testing-library/react';
import Page from './page';

describe('Portal Page · Validación Offline', () => {
  it('muestra los textos principales de la pantalla', () => {
    render(<Page />);

    expect(screen.getByText('Sprint 3 · Demo de calificación')).toBeInTheDocument();
    expect(screen.getByText('Validación del funcionamiento sin conexión.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Flujo en Modo Avión' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Auditoría y navegadores' })).toBeInTheDocument();
  });
});
