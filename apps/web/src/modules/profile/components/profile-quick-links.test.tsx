import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';

import { ProfileQuickLinks } from './profile-quick-links';

describe('ProfileQuickLinks', () => {
  it('ofrece camino directo a Mi perfil, Mis registros y Mi afinidad', () => {
    render(<ProfileQuickLinks />);

    const nav = screen.getByRole('navigation', { name: 'Accesos del perfil' });
    expect(within(nav).getByRole('link', { name: 'Mi perfil' })).toHaveAttribute('href', '/profile');
    expect(within(nav).getByRole('link', { name: 'Mis registros' })).toHaveAttribute('href', '/profile/records');
    expect(within(nav).getByRole('link', { name: 'Mi afinidad' })).toHaveAttribute('href', '/afinidad');
  });

  it('marca la pantalla actual y no la enlaza a sí misma', () => {
    render(<ProfileQuickLinks current="/profile/records" />);

    expect(screen.queryByRole('link', { name: 'Mis registros' })).not.toBeInTheDocument();
    expect(screen.getByText('Mis registros')).toHaveAttribute('aria-current', 'page');
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });

  it('en celular los accesos bajan de línea y se pueden tocar', () => {
    render(<ProfileQuickLinks />);

    expect(screen.getByRole('navigation')).toHaveClass('flex-wrap');
    screen.getAllByRole('link').forEach((link) => expect(link).toHaveClass('min-h-[44px]'));
  });
});
