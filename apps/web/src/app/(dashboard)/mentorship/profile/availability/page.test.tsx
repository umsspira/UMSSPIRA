import { render, screen, within } from '@testing-library/react';
import MentorAvailabilityRoute from './page';

jest.mock('@/features/mentorship/components/mentor-availability-page', () => ({
  MentorAvailabilityPage: () => <div data-testid="mentor-availability-page">Disponibilidad</div>,
}));

describe('MentorAvailabilityRoute (Routing Next.js /mentorship/profile/availability)', () => {
  it('BUG-06-1602: muestra el breadcrumb de navegación sobre la subvista', () => {
    render(<MentorAvailabilityRoute />);

    const breadcrumb = screen.getByRole('navigation', { name: 'Ruta de navegación' });
    expect(within(breadcrumb).getByRole('link', { name: /Inicio/ })).toHaveAttribute('href', '/');
    expect(within(breadcrumb).getByRole('link', { name: 'Mentorías' })).toHaveAttribute('href', '/mentorship');
    expect(within(breadcrumb).getByRole('link', { name: 'Mi perfil de mentor' })).toHaveAttribute('href', '/mentorship/profile');
    expect(within(breadcrumb).getByText('Configurar disponibilidad')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('mentor-availability-page')).toBeInTheDocument();
  });
});
