import { render, screen, within } from '@testing-library/react';
import type { EventParticipantsDto } from '@umsspira/shared-types';
import EventParticipantsPage from '@/app/(dashboard)/events/[id]/participants/page';
import { AuthenticatedUserProvider } from '@/modules/auth/frontend/components/authenticated-user-context';
import { getEventParticipants } from '@/shared/services/events-service';
import { formatEventDateTime } from '@/shared/utils/event-date-time';

jest.mock('next/navigation', () => ({ useParams: () => ({ id: 'evento' }) }));
jest.mock('@/shared/services/events-service', () => ({ getEventParticipants: jest.fn() }));

const data: EventParticipantsDto = {
  eventId: 'evento', eventTitle: 'Evento de prueba',
  occupation: { maxCapacity: 10, confirmed: 2, cancelled: 1, available: 8, occupancyPercent: 20 },
  participants: [
    { registrationId: '1', name: 'Ana', status: 'CONFIRMADA', registeredAt: '2026-11-01T12:00:00Z', passStatus: 'VIGENTE', attendedAt: '2026-11-12T20:00:00Z' },
    { registrationId: '2', name: 'Luis', status: 'CONFIRMADA', registeredAt: '2026-11-01T12:00:00Z', passStatus: 'VIGENTE', attendedAt: null },
    { registrationId: '3', name: 'Eva', status: 'CANCELADA', registeredAt: '2026-11-01T12:00:00Z', passStatus: 'INVALIDADO', attendedAt: null },
  ],
};

it('distingue la asistencia registrada, pendiente y ausente con la fecha en la zona del evento', async () => {
  jest.mocked(getEventParticipants).mockResolvedValue(data);
  render(
    <AuthenticatedUserProvider userId="administrador" role="administrador">
      <EventParticipantsPage />
    </AuthenticatedUserProvider>,
  );
  const attended = await screen.findByRole('row', { name: /Ana/ });
  expect(within(attended).getByText('Registrada')).toBeInTheDocument();
  const timestamp = within(attended).getByText(formatEventDateTime(data.participants[0].attendedAt!));
  expect(timestamp).toHaveAttribute('datetime', data.participants[0].attendedAt);
  expect(within(screen.getByRole('row', { name: /Luis/ })).getByText('Pendiente')).toBeInTheDocument();
  expect(within(screen.getByRole('row', { name: /Eva/ })).getByText('Sin asistencia')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Escanear QR' })).toHaveAttribute('href', '/events/evento/scanner');
});
