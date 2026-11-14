import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';

import { BackButton } from './back-button';

describe('BackButton', () => {
  it('con href es un enlace legible y cómodo de tocar', () => {
    render(<BackButton href="/profile" />);

    const link = screen.getByRole('link', { name: 'Volver' });
    expect(link).toHaveAttribute('href', '/profile');
    expect(link).toHaveClass('min-h-[44px]', 'text-[15px]');
  });

  it('returnTo tiene prioridad sobre href', () => {
    render(<BackButton href="/profile" returnTo="/afinidad" />);

    expect(screen.getByRole('link', { name: 'Volver' })).toHaveAttribute('href', '/afinidad');
  });

  it('usa el aria-label completo cuando se indica', () => {
    render(<BackButton href="/profile/records" ariaLabel="Volver a Mis registros" />);

    expect(screen.getByRole('link', { name: 'Volver a Mis registros' })).toHaveTextContent('Volver');
  });

  it('sin destino es un botón que llama a onClick', () => {
    const onClick = jest.fn();
    render(<BackButton label="Volver al formulario" onClick={onClick} />);

    fireEvent.click(screen.getByRole('button', { name: 'Volver al formulario' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('tiene el mismo estilo como enlace y como botón', () => {
    render(
      <>
        <BackButton href="/profile" />
        <BackButton onClick={jest.fn()} />
      </>,
    );

    expect(screen.getByRole('link').className).toBe(screen.getByRole('button').className);
  });
});
