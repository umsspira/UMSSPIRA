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

function renderParticipants(participants = data.participants) {
  jest.mocked(getEventParticipants).mockResolvedValue({ ...data, participants });
  render(
    <AuthenticatedUserProvider userId="administrador" role="administrador">
      <EventParticipantsPage />
    </AuthenticatedUserProvider>,
  );
}

it('muestra el mockup de asistencia registrada y conserva la fecha del ingreso', async () => {
  renderParticipants();
  const attended = await screen.findByRole('row', { name: /Ana/ });
  expect(screen.getByRole('heading', { name: 'Participantes y asistencia' })).toBeInTheDocument();
  expect(screen.getByText('La asistencia se registró sin modificar la inscripción ni el cupo del evento.')).toBeInTheDocument();
  const timestamp = within(attended).getByText('Registrada');
  expect(timestamp).toHaveAttribute('datetime', data.participants[0].attendedAt);
  expect(timestamp).toHaveAttribute('title', formatEventDateTime(data.participants[0].attendedAt!));
  expect(within(screen.getByRole('row', { name: /Luis/ })).getByText('Pendiente')).toBeInTheDocument();
  expect(within(screen.getByRole('row', { name: /Eva/ })).getByText('Sin asistencia')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Escanear QR' })).toHaveAttribute('href', '/events/evento/scanner');
});

it('presenta participantes inscritos mientras todas las asistencias estén pendientes', async () => {
  renderParticipants(data.participants.map((participant) => ({ ...participant, attendedAt: null })));
  await screen.findByRole('row', { name: /Ana/ });
  expect(screen.getByRole('heading', { name: 'Participantes inscritos' })).toBeInTheDocument();
  expect(screen.queryByText('La asistencia se registró sin modificar la inscripción ni el cupo del evento.')).not.toBeInTheDocument();
});
