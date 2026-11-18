import { render, screen } from '@testing-library/react';
import { NavbarLinks } from './navbar-links';
import { navigationFor } from './navigation';

const items = navigationFor('titulado', true).find(section => section.id === 'mentorship')!.items;
const renderLinks = (currentPath: string) => render(
  <NavbarLinks items={items} currentPath={currentPath} resolveHref={href => href} onNavigate={() => {}} />,
);

it('BUG-06-1601: resalta "Mis solicitudes" solo cuando esa bandeja está abierta', () => {
  renderLinks('/mentorship/requests/received?view=sent');
  expect(screen.getByRole('link', { name: 'Mis solicitudes' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: 'Solicitudes recibidas' })).not.toHaveAttribute('aria-current');
});

it('BUG-06-1601: resalta "Solicitudes recibidas" solo cuando esa bandeja está abierta', () => {
  renderLinks('/mentorship/requests/received');
  expect(screen.getByRole('link', { name: 'Solicitudes recibidas' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: 'Mis solicitudes' })).not.toHaveAttribute('aria-current');
});

it('BUG-06-1604: muestra el ícono vectorial junto a cada destino del módulo', () => {
  const { container } = renderLinks('/mentorship');
  const link = screen.getByRole('link', { name: 'Explorar mentores' });
  expect(link.querySelector('svg')).not.toBeNull();
  expect(container.querySelectorAll('svg')).toHaveLength(items.length);
});
