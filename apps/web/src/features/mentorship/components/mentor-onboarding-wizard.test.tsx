import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MentorOnboardingWizard } from './mentor-onboarding-wizard';
import {
  getMentorOnboarding,
  MentorOnboardingError,
  saveMentorOnboardingAreas,
  saveMentorOnboardingAvailability,
  saveMentorOnboardingInterests,
  type MentorOnboardingState,
} from '../services/mentor-onboarding-api';
import { getMentorProfile } from '../services/mentorship-api';
import { getMentorAreas } from '../services/mentor-areas-api';
import { getMentorInterests } from '../services/mentor-interests-api';
import { getMentorAvailability } from '../services/mentor-availability-api';
import { getMentorSchedule } from '../services/mentor-schedule-api';
import { getMentorProfileInformation } from '../services/mentor-profile-info-api';

jest.mock('../services/mentor-onboarding-api', () => ({
  ...jest.requireActual('../services/mentor-onboarding-api'),
  getMentorOnboarding: jest.fn(),
  saveMentorOnboardingAreas: jest.fn(),
  saveMentorOnboardingInterests: jest.fn(),
  saveMentorOnboardingAvailability: jest.fn(),
}));
jest.mock('../services/mentorship-api');
jest.mock('../services/mentor-areas-api');
jest.mock('../services/mentor-interests-api');
jest.mock('../services/mentor-availability-api');
jest.mock('../services/mentor-schedule-api');
jest.mock('../services/mentor-profile-info-api');
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const getState = jest.mocked(getMentorOnboarding);
const saveAreas = jest.mocked(saveMentorOnboardingAreas);
const saveInterests = jest.mocked(saveMentorOnboardingInterests);
const saveAvailability = jest.mocked(saveMentorOnboardingAvailability);
const getProfile = jest.mocked(getMentorProfile);
const getAreas = jest.mocked(getMentorAreas);
const getInterests = jest.mocked(getMentorInterests);
const getAvailability = jest.mocked(getMentorAvailability);
const getSchedule = jest.mocked(getMentorSchedule);
const getInformation = jest.mocked(getMentorProfileInformation);

const area = { id: '10000000-0000-4000-8000-000000000001', nombre: 'Desarrollo de software', descripcion: null };
const interest = {
  id: '20000000-0000-4000-8000-000000000001',
  nombre: 'Backend',
  area: { id: area.id, nombre: area.nombre },
  seleccionado: false,
};

function state(overrides: Partial<MentorOnboardingState> = {}): MentorOnboardingState {
  const completedSteps = overrides.completedSteps ?? [];
  return {
    isComplete: false,
    currentStep: 1,
    totalSteps: 3,
    completedSteps,
    steps: [
      { step: 1, key: 'areas', label: 'Áreas técnicas', completed: completedSteps.includes(1) },
      { step: 2, key: 'interests', label: 'Intereses', completed: completedSteps.includes(2) },
      { step: 3, key: 'availability', label: 'Disponibilidad', completed: completedSteps.includes(3) },
    ],
    areas: {
      catalog: [area],
      selectedIds: [],
      intereses: [],
    },
    interests: {
      selectedIds: [],
      catalog: [{ area: { id: area.id, nombre: area.nombre }, intereses: [interest] }],
    },
    availability: { availabilityStatus: null, schedules: [] },
    ...overrides,
  };
}

beforeEach(() => {
  jest.resetAllMocks();
  getProfile.mockResolvedValue({ isActive: false, requirements: { egresado: true } });
  getAreas.mockResolvedValue({ areas: [], selectedIds: [] });
  getInterests.mockResolvedValue({ catalog: [], configuration: { areaIds: [], topicIds: [] } });
  getAvailability.mockResolvedValue({ availabilityStatus: null, fecha_actualizacion: null });
  getSchedule.mockResolvedValue({ schedule: [], fecha_actualizacion: null });
  getInformation.mockResolvedValue({ nombre: 'Mentor', exists: false, profile: null });
  getState.mockResolvedValue(state());
  saveAreas.mockResolvedValue(state({
    currentStep: 2,
    completedSteps: [1],
    areas: { catalog: [area], selectedIds: [area.id], intereses: [] },
    interests: {
      selectedIds: [],
      catalog: [{ area: { id: area.id, nombre: area.nombre }, intereses: [interest] }],
    },
  }));
  saveInterests.mockResolvedValue(state({
    currentStep: 3,
    completedSteps: [1, 2],
    areas: { catalog: [area], selectedIds: [area.id], intereses: [] },
    interests: {
      selectedIds: [interest.id],
      catalog: [{ area: { id: area.id, nombre: area.nombre }, intereses: [{ ...interest, seleccionado: true }] }],
    },
    availability: { availabilityStatus: null, schedules: [] },
  }));
  saveAvailability.mockResolvedValue(state({
    isComplete: true,
    currentStep: 3,
    completedSteps: [1, 2, 3],
    areas: { catalog: [area], selectedIds: [area.id], intereses: [] },
    interests: {
      selectedIds: [interest.id],
      catalog: [{ area: { id: area.id, nombre: area.nombre }, intereses: [{ ...interest, seleccionado: true }] }],
    },
    availability: {
      availabilityStatus: 'DISPONIBLE',
      schedules: [{ weekday: 2, start: '18:00', end: '20:00' }],
    },
  }));
});

