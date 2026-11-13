import { act, render, screen, waitFor } from '@testing-library/react';
import { MentorshipSubnav } from './mentorship-subnav';
import { notifyMentorParticipationChanged } from '../model/participation-events';
import { getMentorProfile } from '../services/mentorship-api';

jest.mock('../services/mentorship-api');

const getProfile = jest.mocked(getMentorProfile);
const inactive = { isActive: false, requirements: { egresado: true } };
const active = { isActive: true, requirements: { egresado: true } };

let mockPathname = '/mentorship/directory';
let mockQuery = '';

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => new URLSearchParams(mockQuery),
}));

const subnav = () => screen.getByRole('navigation', { name: 'Navegación de mentorías' });
const links = () => subnav().querySelectorAll('a');

beforeEach(() => {
  jest.resetAllMocks();
  getProfile.mockResolvedValue(inactive);
  mockPathname = '/mentorship/directory';
  mockQuery = '';
});

it('CA-F 01/02/04: un solicitante sin perfil de mentor ve una sola barra con 3 opciones', async () => {
  render(<MentorshipSubnav />);

  expect(screen.getAllByRole('navigation', { name: 'Navegación de mentorías' })).toHaveLength(1);
  await waitFor(() => expect(getProfile).toHaveBeenCalledTimes(1));
  expect(links()).toHaveLength(3);
  expect(Array.from(links()).map(link => link.textContent)).toEqual([
    'Inicio',
    'Explorar mentores',
    'Mis solicitudes',
  ]);
  expect(screen.queryByRole('link', { name: 'Mi perfil de mentor' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Solicitudes recibidas' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Explorar mentores' })).toHaveAttribute('aria-current', 'page');
});

it('CA-F 03/04: un mentor habilitado ve las 5 opciones, cada una con su ícono y una sola activa', async () => {
  getProfile.mockResolvedValue(active);
  render(<MentorshipSubnav />);

  await waitFor(() => expect(links()).toHaveLength(5));
  expect(Array.from(links()).map(link => link.textContent)).toEqual([
    'Inicio',
    'Explorar mentores',
    'Mis solicitudes',
    'Mi perfil de mentor',
    'Solicitudes recibidas',
  ]);
  Array.from(links()).forEach(link => expect(link.querySelector('svg')).not.toBeNull());
  expect(subnav().querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  expect(screen.getByRole('link', { name: 'Explorar mentores' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: 'Explorar mentores' })).toHaveAttribute('href', '/mentorship/directory');
});

it('CA-F 05/06: conserva una sola barra y actualiza la única pestaña activa en cada sección', async () => {
  getProfile.mockResolvedValue(active);
  const { rerender } = render(<MentorshipSubnav />);
  await waitFor(() => expect(links()).toHaveLength(5));

  const cases = [
    ['/mentorship', '', 'Inicio'],
    ['/mentorship/directory', '', 'Explorar mentores'],
    ['/mentorship/mentors/mentor-1', '', 'Explorar mentores'],
    ['/mentorship/request/mentor-1', '', 'Explorar mentores'],
    ['/mentorship/requests/received', 'view=sent', 'Mis solicitudes'],
    ['/mentorship/requests', '', 'Mis solicitudes'],
    ['/mentorship/profile/availability', '', 'Mi perfil de mentor'],
    ['/mentorship/requests/received', '', 'Solicitudes recibidas'],
  ];

  for (const [pathname, query, label] of cases) {
    mockPathname = pathname;
    mockQuery = query;
    rerender(<MentorshipSubnav />);

    expect(screen.getAllByRole('navigation', { name: 'Navegación de mentorías' })).toHaveLength(1);
    const current = subnav().querySelectorAll('[aria-current="page"]');
    expect(current).toHaveLength(1);
    expect(current[0]).toHaveTextContent(label);
  }
});

it('CA-F 05: mantiene visible la pestaña Mi perfil de mentor en sus subrutas aunque la participación esté inactiva', async () => {
  mockPathname = '/mentorship/profile/information';
  render(<MentorshipSubnav />);

  await waitFor(() => expect(getProfile).toHaveBeenCalledTimes(1));
  expect(links()).toHaveLength(5);
  expect(screen.getByRole('link', { name: 'Mi perfil de mentor' })).toHaveAttribute('aria-current', 'page');
  expect(subnav().querySelectorAll('[aria-current="page"]')).toHaveLength(1);
});

it('CA-F 03: actualiza la barra cuando cambia la participación como mentor', async () => {
  render(<MentorshipSubnav />);
  await waitFor(() => expect(getProfile).toHaveBeenCalledTimes(1));
  expect(links()).toHaveLength(3);

  getProfile.mockResolvedValue(active);
  act(() => notifyMentorParticipationChanged());

  await waitFor(() => expect(links()).toHaveLength(5));
  expect(getProfile).toHaveBeenCalledTimes(2);
});

it('aborta la consulta de participación al salir del módulo', async () => {
  const view = render(<MentorshipSubnav />);
  await waitFor(() => expect(getProfile).toHaveBeenCalledTimes(1));
  const signal = getProfile.mock.calls[0][0];

  view.unmount();

  expect(signal?.aborted).toBe(true);
});
