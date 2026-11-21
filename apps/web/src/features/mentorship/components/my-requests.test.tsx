import '@testing-library/jest-dom';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MyRequests } from './my-requests';
import {
  cancelMyRequest,
  listMyRequests,
  MyRequestsError,
  type MyRequest,
  type MyRequestCounts,
  type MyRequestPage,
  type MyRequestStatus,
} from '../services/my-requests-api';

jest.mock('../services/my-requests-api', () => ({
  listMyRequests: jest.fn(),
  cancelMyRequest: jest.fn(),
  MyRequestsError: class MyRequestsError extends Error {
    constructor(
      message: string,
      public readonly status: number,
      public readonly code?: string,
    ) {
      super(message);
    }
  },
}));

const request = (
  overrides: Partial<MyRequest> & { id?: string; estado?: MyRequestStatus } = {},
): MyRequest => ({
  id: overrides.id ?? 'request-1',
  mentor: {
    id: 'mentor-1',
    nombre: 'Ana Quispe',
    cargo: 'Data Scientist',
    empresa: 'Acme',
  },
  fecha: '2026-11-23',
  hora_inicio: '09:00',
  hora_fin: '10:00',
  mensaje: 'Orientación para mi proyecto',
  estado: 'PENDIENTE',
  fecha_creacion: '2026-11-16',
  fecha_respuesta: null,
  fecha_actualizacion: '2026-11-16',
  ...overrides,
});

function page(items: MyRequest[], total = items.length): MyRequestPage {
  const counts: MyRequestCounts = {
    TODAS: total,
    PENDIENTE: items.filter((item) => item.estado === 'PENDIENTE').length,
    ACEPTADO: items.filter((item) => item.estado === 'ACEPTADO').length,
    RECHAZADO: items.filter((item) => item.estado === 'RECHAZADO').length,
    CANCELADO: items.filter((item) => item.estado === 'CANCELADO').length,
  };
  return { items, total, page: 1, pageSize: 20, totalPages: total > 20 ? 2 : 1, counts };
}

beforeEach(() => {
  jest.clearAllMocks();
  (listMyRequests as jest.Mock).mockResolvedValue(page([request()]));
});

it('muestra la tabla con mentor, cargo, fecha, horario, motivo y estado', async () => {
  (listMyRequests as jest.Mock).mockResolvedValue(
    page([
      request({ id: 'pending', estado: 'PENDIENTE' }),
      request({ id: 'accepted', estado: 'ACEPTADO' }),
      request({ id: 'rejected', estado: 'RECHAZADO' }),
      request({ id: 'canceled', estado: 'CANCELADO' }),
    ]),
  );

  render(<MyRequests />);

  expect(await screen.findByRole('table', { name: 'Historial de solicitudes de mentoría' })).toBeInTheDocument();
  for (const column of ['Mentor', 'Cargo', 'Fecha', 'Horario', 'Motivo', 'Estado', 'Acción']) {
    expect(screen.getByRole('columnheader', { name: column })).toBeInTheDocument();
  }
  expect(screen.getAllByText('Ana Quispe')).toHaveLength(4);
  expect(screen.getAllByText('Data Scientist')).toHaveLength(4);
  expect(screen.getAllByText('23/11/2026')).toHaveLength(4);
  expect(screen.getAllByText('09:00 – 10:00')).toHaveLength(4);
  expect(screen.getAllByText('Orientación para mi proyecto')).toHaveLength(4);
  expect(screen.getByText('Pendiente')).toBeInTheDocument();
  expect(screen.getByText('Aceptada')).toBeInTheDocument();
  expect(screen.getByText('Rechazada')).toBeInTheDocument();
  expect(screen.getByText('Cancelada')).toBeInTheDocument();
});

it('solo permite cancelar las solicitudes pendientes', async () => {
  (listMyRequests as jest.Mock).mockResolvedValue(
    page([
      request({ id: 'pending', estado: 'PENDIENTE' }),
      request({ id: 'accepted', estado: 'ACEPTADO' }),
      request({ id: 'rejected', estado: 'RECHAZADO' }),
      request({ id: 'canceled', estado: 'CANCELADO' }),
    ]),
  );

  render(<MyRequests />);
  await screen.findByRole('table');

  expect(screen.getAllByRole('button', { name: 'Cancelar solicitud' })).toHaveLength(1);
  expect(screen.getAllByText('Sin acciones')).toHaveLength(3);
});

