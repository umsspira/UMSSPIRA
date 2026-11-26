import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MentorAvailabilityPage } from './mentor-availability-page';
import { getMentorAvailability, updateMentorAvailability } from '../services/mentor-availability-api';
import { getMentorSchedule, saveMentorSchedule } from '../services/mentor-schedule-api';
import { getMentorOnboarding, type MentorOnboardingState } from '../services/mentor-onboarding-api';

jest.mock('../services/mentor-availability-api', () => ({
  ...jest.requireActual('../services/mentor-availability-api'),
  getMentorAvailability: jest.fn(),
  updateMentorAvailability: jest.fn(),
}));
jest.mock('../services/mentor-schedule-api', () => ({
  ...jest.requireActual('../services/mentor-schedule-api'),
  getMentorSchedule: jest.fn(),
  saveMentorSchedule: jest.fn(),
}));
jest.mock('../services/mentor-onboarding-api', () => ({
  ...jest.requireActual('../services/mentor-onboarding-api'),
  getMentorOnboarding: jest.fn(),
}));
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
const router = { push: jest.fn(), replace: jest.fn() };
jest.mock('next/navigation', () => ({ useRouter: () => router }));

const getAvailability = jest.mocked(getMentorAvailability);
const updateAvailability = jest.mocked(updateMentorAvailability);
const getSchedule = jest.mocked(getMentorSchedule);
const saveSchedule = jest.mocked(saveMentorSchedule);
const getOnboarding = jest.mocked(getMentorOnboarding);
const monday = { weekday: 1, start: '09:00', end: '10:00' };

function onboardingState(): MentorOnboardingState {
  return {
    isComplete: false,
    currentStep: 2,
    totalSteps: 3,
    completedSteps: [1],
    steps: [
      { step: 1, key: 'areas', label: 'Áreas técnicas', completed: true },
      { step: 2, key: 'interests', label: 'Intereses', completed: false },
      { step: 3, key: 'availability', label: 'Disponibilidad', completed: false },
    ],
    areas: { catalog: [], selectedIds: ['area-1'], intereses: [] },
    interests: { selectedIds: [], catalog: [] },
    availability: { availabilityStatus: null, schedules: [] },
  };
}

beforeEach(() => {
  jest.resetAllMocks();
  getAvailability.mockResolvedValue({ availabilityStatus: 'DISPONIBLE', fecha_actualizacion: '2026-11-01' });
  getSchedule.mockResolvedValue({ schedule: [], fecha_actualizacion: null });
  getOnboarding.mockResolvedValue(onboardingState());
  updateAvailability.mockImplementation(async status => ({ availabilityStatus: status, fecha_actualizacion: '2026-01-01' }));
  saveSchedule.mockImplementation(async schedule => ({ schedule, fecha_actualizacion: '2026-11-14' }));
});

const saveButton = () => screen.getByRole('button', { name: /Guardar y finalizar|Finalizar configuración|Guardando…|¡Guardado!/ });

it('reemplaza «Próximamente» por el horario semanal vacío y lo despliega', async () => {
  render(<MentorAvailabilityPage />);
  expect(await screen.findByRole('heading', { name: 'Horarios semanales' })).toBeInTheDocument();
  expect(screen.queryByText('Próximamente')).not.toBeInTheDocument();
  expect(screen.getByText('Aún no configuraste días ni horas para tus mentorías.')).toBeInTheDocument();

  const toggle = screen.getByRole('button', { name: 'Configurar horarios' });
  expect(toggle).toHaveAttribute('aria-expanded', 'false');
  fireEvent.click(toggle);
  expect(screen.getByRole('button', { name: 'Ocultar horarios' })).toHaveAttribute('aria-expanded', 'true');
  const switches = screen.getAllByRole('switch');
  expect(switches).toHaveLength(7);
  expect(switches.map(day => day.getAttribute('aria-checked'))).toEqual(Array(7).fill('false'));
  expect(screen.getByRole('switch', { name: 'Domingo' })).toBeInTheDocument();
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  expect(saveButton()).toBeEnabled();
});

it('agrega una franja, la guarda con PUT y muestra «Horarios guardados»', async () => {
  render(<MentorAvailabilityPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Configurar horarios' }));
  fireEvent.click(screen.getByRole('switch', { name: 'Lunes' }));

  expect(screen.getByText('1 día con horarios: Lun')).toBeInTheDocument();
  expect(within(screen.getByRole('list', { name: 'Horarios del lunes' })).getByText('09:00–10:00')).toBeInTheDocument();
  expect(screen.getByText('Tienes cambios sin guardar.')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText('Desde (lunes)'), { target: { value: '11:00' } });
  fireEvent.change(screen.getByLabelText('Hasta (lunes)'), { target: { value: '12:00' } });
  fireEvent.click(screen.getByRole('button', { name: 'Agregar horario al lunes' }));
  fireEvent.click(saveButton());
  expect(saveButton()).toBeDisabled();
  await waitFor(() => expect(saveSchedule).toHaveBeenCalledWith([
    monday,
    { weekday: 1, start: '11:00', end: '12:00' },
  ]));
  expect(await screen.findByText('Horarios guardados', {}, { timeout: 3000 })).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole('region', { name: 'Completa tu perfil de mentor' })).toHaveTextContent('2 de 3 pasos completados'));
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2');
  expect(updateAvailability).not.toHaveBeenCalled();
});

