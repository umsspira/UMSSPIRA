import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MentorInterestsDemo } from './mentor-interests-demo';
import { getMentorProfile } from '../services/mentorship-api';
import { getMentorAreas } from '../services/mentor-areas-api';
import { getMentorInterests } from '../services/mentor-interests-api';
import { getMentorAvailability } from '../services/mentor-availability-api';
import { getMentorSchedule } from '../services/mentor-schedule-api';
import { getMentorProfileInformation } from '../services/mentor-profile-info-api';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
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
jest.mock('../services/mentor-schedule-api');
jest.mock('../services/mentor-profile-info-api');

const profile = jest.mocked(getMentorProfile);
const areas = jest.mocked(getMentorAreas);
const interests = jest.mocked(getMentorInterests);
const availability = jest.mocked(getMentorAvailability);
const schedule = jest.mocked(getMentorSchedule);
const information = jest.mocked(getMentorProfileInformation);

beforeEach(() => {
  jest.resetAllMocks();
  profile.mockResolvedValue({ isActive: false, requirements: { egresado: true } });
  areas.mockResolvedValue({ areas: [], selectedIds: [] });
  interests.mockResolvedValue({ catalog: [], configuration: { areaIds: [], topicIds: [] } });
  availability.mockResolvedValue({ availabilityStatus: null, fecha_actualizacion: null });
  schedule.mockResolvedValue({ schedule: [], fecha_actualizacion: null });
  information.mockResolvedValue({ nombre: 'Mentor', exists: false, profile: null });
});

it('conecta las áreas de prueba con los intereses y conserva lo confirmado al volver', async () => {
  render(<MentorInterestsDemo />);
  fireEvent.click(screen.getByRole('button', { name: 'Modificar áreas técnicas' }));
  fireEvent.click(screen.getByLabelText('Bases de datos'));
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar áreas de prueba' }));
  expect(screen.queryByRole('button', { name: 'PostgreSQL' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Laravel' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y continuar' }));
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Guardar y continuar' }));
  await screen.findByText(/Intereses guardados correctamente/);
  fireEvent.click(screen.getByRole('button', { name: 'Modificar áreas técnicas' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(screen.getByRole('button', { name: 'Laravel' })).toHaveAttribute('aria-pressed', 'true');
});

it('no muestra éxito si falla el guardado y permite reintentar', async () => {
  render(<MentorInterestsDemo />);
  fireEvent.click(screen.getByLabelText('Simular error al guardar'));
  fireEvent.click(screen.getByRole('button', { name: 'Laravel' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y continuar' }));
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Guardar y continuar' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron guardar');
  expect(screen.queryByText(/Intereses guardados correctamente/)).not.toBeInTheDocument();
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Seguir editando' }));
  fireEvent.click(screen.getByLabelText('Simular error al guardar'));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y continuar' }));
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Guardar y continuar' }));
  await screen.findByText(/Intereses guardados correctamente/);
});
