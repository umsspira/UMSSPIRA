import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MentorAvailabilityPage } from './mentor-availability-page';
import { getMentorAvailability, updateMentorAvailability } from '../services/mentor-availability-api';

jest.mock('../services/mentor-availability-api', () => ({
  ...jest.requireActual('../services/mentor-availability-api'),
  getMentorAvailability: jest.fn(),
  updateMentorAvailability: jest.fn(),
}));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
const push = jest.fn();
const replace = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push, replace }) }));

const getAvailability = jest.mocked(getMentorAvailability);
const updateAvailability = jest.mocked(updateMentorAvailability);

beforeEach(() => {
  jest.clearAllMocks();
  getAvailability.mockResolvedValue({ availabilityStatus: 'DISPONIBLE', fecha_actualizacion: null });
  updateAvailability.mockImplementation(async status => ({ availabilityStatus: status, fecha_actualizacion: '2026-01-01' }));
});

it('muestra el paso 3 y permite navegar a los pasos anteriores', async () => {
  render(<MentorAvailabilityPage />);
  await screen.findByText('Mentor disponible');

  expect(screen.getByRole('heading', { name: 'Completa tu perfil de mentor' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Ir al paso 1: Áreas técnicas' })).toHaveAttribute('href', '/mentorship/profile/areas');
  expect(screen.getByRole('link', { name: 'Ir al paso 2: Intereses de mentoría' })).toHaveAttribute('href', '/mentorship/profile/interests');
  expect(screen.getByRole('region', { name: 'Completa tu perfil de mentor' })).toHaveTextContent('3 de 3 pasos completados');
});

it('guarda la disponibilidad y finaliza en mi perfil de mentor', async () => {
  render(<MentorAvailabilityPage />);
  await screen.findByText('Mentor disponible');

  fireEvent.click(screen.getAllByRole('button', { name: 'Elegir' })[0]);
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Sí, pausar disponibilidad' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y finalizar' }));

  await waitFor(() => expect(updateAvailability).toHaveBeenCalledWith('EN_PAUSA'), { timeout: 2500 });
  await waitFor(() => expect(push).toHaveBeenCalledWith('/mentorship/profile'), { timeout: 2500 });
});

it('permite finalizar sin cambios sin volver a guardar', async () => {
  render(<MentorAvailabilityPage />);
  await screen.findByText('Mentor disponible');

  fireEvent.click(screen.getByRole('button', { name: 'Finalizar configuración' }));

  expect(updateAvailability).not.toHaveBeenCalled();
  expect(push).toHaveBeenCalledWith('/mentorship/profile');
});

it('pide confirmación al salir por un paso con cambios sin guardar', async () => {
  render(<MentorAvailabilityPage />);
  await screen.findByText('Mentor disponible');

  fireEvent.click(screen.getAllByRole('button', { name: 'Elegir' })[0]);
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Sí, pausar disponibilidad' }));
  fireEvent.click(screen.getByRole('link', { name: 'Ir al paso 1: Áreas técnicas' }));

  expect(push).not.toHaveBeenCalled();
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Descartar cambios' }));

  expect(push).toHaveBeenCalledWith('/mentorship/profile/areas');
});
