import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import CreateEventPage from '@/app/(dashboard)/events/create/page';
import { AuthenticatedUserProvider } from '@/modules/auth/frontend/components/authenticated-user-context';

const mockCreateEvent = jest.fn();
const mockScheduleDraftEvent = jest.fn();

jest.mock('next/navigation', () => ({
  usePathname: () => '/events/create',
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/shared/services/events-service', () => ({
  createEvent: (...args: unknown[]) => mockCreateEvent(...args),
  scheduleDraftEvent: (...args: unknown[]) => mockScheduleDraftEvent(...args),
}));

describe('crear y programar un evento', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateEvent.mockResolvedValue({ id: 'draft-1' });
    mockScheduleDraftEvent.mockResolvedValue({ id: 'draft-1' });
  });

  it('guarda un borrador y programa su publicación', async () => {
    const { container } = render(
      <AuthenticatedUserProvider userId="admin-1">
        <CreateEventPage />
      </AuthenticatedUserProvider>,
    );

    fireEvent.change(screen.getByPlaceholderText('Ej. Feria de Oportunidades UMSS'), {
      target: { value: 'Seminario de IA Aplicada' },
    });

    const dates = container.querySelectorAll<HTMLInputElement>('input[type="date"]');
    const times = container.querySelectorAll<HTMLInputElement>('input[type="time"]');

    fireEvent.change(dates[0], { target: { value: '2099-12-05' } });
    fireEvent.change(times[0], { target: { value: '10:00' } });
    fireEvent.change(dates[1], { target: { value: '2099-12-05' } });
    fireEvent.change(times[1], { target: { value: '12:00' } });
    fireEvent.change(screen.getByPlaceholderText('Ej. 150'), {
      target: { value: '80' },
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Programar publicación' })[0]);

    const dialog = screen.getByRole('dialog', { name: 'Programar publicación' });

    fireEvent.change(within(dialog).getByLabelText('Fecha de publicación *'), {
      target: { value: '2099-11-25' },
    });
    fireEvent.change(within(dialog).getByLabelText('Hora de publicación *'), {
      target: { value: '08:00' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar programación' }));

    await waitFor(() => {
      expect(mockCreateEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Seminario de IA Aplicada',
          status: 'BORRADOR',
        }),
        'admin-1',
      );
      expect(mockScheduleDraftEvent).toHaveBeenCalledWith(
        'draft-1',
        new Date('2099-11-25T08:00').toISOString(),
        'admin-1',
      );
    });

    expect(await screen.findByRole('heading', { name: 'Publicación programada' }))
      .toBeInTheDocument();
  });
});
