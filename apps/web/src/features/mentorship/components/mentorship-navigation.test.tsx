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

it('no añade una navegación secundaria al contenido de Mentorías', async () => {
  render(<MentorshipNavigation><p>Contenido permitido</p></MentorshipNavigation>);

  expect(screen.getByText('Contenido permitido')).toBeInTheDocument();
  expect(screen.queryByRole('navigation', { name: 'Navegación de Mentorías' })).not.toBeInTheDocument();
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
