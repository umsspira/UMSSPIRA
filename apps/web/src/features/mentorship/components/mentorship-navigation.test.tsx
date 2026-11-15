import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MentorshipNavigation } from './mentorship-navigation';
import { getMentorProfile } from '../services/mentorship-api';

const replace = jest.fn();
const mockRouter = { replace };
let mockPathname = '/mentorship';

jest.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useRouter: () => mockRouter,
}));

jest.mock('../services/mentorship-api', () => ({
  getMentorProfile: jest.fn(),
}));

const getProfile = jest.mocked(getMentorProfile);

beforeEach(() => {
  mockPathname = '/mentorship';
  jest.clearAllMocks();
  getProfile.mockResolvedValue({ isActive: false, requirements: { egresado: false } });
});

it('muestra solo opciones generales y de activación si el titulado es elegible pero aún no es mentor', async () => {
  getProfile.mockResolvedValue({ isActive: false, requirements: { egresado: true } });
  render(<MentorshipNavigation><p>Contenido permitido</p></MentorshipNavigation>);

  expect(await screen.findByRole('link', { name: 'Activar participación como mentor' })).toHaveAttribute('href', '/mentorship/profile');
  expect(screen.getByRole('link', { name: 'Explorar mentores' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Mis solicitudes' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Solicitudes recibidas' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Mis áreas técnicas' })).not.toBeInTheDocument();
});

it('no ofrece activar mentoría a un usuario no elegible', async () => {
  render(<MentorshipNavigation><p>Contenido permitido</p></MentorshipNavigation>);

  await waitFor(() => expect(getProfile).toHaveBeenCalled());
  expect(screen.queryByRole('link', { name: 'Activar participación como mentor' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Mi disponibilidad' })).not.toBeInTheDocument();
});

it('muestra todas las opciones de mentor activo', async () => {
  getProfile.mockResolvedValue({ isActive: true, requirements: { egresado: true } });
  render(<MentorshipNavigation><p>Contenido permitido</p></MentorshipNavigation>);

  expect(await screen.findByRole('link', { name: 'Solicitudes recibidas' })).toHaveAttribute('href', '/mentorship/requests/received');
  expect(screen.getByRole('link', { name: 'Mi perfil de mentor' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Mis áreas técnicas' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Mi disponibilidad' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Activar participación como mentor' })).not.toBeInTheDocument();
});

it('oculta el contenido exclusivo mientras verifica permiso y redirige si la cuenta no es mentora', async () => {
  mockPathname = '/mentorship/profile/areas';
  let resolveProfile!: (profile: Awaited<ReturnType<typeof getMentorProfile>>) => void;
  getProfile.mockReturnValue(new Promise(resolve => { resolveProfile = resolve; }));
  render(<MentorshipNavigation><p>Contenido exclusivo</p></MentorshipNavigation>);

  expect(screen.queryByText('Contenido exclusivo')).not.toBeInTheDocument();
  resolveProfile({ isActive: false, requirements: { egresado: true } });

  expect(await screen.findByRole('alert')).toHaveTextContent('Esta sección es solo para mentores');
  await waitFor(() => expect(replace).toHaveBeenCalledWith('/mentorship'));
  expect(screen.queryByText('Contenido exclusivo')).not.toBeInTheDocument();
});

it('falla de forma segura ante error de permisos y permite reintentar', async () => {
  getProfile.mockRejectedValueOnce(new Error('Servicio no disponible'));
  render(<MentorshipNavigation><p>Contenido permitido</p></MentorshipNavigation>);

  expect(await screen.findByRole('alert')).toHaveTextContent('Solo se muestran las opciones generales');
  expect(screen.queryByRole('link', { name: 'Solicitudes recibidas' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  await waitFor(() => expect(getProfile).toHaveBeenCalledTimes(2));
});
