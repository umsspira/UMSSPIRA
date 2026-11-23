import { fireEvent, render, screen } from '@testing-library/react';
import { fetchVacancyOffer } from '@/features/job-postings/my-applications.service';
import VacancyOfferPage from './page';

jest.mock('next/navigation', () => ({ useParams: () => ({ id: 'oferta-1' }) }));
jest.mock('@/features/job-postings/my-applications.service', () => ({ fetchVacancyOffer: jest.fn() }));

it('presenta la carga, permite reintentar tras un error y muestra la oferta recibida', async () => {
  jest.mocked(fetchVacancyOffer).mockRejectedValueOnce(new Error('sin conexión')).mockResolvedValueOnce({
    id: 'oferta-1', title: 'Analista de pruebas', companyName: 'Empresa ficticia', description: null,
    modality: null, experienceLevel: null, publishedAt: null, isAvailable: false,
  });
  render(<VacancyOfferPage />);
  expect(screen.getByRole('status')).toBeInTheDocument();
  expect(await screen.findByRole('alert')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
  expect(await screen.findByRole('heading', { name: 'Analista de pruebas' })).toBeInTheDocument();
  expect(screen.getByText('Vacante no disponible')).toBeInTheDocument();
  expect(fetchVacancyOffer).toHaveBeenLastCalledWith('oferta-1');
});
