import { render, screen } from '@testing-library/react';

import MiniRadarPlaceholder from './mini-radar-placeholder';

const VALUES = [82.6, 64, 51, 45, 38, 30];

describe('MiniRadarPlaceholder (HU-17)', () => {
  it('es una imagen accesible con las 6 áreas y sus porcentajes en el aria-label', () => {
    render(<MiniRadarPlaceholder values={VALUES} />);

    const radar = screen.getByRole('img');
    expect(radar).toHaveAccessibleName(
      'Mini radar de afinidad: Desarrollo de Software 83%, Cloud/Devops 64%, Ciencia de Datos/IA 51%, QA 45%, Ciberseguridad 38%, Gestión TI 30%',
    );
  });

  it('dibuja 6 ejes y una leyenda de 6 filas', () => {
    const { container } = render(<MiniRadarPlaceholder values={VALUES} />);

    expect(container.querySelectorAll('svg line')).toHaveLength(6);
    const rows = container.querySelectorAll('ol li');
    expect(rows).toHaveLength(6);
    expect(rows[0]).toHaveTextContent('1. Desarrollo de Software83%');
    expect(rows[5]).toHaveTextContent('6. Gestión TI30%');
  });

  it('pone 0% si falta un valor y recorta los valores fuera de 0 a 100', () => {
    const { container } = render(<MiniRadarPlaceholder values={[120, -5, 50, 50, 50]} />);

    const rows = container.querySelectorAll('ol li');
    expect(rows[0]).toHaveTextContent('100%');
    expect(rows[1]).toHaveTextContent('0%');
    expect(rows[5]).toHaveTextContent('0%');
  });

  // CA-06: se ajusta al ancho sin deformarse
  it('usa un viewBox cuadrado y aspect-square, sin ancho ni alto fijos', () => {
    render(<MiniRadarPlaceholder values={VALUES} />);

    const svg = screen.getByRole('img');
    expect(svg).toHaveAttribute('viewBox', '0 0 200 200');
    expect(svg).toHaveClass('aspect-square', 'w-full');
    expect(svg).not.toHaveAttribute('width');
    expect(svg).not.toHaveAttribute('height');
  });
});