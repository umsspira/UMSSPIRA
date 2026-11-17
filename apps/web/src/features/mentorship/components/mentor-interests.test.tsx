import '@testing-library/jest-dom';
import { fireEvent, render, screen, within, waitFor } from '@testing-library/react';
import { MentorInterests } from './mentor-interests';
import { type InterestArea, type InterestConfiguration } from '../model/mentor-interests';
import { getMentorProfile } from '../services/mentorship-api';
import { getMentorAreas } from '../services/mentor-areas-api';
import { getMentorInterests } from '../services/mentor-interests-api';
import { getMentorAvailability } from '../services/mentor-availability-api';
import { getMentorSchedule } from '../services/mentor-schedule-api';
import { getMentorProfileInformation } from '../services/mentor-profile-info-api';

const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
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

function mockCompletenessState() {
  profile.mockResolvedValue({ isActive: false, requirements: { egresado: true } });
  areas.mockResolvedValue({ areas: [], selectedIds: [] });
  interests.mockResolvedValue({ catalog: [], configuration: { areaIds: [], topicIds: [] } });
  availability.mockResolvedValue({ availabilityStatus: null, fecha_actualizacion: null });
  schedule.mockResolvedValue({ schedule: [], fecha_actualizacion: null });
  information.mockResolvedValue({ nombre: 'Mentor', exists: false, profile: null });
}

