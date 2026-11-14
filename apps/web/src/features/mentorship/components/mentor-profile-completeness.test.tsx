import '@testing-library/jest-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MentorProfileCompleteness } from './mentor-profile-completeness';
import { MentorConfiguration } from './mentor-configuration';
import { getMentorProfile } from '../services/mentorship-api';
import { getMentorAreas } from '../services/mentor-areas-api';
import { getMentorInterests } from '../services/mentor-interests-api';
import { getMentorAvailability } from '../services/mentor-availability-api';
import { getMentorProfileInformation } from '../services/mentor-profile-info-api';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
jest.mock('../services/mentorship-api');
jest.mock('../services/mentor-areas-api');
jest.mock('../services/mentor-interests-api');
jest.mock('../services/mentor-availability-api');
jest.mock('../services/mentor-profile-info-api');

const profile = jest.mocked(getMentorProfile);
const areas = jest.mocked(getMentorAreas);
const interests = jest.mocked(getMentorInterests);
const availability = jest.mocked(getMentorAvailability);
const information = jest.mocked(getMentorProfileInformation);

type ProfileInformation = Awaited<ReturnType<typeof getMentorProfileInformation>>;

function setProfileState({
  active = false,
  selectedAreaIds = [],
  topicIds = [],
  availabilityStatus = null,
  profileInfo = { nombre: 'Mentor', exists: false, profile: null },
}: {
  active?: boolean;
  selectedAreaIds?: string[];
  topicIds?: string[];
  availabilityStatus?: 'DISPONIBLE' | 'EN_PAUSA' | 'NO_DISPONIBLE' | null;
  profileInfo?: ProfileInformation;
} = {}) {
  profile.mockResolvedValue({ isActive: active, requirements: { egresado: true } });
  areas.mockResolvedValue({ areas: [], selectedIds: selectedAreaIds });
  interests.mockResolvedValue({ catalog: [], configuration: { areaIds: [], topicIds } });
  availability.mockResolvedValue({ availabilityStatus, fecha_actualizacion: null });
  information.mockResolvedValue(profileInfo);
}

beforeEach(() => {
  jest.resetAllMocks();
  setProfileState();
});

it('muestra 0 %, todas las secciones pendientes y enlaces directos descriptivos para un perfil nuevo', async () => {
  render(<MentorProfileCompleteness />);

  const progress = await screen.findByRole('progressbar', { name: 'Progreso del perfil de mentor' });
  expect(progress).toHaveAttribute('aria-valuemin', '0');
  expect(progress).toHaveAttribute('aria-valuemax', '100');
  expect(progress).toHaveAttribute('aria-valuenow', '0');
  expect(progress).toHaveAttribute('aria-valuetext', expect.stringContaining('0 por ciento'));
  expect(screen.getAllByText('Pendiente')).toHaveLength(5);

  const links = screen.getAllByRole('link');
  expect(links.map(link => link.getAttribute('href'))).toEqual([
    '/mentorship/profile#first-incomplete',
    '/mentorship/profile/areas#first-incomplete',
    '/mentorship/profile/interests#first-incomplete',
    '/mentorship/profile/availability#first-incomplete',
    '/mentorship/profile/information?edit=1#first-incomplete',
  ]);
  expect(links.every(link => /Completar .+/.test(link.textContent ?? ''))).toBe(true);
});

it('marca una seccion pendiente si falta un campo obligatorio y llega a 100 % cuando todos estan completos', async () => {
  setProfileState({
    active: true,
    selectedAreaIds: ['area-1'],
    topicIds: ['topic-1'],
    availabilityStatus: 'NO_DISPONIBLE',
    profileInfo: { nombre: 'Mentor', exists: true, profile: { descripcion: 'Descripción', experiencia: '   ' } },
  });
  render(<MentorProfileCompleteness />);

  const progress = await screen.findByRole('progressbar', { name: 'Progreso del perfil de mentor' });
  expect(progress).toHaveAttribute('aria-valuenow', '80');
  expect(progress).toHaveAttribute('aria-valuetext', expect.stringContaining('4 de 5'));
  expect(screen.getAllByRole('link')).toHaveLength(1);

  profile.mockResolvedValue({ isActive: true, requirements: { egresado: true } });
  areas.mockResolvedValue({ areas: [], selectedIds: ['area-1'] });
  interests.mockResolvedValue({ catalog: [], configuration: { areaIds: [], topicIds: ['topic-1'] } });
  availability.mockResolvedValue({ availabilityStatus: 'DISPONIBLE', fecha_actualizacion: null });
  information.mockResolvedValue({ nombre: 'Mentor', exists: true, profile: { descripcion: 'Descripción', experiencia: 'Experiencia' } });
  await act(async () => { window.dispatchEvent(new PopStateEvent('popstate')); });

  await waitFor(() => expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100'));
  expect(screen.getByText('¡Tu perfil de mentor está completo!')).toBeInTheDocument();
  expect(screen.queryByRole('link')).not.toBeInTheDocument();
});

it('actualiza los datos cuando se regresa al indicador mediante la navegacion del navegador', async () => {
  areas.mockResolvedValueOnce({ areas: [], selectedIds: [] }).mockResolvedValueOnce({ areas: [], selectedIds: ['area-1'] });
  render(<MentorProfileCompleteness />);

  expect(await screen.findByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  await act(async () => { window.dispatchEvent(new PopStateEvent('popstate')); });

  await waitFor(() => expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '20'));
  expect(areas).toHaveBeenCalledTimes(2);
});

it('muestra botones blancos en secciones configuradas y naranjas en las pendientes', () => {
  render(<MentorConfiguration completion={{
    participation: true,
    areas: true,
    interests: true,
    availability: false,
    information: true,
  }} />);

  expect(screen.getByRole('link', { name: /Configurar áreas/ })).toHaveClass('mentor-button-secondary');
  expect(screen.getByRole('link', { name: /Configurar intereses/ })).toHaveClass('mentor-button-secondary');
  expect(screen.getByRole('link', { name: /Configurar disponibilidad/ })).toHaveClass('mentor-button-primary');
  expect(screen.getByRole('link', { name: /Agregar información/ })).toHaveClass('mentor-button-secondary');
});