it('muestra el error en línea y no agrega una franja solapada o de menos de 1 hora', async () => {
  getSchedule.mockResolvedValue({ schedule: [monday], fecha_actualizacion: '2026-11-10' });
  render(<MentorAvailabilityPage />);
  // Con horarios guardados la tarjeta empieza desplegada.
  await screen.findByRole('button', { name: 'Ocultar horarios' });

  expect(screen.getByRole('switch', { name: 'Lunes' })).toHaveAttribute('aria-checked', 'true');
  fireEvent.change(screen.getByLabelText('Desde (lunes)'), { target: { value: '09:30' } });
  fireEvent.change(screen.getByLabelText('Hasta (lunes)'), { target: { value: '11:00' } });
  fireEvent.click(screen.getByRole('button', { name: 'Agregar horario al lunes' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Se solapa con 09:00–10:00.');
  expect(screen.getByLabelText('Desde (lunes)')).toHaveAttribute('aria-invalid', 'true');

  fireEvent.change(screen.getByLabelText('Desde (lunes)'), { target: { value: '14:00' } });
  fireEvent.change(screen.getByLabelText('Hasta (lunes)'), { target: { value: '14:30' } });
  fireEvent.click(screen.getByRole('button', { name: 'Agregar horario al lunes' }));
  expect(screen.getByRole('alert')).toHaveTextContent('La franja debe durar al menos 1 hora.');
  expect(saveButton()).toBeEnabled();
});

it('quitar una franja y «Descartar cambios» restaura el horario guardado', async () => {
  getSchedule.mockResolvedValue({ schedule: [monday], fecha_actualizacion: '2026-11-10' });
  render(<MentorAvailabilityPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Quitar 09:00–10:00 del lunes' }));
  expect(screen.getByText('Aún no configuraste días ni horas para tus mentorías.')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Descartar cambios' }));
  expect(screen.getByText('1 día con horarios: Lun')).toBeInTheDocument();
  expect(saveButton()).toBeEnabled();
});

it('desde el checklist (HU 6.13) despliega los horarios y enfoca el día si hay estado pero no horarios', async () => {
  window.location.hash = '#first-incomplete';
  try {
    render(<MentorAvailabilityPage />);
    const day = await screen.findByRole('switch', { name: 'Lunes' });
    expect(screen.getByRole('button', { name: 'Ocultar horarios' })).toHaveAttribute('aria-expanded', 'true');
    await waitFor(() => expect(day).toHaveFocus());
  } finally {
    window.location.hash = '';
  }
});

it('un cambio solo de estado sigue usando el PATCH de disponibilidad', async () => {
  updateAvailability.mockResolvedValue({ availabilityStatus: 'EN_PAUSA', fecha_actualizacion: '2026-11-14' });
  render(<MentorAvailabilityPage />);
  await screen.findByRole('heading', { name: 'Horarios semanales' });
  fireEvent.click(screen.getAllByRole('button', { name: 'Elegir' })[0]);
  fireEvent.click(screen.getByRole('button', { name: 'Sí, pausar disponibilidad' }));
  fireEvent.click(saveButton());
  await waitFor(() => expect(updateAvailability).toHaveBeenCalledWith('EN_PAUSA'));
  expect(saveSchedule).not.toHaveBeenCalled();
});

it('muestra el avance real y permite navegar a las secciones pendientes', async () => {
  render(<MentorAvailabilityPage />);
  await waitFor(() => expect(screen.getByRole('region', { name: 'Completa tu perfil de mentor' })).toHaveTextContent('1 de 3 pasos completados'));

  expect(screen.getByRole('heading', { name: 'Completa tu perfil de mentor' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Ir al paso 1: Áreas técnicas/ })).toHaveAttribute('href', '/mentorship/profile/areas#first-incomplete');
  expect(screen.getByRole('link', { name: /Ir al paso 2: Intereses de mentoría/ })).toHaveAttribute('href', '/mentorship/profile/interests#first-incomplete');
  expect(screen.queryByRole('link', { name: /Ir al paso 4/ })).not.toBeInTheDocument();
  expect(screen.getByText('Paso 3 de 3')).toBeInTheDocument();
  expect(within(screen.getByRole('region', { name: 'Completa tu perfil de mentor' }))
    .getAllByRole('listitem').map(item => item.querySelector('strong')?.textContent))
    .toEqual(['Áreas técnicas', 'Intereses de mentoría', 'Disponibilidad']);
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '3');
});

it('guarda la disponibilidad y finaliza en mi perfil de mentor', async () => {
  render(<MentorAvailabilityPage />);
  await screen.findByText('Mentor disponible');

  fireEvent.click(screen.getAllByRole('button', { name: 'Elegir' })[0]);
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Sí, pausar disponibilidad' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y finalizar' }));

  await waitFor(() => expect(updateAvailability).toHaveBeenCalledWith('EN_PAUSA'), { timeout: 2500 });
  await waitFor(() => expect(router.push).toHaveBeenCalledWith('/mentorship/profile'), { timeout: 2500 });
});

it('permite finalizar sin cambios sin volver a guardar', async () => {
  render(<MentorAvailabilityPage />);
  await screen.findByText('Mentor disponible');

  fireEvent.click(screen.getByRole('button', { name: 'Finalizar configuración' }));

  expect(updateAvailability).not.toHaveBeenCalled();
  expect(router.push).toHaveBeenCalledWith('/mentorship/profile');
});

it('pide confirmación al salir por un paso con cambios sin guardar', async () => {
  render(<MentorAvailabilityPage />);
  await screen.findByText('Mentor disponible');

  fireEvent.click(screen.getAllByRole('button', { name: 'Elegir' })[0]);
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Sí, pausar disponibilidad' }));
  fireEvent.click(screen.getByRole('link', { name: /Ir al paso 1: Áreas técnicas/ }));

  expect(router.push).not.toHaveBeenCalled();
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Descartar cambios' }));

  expect(router.push).toHaveBeenCalledWith('/mentorship/profile/areas#first-incomplete');
});
