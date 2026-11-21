import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MentorInterestsConnected } from './mentor-interests-connected';
import { getMentorProfile } from '../services/mentorship-api';
import { getMentorInterests, saveMentorInterests } from '../services/mentor-interests-api';

jest.mock('../services/mentorship-api');
jest.mock('../services/mentor-interests-api');
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));
const getProfile = jest.mocked(getMentorProfile);
const getInterests = jest.mocked(getMentorInterests);
const save = jest.mocked(saveMentorInterests);
const state = {
  catalog: [{ id: 'root', name: 'Backend real', description: '', topics: [{ id: 'rest', name: 'REST real' }] }],
  configuration: { areaIds: ['root'], topicIds: [] },
};
const saveButton = () => screen.getByRole('button', { name: /^Guardar configuración \(\d+\)$/ });

beforeEach(() => {
  jest.resetAllMocks();
  getProfile.mockResolvedValue({ isActive: true, requirements: { egresado: true } });
  getInterests.mockResolvedValue(state);
  save.mockImplementation(async next => next);
});

it('carga el catálogo real y guarda solo tras confirmar', async () => {
  render(<MentorInterestsConnected />);
  expect(screen.getByRole('status')).toHaveTextContent('Cargando');
  fireEvent.click(await screen.findByRole('button', { name: 'REST real' }));
  expect(screen.getByRole('button', { name: 'Quitar área' })).toBeDisabled();
  fireEvent.click(saveButton());
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Guardar y continuar' }));
  await screen.findByText('Intereses guardados correctamente');
  expect(save).toHaveBeenCalledWith({ areaIds: ['root'], topicIds: ['rest'] });
  expect(screen.queryByText(/Vista de prueba/)).not.toBeInTheDocument();
});

