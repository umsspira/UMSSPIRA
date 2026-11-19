import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import MyApplicationsPage from './page';
import { fetchMyApplications } from '@/features/job-postings/my-applications.service';

jest.mock('@/features/job-postings/my-applications.service', () => ({
  fetchMyApplications: jest.fn(),
}));

const fetchMyApplicationsMock = jest.mocked(fetchMyApplications);

describe('Mis postulaciones (HU-006)', () => {
  beforeEach(() => {
    fetchMyApplicationsMock.mockReset();
  });

  it('muestra la fecha, afinidad, disponibilidad y enlace de cada postulación', async () => {
    fetchMyApplicationsMock.mockResolvedValue([
      {
        id: '44800000-0000-4000-8000-000000000001',
        vacancyId: '44500000-0000-4000-8000-000000000001',
        vacancyTitle: 'Desarrollador',
        companyName: 'Empresa Demo',
        appliedAt: '2026-11-02T00:00:00.000Z',
        matchPercentage: null,
        isVacancyAvailable: false,
      },
    ]);

    render(<MyApplicationsPage />);

    expect(await screen.findByText('Desarrollador')).toBeInTheDocument();
    expect(screen.getByText('Empresa Demo')).toBeInTheDocument();
    expect(screen.getByText(/Postulación:/)).toBeInTheDocument();
    expect(screen.getByText('Sin calcular')).toBeInTheDocument();
    expect(screen.getByText('Vacante no disponible')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ver oferta/ })).toHaveAttribute(
      'href',
      '/my-applications/oferta/44500000-0000-4000-8000-000000000001',
    );
  });

  it('ofrece ver vacantes cuando todavía no hay postulaciones', async () => {
    fetchMyApplicationsMock.mockResolvedValue([]);

    render(<MyApplicationsPage />);

    expect(await screen.findByText('Aún no te has postulado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver vacantes' })).toHaveAttribute(
      'href',
      '/job-postings',
    );
  });

  it('muestra el error solicitado y permite reintentar', async () => {
    fetchMyApplicationsMock
      .mockRejectedValueOnce(new Error('fallo de red'))
      .mockResolvedValueOnce([]);

    render(<MyApplicationsPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No pudimos cargar tus postulaciones',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    await waitFor(() => expect(fetchMyApplicationsMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('Aún no te has postulado')).toBeInTheDocument();
  });
});