it('CAF-03: muestra el paso actual, el total y los pasos completados', async () => {
  getState.mockResolvedValue(state({ currentStep: 2, completedSteps: [1] }));
  getAreas.mockResolvedValue({ areas: [], selectedIds: [area.id] });
  render(<MentorOnboardingWizard />);

  expect(await screen.findAllByText('Paso 2 de 3')).not.toHaveLength(0);
  const progress = await screen.findByRole('progressbar', { name: 'Progreso del perfil de mentor' });
  expect(progress).toHaveAttribute('aria-valuenow', '20');
  expect(screen.getByText(/1 de 5 pasos completados/)).toBeInTheDocument();
  expect(screen.getByText('Completo')).toBeInTheDocument();
  expect(screen.getAllByText('Pendiente')).toHaveLength(4);
  expect(screen.queryByRole('link', { name: 'Completar áreas técnicas' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Completar intereses de mentoría' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Completar disponibilidad' })).toBeInTheDocument();
});

it('CAF-06: no avanza ni pierde la selección cuando faltan datos obligatorios', async () => {
  render(<MentorOnboardingWizard />);
  await screen.findByRole('heading', { level: 3, name: 'Áreas técnicas' });

  fireEvent.click(screen.getByRole('button', { name: 'Guardar y continuar' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Selecciona al menos un área técnica para continuar');
  expect(saveAreas).not.toHaveBeenCalled();
  expect(screen.getAllByText('Paso 1 de 3').length).toBeGreaterThan(0);
});

it('CAF-05/CAF-07: guarda y continúa al paso de intereses solo con las áreas elegidas', async () => {
  render(<MentorOnboardingWizard />);
  await screen.findByRole('checkbox', { name: /Desarrollo de software/ });

  fireEvent.click(screen.getByRole('checkbox', { name: /Desarrollo de software/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y continuar' }));

  await waitFor(() => expect(saveAreas).toHaveBeenCalledWith([area.id]));
  expect(await screen.findByRole('heading', { name: 'Intereses de mentoría' })).toBeInTheDocument();
  expect(screen.getByText('Paso guardado correctamente')).toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: /Backend/ })).toBeInTheDocument();
});

it('CAF-10: Atrás vuelve al paso anterior conservando lo guardado', async () => {
  render(<MentorOnboardingWizard />);
  await screen.findByRole('checkbox', { name: /Desarrollo de software/ });
  fireEvent.click(screen.getByRole('checkbox', { name: /Desarrollo de software/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y continuar' }));
  await screen.findByRole('heading', { name: 'Intereses de mentoría' });

  fireEvent.click(screen.getByRole('button', { name: 'Atrás' }));

  expect(screen.getByRole('heading', { level: 3, name: 'Áreas técnicas' })).toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: /Desarrollo de software/ })).toBeChecked();
});

it('CAF-14/CAF-15: muestra error, conserva el paso y evita peticiones adicionales mientras guarda', async () => {
  let rejectSave: (reason: unknown) => void = () => {};
  saveAreas.mockImplementationOnce(
    () => new Promise<MentorOnboardingState>((_resolve, reject) => { rejectSave = reject; }),
  );
  render(<MentorOnboardingWizard />);
  await screen.findByRole('checkbox', { name: /Desarrollo de software/ });
  fireEvent.click(screen.getByRole('checkbox', { name: /Desarrollo de software/ }));

  const button = screen.getByRole('button', { name: 'Guardar y continuar' });
  fireEvent.click(button);
  fireEvent.click(button);

  expect(saveAreas).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Guardando…' })).toBeDisabled();

  rejectSave(new MentorOnboardingError('El servidor falló', 500));
  expect(await screen.findByText('No se pudo guardar. Intenta nuevamente')).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 3, name: 'Áreas técnicas' })).toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: /Desarrollo de software/ })).toBeChecked();
  expect(screen.getByRole('button', { name: 'Guardar y continuar' })).toBeEnabled();
});

it('CAF-11: al guardar el último paso muestra el resumen y el mensaje de perfil completo', async () => {
  getState.mockResolvedValue(state({
    currentStep: 3,
    completedSteps: [1, 2],
    areas: { catalog: [area], selectedIds: [area.id], intereses: [] },
    interests: {
      selectedIds: [interest.id],
      catalog: [{ area: { id: area.id, nombre: area.nombre }, intereses: [{ ...interest, seleccionado: true }] }],
    },
  }));
  render(<MentorOnboardingWizard />);
  await screen.findByRole('heading', { level: 3, name: 'Disponibilidad' });

  fireEvent.click(screen.getByRole('radio', { name: /Disponible/ }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Martes' }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar y continuar' }));

  expect(await screen.findByRole('heading', { name: 'Tu perfil de mentor está completo' })).toBeInTheDocument();
  expect(saveAvailability).toHaveBeenCalledWith('DISPONIBLE', [
    { weekday: 2, start: '18:00', end: '20:00' },
  ]);
});