it('muestra un fallo de carga y permite reintentar sin inventar un catálogo', async () => {
  getInterests.mockRejectedValueOnce(new Error('Backend no disponible'));
  render(<MentorInterestsConnected />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Backend no disponible');
  expect(screen.queryByRole('button', { name: 'REST real' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  await screen.findByRole('button', { name: 'REST real' });
});

it('bloquea la edición si el mentor no está activo', async () => {
  getProfile.mockResolvedValue({ isActive: false, requirements: { egresado: true } });
  render(<MentorInterestsConnected />);
  await screen.findByRole('link', { name: 'Revisar mi participación' });
  expect(screen.queryByRole('button', { name: 'REST real' })).not.toBeInTheDocument();
});

it('permite editar y guardar sugeridos aunque falte el esquema de personalizados', async () => {
  getInterests.mockResolvedValue({ ...state, customInterestsAvailable: false });
  render(<MentorInterestsConnected />);
  const topic = await screen.findByRole('button', { name: 'REST real' });
  expect(topic).toBeEnabled();
  expect(screen.getByLabelText('Agregar otro tema')).toBeVisible();
  expect(screen.getByLabelText('Agregar otro tema')).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Agregar' })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Agregar otro tema'), { target: { value: 'Mi tema' } });
  expect(screen.getByRole('button', { name: 'Agregar' })).toBeEnabled();
  fireEvent.click(topic);
  expect(saveButton()).toBeEnabled();
  fireEvent.click(saveButton());
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Guardar y continuar' }));
  await screen.findByText('Intereses guardados correctamente');
  expect(save).toHaveBeenCalledWith({ areaIds: ['root'], topicIds: ['rest'] });
});

it('muestra un aviso cuando el área real no tiene tópicos en el catálogo', async () => {
  getInterests.mockResolvedValue({ ...state, catalog: [{ ...state.catalog[0], topics: [] }] });
  render(<MentorInterestsConnected />);
  await screen.findByText('Esta área todavía no tiene tópicos disponibles en el catálogo.');
  expect(screen.queryByRole('button', { name: 'REST real' })).not.toBeInTheDocument();
});

it('conserva el borrador y no muestra éxito si el guardado falla', async () => {
  save.mockRejectedValueOnce(new Error('No se pudo guardar'));
  render(<MentorInterestsConnected />);
  fireEvent.click(await screen.findByRole('button', { name: 'REST real' }));
  fireEvent.click(saveButton());
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Guardar y continuar' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo guardar');
  expect(screen.getByRole('button', { name: 'REST real' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.queryByText('Intereses guardados correctamente')).not.toBeInTheDocument();
});

it('TC-020: al recargar toma el progreso persistido después de quitar un interés guardado', async () => {
  getInterests.mockResolvedValueOnce({ ...state, configuration: { areaIds: ['root'], topicIds: ['rest'] } });
  save.mockResolvedValueOnce({ areaIds: ['root'], topicIds: [] });
  const view = render(<MentorInterestsConnected />);
  fireEvent.click(await screen.findByRole('button', { name: 'REST real' }));
  expect(screen.getByText('En edición')).toBeInTheDocument();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  fireEvent.click(saveButton());
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Guardar y continuar' }));
  await screen.findByText('Intereses guardados correctamente');
  view.unmount();

  getInterests.mockResolvedValueOnce({ ...state, configuration: { areaIds: ['root'], topicIds: [] } });
  render(<MentorInterestsConnected />);
  expect(await screen.findByRole('button', { name: 'REST real' })).toHaveAttribute('aria-pressed', 'false');
  expect(screen.queryByText('En edición')).not.toBeInTheDocument();
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  expect(getInterests).toHaveBeenCalledTimes(2);
});

it('TC-005/006: muestra tres tarjetas propias y conserva sus tópicos al guardar y recargar', async () => {
  const catalog = [
    { id: 'backend', name: 'Backend', description: '', topics: [
      { id: 'spring', name: 'Spring Boot' }, { id: 'laravel', name: 'Laravel' }, { id: 'golang', name: 'Golang' },
    ] },
    { id: 'frontend', name: 'Frontend', description: '', topics: [
      { id: 'accessibility', name: 'Accesibilidad web' }, { id: 'design', name: 'Diseño de interfaces' }, { id: 'performance', name: 'Rendimiento web' },
    ] },
    { id: 'databases', name: 'Bases de datos', description: '', topics: [
      { id: 'modeling', name: 'Modelado de datos' }, { id: 'optimization', name: 'Optimización de consultas' },
    ] },
  ];
  const areaIds = catalog.map(area => area.id);
  getInterests.mockResolvedValueOnce({ catalog, configuration: { areaIds, topicIds: [] } });
  save.mockResolvedValueOnce({ areaIds, topicIds: ['spring', 'accessibility', 'modeling'] });
  const view = render(<MentorInterestsConnected />);
  for (const name of ['Backend', 'Frontend', 'Bases de datos']) {
    expect(await screen.findByRole('heading', { name })).toBeInTheDocument();
  }
  for (const name of ['Spring Boot', 'Laravel', 'Golang', 'Accesibilidad web', 'Diseño de interfaces', 'Rendimiento web', 'Modelado de datos', 'Optimización de consultas']) {
    expect(screen.getByRole('button', { name })).toBeInTheDocument();
  }
  for (const name of ['Spring Boot', 'Accesibilidad web', 'Modelado de datos']) {
    fireEvent.click(screen.getByRole('button', { name }));
  }
  fireEvent.click(saveButton());
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Guardar y continuar' }));
  await screen.findByText('Intereses guardados correctamente');
  expect(save).toHaveBeenCalledWith({ areaIds, topicIds: ['spring', 'accessibility', 'modeling'] });
  view.unmount();

  getInterests.mockResolvedValueOnce({ catalog, configuration: { areaIds, topicIds: ['spring', 'accessibility', 'modeling'] } });
  render(<MentorInterestsConnected />);
  for (const name of ['Spring Boot', 'Accesibilidad web', 'Modelado de datos']) {
    expect(await screen.findByRole('button', { name })).toHaveAttribute('aria-pressed', 'true');
  }
  expect(getInterests).toHaveBeenCalledTimes(2);
});
