import { render, screen } from '@testing-library/react';
import FriendlyJobPostingDetailPage from './page';

jest.mock('@/app/portal/empleos/_components/job-posting-detail', () => ({
  JobPostingDetail: ({ id }: { id: string }) => <div data-testid="job-detail">{id}</div>,
}));

describe('detalle de vacante con ruta amigable', () => {
  it('usa el jobId del query para recuperar la vacante seleccionada', () => {
    render(<FriendlyJobPostingDetailPage searchParams={{ jobId: 'vacancy-42' }} />);
    expect(screen.getByTestId('job-detail')).toHaveTextContent('vacancy-42');
  });

  it('ofrece volver al listado si se abre sin identidad de vacante', () => {
    render(<FriendlyJobPostingDetailPage searchParams={{}} />);
    expect(screen.getByRole('heading', { name: 'Selecciona una vacante para ver su detalle' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a vacantes' })).toHaveAttribute('href', '/job-postings');
  });
});