it('muestra el estado vacío sin tabla cuando no hay solicitudes', async () => {
  (listMyRequests as jest.Mock).mockResolvedValue(page([]));

  render(<MyRequests />);

  expect(await screen.findByText('Aún no has enviado solicitudes de mentoría.')).toBeInTheDocument();
  expect(screen.getByText('Cuando envíes una solicitud, aparecerá aquí con su estado.')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Explorar mentores' })).toHaveAttribute('href', '/mentorship/directory');
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});

it('cambia de pestaña y consulta el estado seleccionado', async () => {
  render(<MyRequests />);
  await screen.findByRole('table');

  fireEvent.click(screen.getByRole('tab', { name: /Pendientes/ }));

  await waitFor(() =>
    expect(listMyRequests).toHaveBeenCalledWith(
      { status: 'PENDIENTE', page: 1 },
      expect.anything(),
    ),
  );
});

it('abre la confirmación con los datos reales y cancelar no envía la petición', async () => {
  render(<MyRequests />);
  await screen.findByRole('table');

  fireEvent.click(screen.getByRole('button', { name: 'Cancelar solicitud' }));
  const dialog = screen.getByRole('alertdialog');
  expect(within(dialog).getByText('¿Cancelar esta solicitud de mentoría?')).toBeInTheDocument();
  expect(within(dialog).getByText('Ana Quispe')).toBeInTheDocument();
  expect(within(dialog).getByText('23/11/2026')).toBeInTheDocument();

  fireEvent.click(within(dialog).getByRole('button', { name: 'Volver' }));

  expect(cancelMyRequest).not.toHaveBeenCalled();
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
});

it('confirma una sola vez y actualiza la fila a Cancelada', async () => {
  (cancelMyRequest as jest.Mock).mockResolvedValue({
    ...request({ estado: 'CANCELADO', fecha_actualizacion: '2026-11-17' }),
  });

  render(<MyRequests />);
  await screen.findByRole('table');

  fireEvent.click(screen.getByRole('button', { name: 'Cancelar solicitud' }));
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Sí, cancelar' }));

  expect(await screen.findByText('Solicitud cancelada. El mentor verá el estado Cancelada.')).toBeInTheDocument();
  expect(cancelMyRequest).toHaveBeenCalledTimes(1);
  expect(cancelMyRequest).toHaveBeenCalledWith('request-1');
  expect(await screen.findByText('Cancelada')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Cancelar solicitud' })).not.toBeInTheDocument();
  expect(screen.getByText('Sin acciones')).toBeInTheDocument();
});

it('no duplica la petición si se confirma dos veces seguidas', async () => {
  let resolveCancel: (value: MyRequest) => void = () => undefined;
  (cancelMyRequest as jest.Mock).mockImplementation(
    () => new Promise<MyRequest>((resolve) => { resolveCancel = resolve; }),
  );

  render(<MyRequests />);
  await screen.findByRole('table');

  fireEvent.click(screen.getByRole('button', { name: 'Cancelar solicitud' }));
  const confirm = within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Sí, cancelar' });
  fireEvent.click(confirm);
  fireEvent.click(confirm);

  expect(cancelMyRequest).toHaveBeenCalledTimes(1);

  await act(async () => {
    resolveCancel(request({ estado: 'CANCELADO' }));
  });
  expect(await screen.findByText('Solicitud cancelada. El mentor verá el estado Cancelada.')).toBeInTheDocument();
});

it('ante un 409 avisa y recarga el listado con el estado real', async () => {
  (cancelMyRequest as jest.Mock).mockRejectedValue(
    new MyRequestsError('Esta solicitud ya no está pendiente', 409, 'SOLICITUD_NO_PENDIENTE'),
  );

  render(<MyRequests />);
  await screen.findByRole('table');

  fireEvent.click(screen.getByRole('button', { name: 'Cancelar solicitud' }));
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Sí, cancelar' }));

  expect(
    await screen.findByText(/Esta solicitud ya no está pendiente/),
  ).toBeInTheDocument();
  await waitFor(() => expect(listMyRequests).toHaveBeenCalledTimes(2));
});

it('ante un 404 avisa que la solicitud no pertenece al usuario y recarga', async () => {
  (cancelMyRequest as jest.Mock).mockRejectedValue(
    new MyRequestsError('La solicitud no existe', 404, 'SOLICITUD_NO_ENCONTRADA'),
  );

  render(<MyRequests />);
  await screen.findByRole('table');

  fireEvent.click(screen.getByRole('button', { name: 'Cancelar solicitud' }));
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Sí, cancelar' }));

  expect(
    await screen.findByText(/La solicitud no existe o no te pertenece/),
  ).toBeInTheDocument();
  await waitFor(() => expect(listMyRequests).toHaveBeenCalledTimes(2));
});

it('mantiene el modal abierto y permite reintentar ante un error de red', async () => {
  (cancelMyRequest as jest.Mock).mockRejectedValue(
    new Error('No se pudo conectar con el servidor. Intenta nuevamente.'),
  );

  render(<MyRequests />);
  await screen.findByRole('table');

  fireEvent.click(screen.getByRole('button', { name: 'Cancelar solicitud' }));
  fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Sí, cancelar' }));

  const dialog = await screen.findByRole('alertdialog');
  expect(within(dialog).getByText('No se pudo conectar con el servidor. Intenta nuevamente.')).toBeInTheDocument();
  expect(within(dialog).getByRole('button', { name: 'Sí, cancelar' })).toBeEnabled();
  expect(screen.getByText('Pendiente')).toBeInTheDocument();
});

it('actualiza manualmente el listado', async () => {
  render(<MyRequests />);
  await screen.findByRole('table');

  fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));

  await waitFor(() => expect(listMyRequests).toHaveBeenCalledTimes(2));
});