const catalog: InterestArea[] = [
  { id: 'web', name: 'Web', description: 'Desarrollo web', topics: [{ id: 'react', name: 'React' }, { id: 'rest', name: 'APIs REST' }] },
  { id: 'datos', name: 'Bases de datos', description: 'Consultas', topics: [{ id: 'pg', name: 'PostgreSQL' }] },
];
const initialConfiguration: InterestConfiguration = { areaIds: ['web'], topicIds: ['react'] };
let onSave: jest.Mock;
beforeEach(() => {
  jest.resetAllMocks();
  push.mockReset();
  mockCompletenessState();
  onSave = jest.fn(async config => config);
});
function setup() { render(<MentorInterests catalog={catalog} initialConfiguration={initialConfiguration} onSave={onSave} />); }
function add() { fireEvent.click(screen.getByRole('button', { name: 'APIs REST' })); }
function openSave() { fireEvent.click(screen.getByRole('button', { name: 'Guardar y continuar' })); }
function confirmSave() { fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Guardar y continuar' })); }

it('muestra el catálogo por área y permite ir a configurar otras áreas', () => {
  setup();
  expect(screen.getByRole('heading', { name: 'Web' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Bases de datos' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'PostgreSQL' })).not.toBeInTheDocument();
  expect(screen.queryByText('Bloqueada')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Guardar' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Continuar a disponibilidad' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Modificar áreas técnicas' }));
  expect(push).toHaveBeenCalledWith('/mentorship/profile/areas');
});

it('no muestra tarjetas del catálogo si el mentor no ha seleccionado áreas', () => {
  render(<MentorInterests catalog={catalog} initialConfiguration={{ areaIds: [], topicIds: [] }} onSave={onSave} />);
  expect(screen.getByText(/No hay áreas técnicas seleccionadas/)).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Web' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'PostgreSQL' })).not.toBeInTheDocument();
});

it('guarda solo después de confirmar y muestra el resultado', async () => {
  setup(); add(); openSave();
  expect(onSave).not.toHaveBeenCalled();
  expect(screen.getByRole('alertdialog')).toHaveTextContent('APIs REST');
  confirmSave();
  await screen.findByText(/Intereses guardados correctamente/);
  expect(onSave).toHaveBeenCalledWith({ areaIds: ['web'], topicIds: ['react', 'rest'] });
  expect(push).toHaveBeenCalledWith('/mentorship/profile/availability');
  expect(screen.getByRole('button', { name: 'Continuar a disponibilidad' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'Descartar cambios' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Volver a mi perfil' })).toBeEnabled();
  expect(screen.queryByText('Cambios sin guardar')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Volver a mi perfil' }));
  expect(push).toHaveBeenCalledWith('/mentorship/profile');
});

it('muestra el estado de cambios y vuelve a guardar al editar después del éxito', async () => {
  setup();
  expect(screen.queryByRole('button', { name: 'Volver a mi perfil' })).not.toBeInTheDocument();
  add();
  expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument();
  openSave();
  confirmSave();
  await screen.findByRole('button', { name: 'Volver a mi perfil' });
  fireEvent.click(screen.getByRole('button', { name: 'APIs REST' }));
  expect(screen.queryByRole('button', { name: 'Volver a mi perfil' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Guardar y continuar' })).toBeEnabled();
  expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument();
});

it('mantiene el borrador y permite reintentar cuando falla el guardado', async () => {
  onSave.mockRejectedValueOnce(new Error('Error de conexión'));
  setup(); add(); openSave();
  confirmSave();
  expect(await screen.findByRole('alert')).toHaveTextContent('Error de conexión');
  expect(screen.queryByRole('button', { name: 'Volver a mi perfil' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'APIs REST' })).toHaveAttribute('aria-pressed', 'true');
  confirmSave();
  await screen.findByText(/Intereses guardados correctamente/);
});

it('descarta y restaura la última configuración guardada', () => {
  setup(); add();
  fireEvent.click(screen.getByRole('button', { name: 'Descartar cambios' }));
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Descartar cambios' }));
  expect(screen.getByRole('button', { name: 'APIs REST' })).toHaveAttribute('aria-pressed', 'false');
  expect(onSave).not.toHaveBeenCalled();
});

it('confirma la eliminación de un área y sus tópicos sin guardar automáticamente', () => {
  setup();
  fireEvent.click(screen.getByRole('button', { name: 'Quitar área' }));
  expect(screen.getByRole('alertdialog')).toHaveTextContent('React');
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(screen.getByRole('button', { name: 'React' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Quitar área' }));
  fireEvent.click(screen.getByRole('button', { name: 'Quitar de todos modos' }));
  expect(screen.getByRole('button', { name: 'React' })).toBeDisabled();
  expect(screen.getByRole('heading', { name: 'Web' })).toBeInTheDocument();
  expect(screen.getByText('Bloqueada')).toBeInTheDocument();
  expect(screen.getByText('En tu perfil · 0 tópicos')).toBeInTheDocument();
  expect(onSave).not.toHaveBeenCalled();
  openSave();
  expect(screen.getByRole('alertdialog')).toHaveTextContent('Se quitarán (1): React');
});

it('restaura el área bloqueada y sus tópicos al descartar la eliminación', () => {
  setup();
  fireEvent.click(screen.getByRole('button', { name: 'Quitar área' }));
  fireEvent.click(screen.getByRole('button', { name: 'Quitar de todos modos' }));
  expect(screen.getByRole('button', { name: 'React' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Descartar cambios' }));
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Descartar cambios' }));
  expect(screen.getByRole('button', { name: 'React' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'React' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.queryByText('Bloqueada')).not.toBeInTheDocument();
  expect(onSave).not.toHaveBeenCalled();
});

it('reactiva el área sin navegar ni abrir descarte y restaura su borrador de tópicos', () => {
  render(<MentorInterests catalog={catalog}
    initialConfiguration={{ areaIds: ['web', 'datos'], topicIds: ['react', 'pg'] }}
    onSave={onSave} minimumAreas={1} />);
  // Cambios pendientes tanto en el área a quitar como en otra área.
  add();
  fireEvent.click(screen.getByRole('button', { name: 'PostgreSQL' }));
  fireEvent.click(within(screen.getByRole('region', { name: 'Web' })).getByRole('button', { name: 'Quitar área' }));
  fireEvent.click(screen.getByRole('button', { name: 'Quitar de todos modos' }));
  expect(screen.getByRole('button', { name: 'React' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Activar esta área técnica' }));
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  expect(push).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'React' })).toBeEnabled();
  expect(screen.getByRole('button', { name: 'React' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'APIs REST' })).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('button', { name: 'PostgreSQL' })).toHaveAttribute('aria-pressed', 'false');
  expect(onSave).not.toHaveBeenCalled();
});

it('oculta el área quitada solo después de confirmar un guardado exitoso', async () => {
  render(<MentorInterests catalog={catalog}
    initialConfiguration={{ areaIds: ['web', 'datos'], topicIds: ['react', 'pg'] }}
    onSave={onSave} minimumAreas={1} />);
  fireEvent.click(within(screen.getByRole('region', { name: 'Web' })).getByRole('button', { name: 'Quitar área' }));
  fireEvent.click(screen.getByRole('button', { name: 'Quitar de todos modos' }));
  expect(screen.getByRole('heading', { name: 'Web' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'React' })).toBeDisabled();
  openSave();
  confirmSave();
  await screen.findByText('Intereses guardados correctamente');
  expect(screen.queryByRole('heading', { name: 'Web' })).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Bases de datos' })).toBeInTheDocument();
  expect(onSave).toHaveBeenCalledWith({ areaIds: ['datos'], topicIds: ['pg'] });
});

it('confirma el descarte antes de navegar con cambios pendientes', () => {
  setup(); add();
  fireEvent.click(screen.getByRole('button', { name: 'Atrás: Áreas técnicas' }));
  expect(push).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Seguir editando' }));
  expect(screen.getByRole('button', { name: 'APIs REST' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Atrás: Áreas técnicas' }));
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Descartar cambios' }));
  expect(push).toHaveBeenCalledWith('/mentorship/profile/areas');
});

it('espera el resultado del servidor antes de mostrar éxito', async () => {
  let resolve!: (value: InterestConfiguration) => void;
  onSave.mockReturnValue(new Promise(done => { resolve = done; }));
  setup(); add(); openSave();
  confirmSave();
  expect(screen.queryByText(/Intereses guardados correctamente/)).not.toBeInTheDocument();
  expect(screen.getAllByRole('button', { name: 'Guardar y continuar' })).toHaveLength(2);
  screen.getAllByRole('button', { name: 'Guardar y continuar' }).forEach(button => expect(button).toBeDisabled());
  resolve(initialConfiguration);
  await waitFor(() => expect(screen.getByRole('button', { name: 'APIs REST' })).toHaveAttribute('aria-pressed', 'false'));
  expect(onSave).toHaveBeenCalledTimes(1);
});

it('muestra la descripción del backend y omite el párrafo cuando está vacía', () => {
  const withDescription = [
    { id: 'web', name: 'Web', description: 'Desarrollo web', topics: [] },
    { id: 'datos', name: 'Bases de datos', description: '', topics: [] },
  ];
  const { container } = render(
    <MentorInterests catalog={withDescription} initialConfiguration={{ areaIds: ['web', 'datos'], topicIds: [] }} onSave={onSave} />,
  );
  expect(screen.getByText('Desarrollo web')).toBeInTheDocument();
  const descriptions = container.querySelectorAll('.interest-area-header p');
  expect(descriptions).toHaveLength(1);
});

it('cuenta los tópicos en singular y plural sin mostrar áreas ajenas', () => {
  const { unmount } = render(
    <MentorInterests catalog={catalog} initialConfiguration={{ areaIds: ['web'], topicIds: ['react'] }} onSave={onSave} />,
  );
  expect(screen.getByText('En tu perfil · 1 tópico')).toBeInTheDocument();
  expect(screen.getByText('1 de 2 seleccionados')).toBeInTheDocument();
  expect(screen.queryByText('En tu perfil · 0 tópicos')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'PostgreSQL' })).not.toBeInTheDocument();
  unmount();
  render(
    <MentorInterests catalog={catalog} initialConfiguration={{ areaIds: ['web'], topicIds: ['react', 'rest'] }} onSave={onSave} />,
  );
  expect(screen.getByText('En tu perfil · 2 tópicos')).toBeInTheDocument();
  expect(screen.getByText('2 de 2 seleccionados')).toBeInTheDocument();
});

it('usa un icono distinto por área técnica', () => {
  const areas: InterestArea[] = [
    { id: 'b', name: 'Backend', description: '', topics: [] },
    { id: 'f', name: 'Frontend', description: '', topics: [] },
    { id: 'c', name: 'Cloud/DevOps', description: '', topics: [] },
  ];
  const { container } = render(
    <MentorInterests catalog={areas} initialConfiguration={{ areaIds: ['b', 'f', 'c'], topicIds: [] }} onSave={onSave} />,
  );
  expect(container.querySelector('.lucide-server')).not.toBeNull();
  expect(container.querySelector('.lucide-monitor')).not.toBeNull();
  expect(container.querySelector('.lucide-cloud')).not.toBeNull();
});

it('avisa cuando no quedan tópicos sugeridos en un área', () => {
  render(
    <MentorInterests catalog={catalog} initialConfiguration={{ areaIds: ['web'], topicIds: ['react', 'rest'] }} onSave={onSave} />,
  );
  expect(screen.getByText('No hay más tópicos sugeridos en esta área.')).toBeInTheDocument();
});

it('conserva el foco del tópico después de alternarlo', () => {
  setup();
  add();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'APIs REST' }));
  fireEvent.click(screen.getByRole('button', { name: 'APIs REST' }));
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'APIs REST' }));
});

