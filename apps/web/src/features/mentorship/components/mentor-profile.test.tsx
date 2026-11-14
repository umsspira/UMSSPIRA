import '@testing-library/jest-dom';
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { MentorProfile } from './mentor-profile';
import { InactivePanel } from './inactive-panel';
import { getMentorProfile, updateMentorParticipation } from '../services/mentorship-api';
import { getMentorAreas } from '../services/mentor-areas-api';
import { getMentorInterests } from '../services/mentor-interests-api';
import { getMentorAvailability } from '../services/mentor-availability-api';
import { getMentorProfileInformation } from '../services/mentor-profile-info-api';

jest.mock('../services/mentorship-api');
jest.mock('../services/mentor-areas-api', () => ({ getMentorAreas: jest.fn().mockResolvedValue({ areas: [], selectedIds: [] }) }));
jest.mock('../services/mentor-interests-api', () => ({ getMentorInterests: jest.fn().mockResolvedValue({ catalog: [], configuration: { areaIds: [], topicIds: [] } }) }));
jest.mock('../services/mentor-availability-api', () => ({ getMentorAvailability: jest.fn().mockResolvedValue({ availabilityStatus: null, fecha_actualizacion: null }) }));
jest.mock('../services/mentor-profile-info-api', () => ({ getMentorProfileInformation: jest.fn().mockResolvedValue({ exists: false, profile: null }) }));
const getProfile = jest.mocked(getMentorProfile);
const updateParticipation = jest.mocked(updateMentorParticipation);
const getAreas = jest.mocked(getMentorAreas);
const getInterests = jest.mocked(getMentorInterests);
const getAvailability = jest.mocked(getMentorAvailability);
const getInformation = jest.mocked(getMentorProfileInformation);
const inactive = { isActive: false, requirements: { egresado: true } };

beforeEach(() => {
  jest.resetAllMocks();
  getProfile.mockResolvedValue(inactive);
  getAreas.mockResolvedValue({ areas: [], selectedIds: [] });
  getInterests.mockResolvedValue({ catalog: [], configuration: { areaIds: [], topicIds: [] } });
  getAvailability.mockResolvedValue({ availabilityStatus: null, fecha_actualizacion: null });
  getInformation.mockResolvedValue({ exists: false, profile: null });
});

it('activa y desactiva con los estados confirmados por la API', async () => {
  updateParticipation.mockResolvedValueOnce({ ...inactive, isActive: true }).mockResolvedValueOnce(inactive);
  render(<MentorProfile />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Activar como mentor' })).toBeEnabled());
  expect(screen.getByRole('button', { name: 'Activar como mentor' })).toHaveAttribute('id', 'first-incomplete');
  expect(await screen.findByRole('heading', { name: 'Completa tu perfil de mentor' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Activar como mentor' }));
  expect(await screen.findByRole('link', { name: /Comenzar mi configuración/ })).toHaveAttribute('href', '/mentorship/profile/areas');
  expect(screen.getAllByText('Pendiente de configurar')).toHaveLength(4);
  expect(screen.getByRole('link', { name: /Configurar intereses/ })).toHaveAttribute('href', '/mentorship/profile/interests');
  expect(screen.getByRole('link', { name: /Configurar disponibilidad/ })).toHaveAttribute('href', '/mentorship/profile/availability');
  expect(screen.getByRole('link', { name: /Agregar información/ })).toHaveAttribute('href', '/mentorship/profile/information');
  await screen.findByText('Tu participación como mentor está activa');
  fireEvent.click(screen.getByRole('button', { name: 'Desactivar participación' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(updateParticipation).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: 'Desactivar participación' }));
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Desactivar participación' }));
  await screen.findByText('Tu participación como mentor está inactiva');
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
});

it('muestra error sin un perfil falso y permite reintentar la carga', async () => {
  getProfile.mockRejectedValueOnce(new Error('Backend no disponible'));
  render(<MentorProfile />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Backend no disponible');
  expect(screen.getByRole('button', { name: 'Activar como mentor' })).toBeDisabled();
  expect(screen.getAllByRole('link', { name: 'Configurar áreas' })).toHaveLength(2);
  expect(screen.getAllByRole('link', { name: 'Configurar áreas' })[0]).toHaveAttribute('href', '/mentorship/profile/areas');
  expect(screen.getByRole('link', { name: 'Configurar intereses' })).toHaveAttribute('href', '/mentorship/profile/interests');
  expect(screen.getByRole('link', { name: 'Configurar disponibilidad' })).toHaveAttribute('href', '/mentorship/profile/availability');
  expect(screen.getByRole('link', { name: 'Agregar información' })).toHaveAttribute('href', '/mentorship/profile/information');
  expect(screen.getAllByText('Por consultar')).toHaveLength(1);
  expect(screen.queryByText('Titulado aprobado')).not.toBeInTheDocument();
  expect(screen.queryByText('Inactivo')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Activar como mentor' })).toBeEnabled());
});

it('mantiene la estructura y bloquea la activación durante la carga', () => {
  getProfile.mockReturnValue(new Promise(() => {}));
  render(<MentorProfile />);
  expect(screen.getByRole('status')).toHaveTextContent('Cargando participación');
  expect(screen.getAllByRole('link', { name: 'Configurar áreas' })).toHaveLength(2);
  expect(screen.getAllByRole('link', { name: 'Configurar áreas' })[0]).toHaveAttribute('href', '/mentorship/profile/areas');
  expect(screen.getByRole('button', { name: 'Activar como mentor' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Activar como mentor' }));
  expect(updateParticipation).not.toHaveBeenCalled();
});

it('permite abrir la pantalla de áreas desde la tarjeta de participación inactiva', () => {
  render(<InactivePanel requirements={{ egresado: false }} activating={false} onActivate={jest.fn()} />);
  expect(screen.getByRole('link', { name: 'Configurar áreas' })).toHaveAttribute('href', '/mentorship/profile/areas');
});

it('mantiene la confirmación abierta si falla la desactivación', async () => {
  getProfile.mockResolvedValue({ ...inactive, isActive: true });
  updateParticipation.mockRejectedValue(new Error('No se pudo guardar'));
  render(<MentorProfile />);
  fireEvent.click(await screen.findByRole('button', { name: 'Desactivar participación' }));
  const dialog = screen.getByRole('alertdialog');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Desactivar participación' }));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('No se pudo guardar');
  expect(screen.getByText('Tu participación como mentor está activa')).toBeInTheDocument();
});

it.each([{ egresado: false }])('bloquea la activación con requisitos pendientes: %j', requirements => {
  const onActivate = jest.fn();
  render(<InactivePanel requirements={requirements} activating={false} onActivate={onActivate} />);
  const button = screen.getByRole('button', { name: 'Activar como mentor' });
  expect(button).toBeDisabled();
  fireEvent.click(button);
  expect(onActivate).not.toHaveBeenCalled();
});
