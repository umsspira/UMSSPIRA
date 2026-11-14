import { render, screen } from '@testing-library/react';
import { Navbar } from './navbar';

jest.mock('next/navigation', () => ({
  usePathname: () => '/mis-pases',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('./messages-button', () => ({
  MessagesButton: () => null,
}));

function primaryNavigationLabels(currentPath: string): string[] {
  const view = render(
    <Navbar
      session={{ name: 'Ana', role: 'titulado', initials: 'AN' }}
      onLogout={jest.fn()}
      currentPath={currentPath}
    />,
  );
  const navigation = screen.getByRole('navigation', { name: 'Navegación principal' });
  const labels = Array.from(navigation.querySelectorAll('a, button'))
    .map((item) => item.textContent?.trim().replace(/\s+/g, ' ') ?? '');
  view.unmount();
  return labels;
}

it('mantiene la misma navegación superior en Mis pases y Mis eventos', () => {
  expect(primaryNavigationLabels('/mis-pases'))
    .toEqual(primaryNavigationLabels('/portal/eventos/mis-eventos'));
});
