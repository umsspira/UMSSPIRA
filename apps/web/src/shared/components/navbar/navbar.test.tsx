import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Navbar } from './navbar';
import { getMentorProfile } from '@/features/mentorship/services/mentorship-api';

jest.mock('next/navigation', () => ({
  usePathname: () => '/portal',
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@/features/mentorship/services/mentorship-api', () => ({
  getMentorProfile: jest.fn(),
}));

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href as string} {...props}>{children}</a>
  ),
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('./messages-button', () => ({ MessagesButton: () => null }));
jest.mock('./activity-panel', () => ({ ActivityPanel: () => null }));
jest.mock('./search-dialog', () => ({ NavbarSearch: () => null }));

const getProfile = jest.mocked(getMentorProfile);
const session = { name: 'Ana', role: 'titulado' as const, initials: 'AN' };

beforeEach(() => {
  jest.clearAllMocks();
});

it('muestra las opciones de mentoría solo después de confirmar que el mentor está activo', async () => {
  getProfile.mockResolvedValue({ isActive: false, requirements: { egresado: true } });
  const view = render(<Navbar session={session} onLogout={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Mentorías' }));

  expect(await screen.findByRole('link', { name: 'Mis solicitudes' }))
    .toHaveAttribute('href', '/mentorship/requests');
  expect(screen.queryByRole('link', { name: 'Solicitudes recibidas' })).not.toBeInTheDocument();

  view.unmount();
  getProfile.mockResolvedValue({ isActive: true, requirements: { egresado: true } });
  render(<Navbar session={session} onLogout={jest.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Mentorías' }));

  await waitFor(() => expect(screen.getByRole('link', { name: 'Solicitudes recibidas' }))
    .toHaveAttribute('href', '/mentorship/requests/received'));
  expect(screen.getByRole('link', { name: 'Mi perfil' })).toHaveAttribute('href', '/mentorship/profile');
  expect(screen.getByRole('link', { name: 'Información' })).toHaveAttribute('href', '/mentorship/profile/information');
  expect(screen.getByRole('link', { name: 'Áreas' })).toHaveAttribute('href', '/mentorship/profile/areas');
  expect(screen.getByRole('link', { name: 'Intereses' })).toHaveAttribute('href', '/mentorship/profile/interests');
  expect(screen.getByRole('link', { name: 'Disponibilidad' })).toHaveAttribute('href', '/mentorship/profile/availability');
});

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
