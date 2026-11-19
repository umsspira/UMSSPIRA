import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { EventManagementContent } from './events-ui';

const mockGetAdminEvents = jest.fn();
const mockCancelDraftSchedule = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => '/events',
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/shared/services/events-service', () => ({
  getAdminEvents: (...args: unknown[]) => mockGetAdminEvents(...args),
  cancelDraftSchedule: (...args: unknown[]) => mockCancelDraftSchedule(...args),
}));

const programmedEvent = {
  id: 'event-1',
  title: 'Seminario de IA Aplicada',
  description: 'Evento de prueba',
  startDate: '2099-12-05T14:00:00Z',
  endDate: '2099-12-05T16:00:00Z',
  maxCapacity: 80,
  location: 'Auditorio',
  status: 'BORRADOR',
  createdBy: 'admin-1',
  createdAt: '2026-11-01T10:00:00Z',
  scheduledAt: '2099-11-25T12:00:00Z',
  schedulingStatus: 'PENDIENTE',
};

describe('gestión de publicaciones programadas', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAdminEvents.mockResolvedValue([programmedEvent]);
  });

  it('muestra el evento como programado con su fecha y acciones', async () => {
    render(<EventManagementContent userId="admin-1" />);

    expect(await screen.findByText('Seminario de IA Aplicada')).toBeInTheDocument();
    expect(screen.getByText('PROGRAMADO')).toBeInTheDocument();
    expect(screen.getByText(/Se publicará/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cambiar fecha' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelar programación' })).toBeInTheDocument();
  });

  it('cancela la programación y conserva el borrador', async () => {
    mockCancelDraftSchedule.mockResolvedValue({
      ...programmedEvent,
      scheduledAt: null,
      schedulingStatus: null,
    });

    render(<EventManagementContent userId="admin-1" />);

    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar programación' }));
    const dialog = screen.getByRole('dialog', { name: '¿Cancelar programación?' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar programación' }));

    await waitFor(() => {
      expect(mockCancelDraftSchedule).toHaveBeenCalledWith('event-1', 'admin-1');
    });
    expect(await screen.findByText('Programación cancelada')).toBeInTheDocument();
    expect(screen.queryByText('PROGRAMADO')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument();
  });
});
