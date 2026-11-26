import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import CandidatesPage from './page';
import { apiClient } from '@/shared/services/api-client';

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'vacante-qa' }),
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('@/shared/services/vacancies', () => ({ getVacancyById: async () => null }));
jest.mock('@/shared/services/api-client', () => ({
  ...jest.requireActual('@/shared/services/api-client'), apiClient: jest.fn(),
}));

const client = jest.mocked(apiClient);
const emptyMessage = 'No existen postulantes para esta vacante.';

it('muestra el estado vacío cuando la API devuelve una lista vacía', async () => {
  client.mockResolvedValueOnce([]);
  render(<CandidatesPage />);
  expect(await screen.findByText(emptyMessage)).toBeVisible();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});

it('ofrece reintentar ante un fallo de red sin mostrar candidatos ni el estado vacío', async () => {
  client.mockRejectedValueOnce(new TypeError('Failed to fetch'));
  render(<CandidatesPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Error de conexión');
  expect(screen.getByRole('button', { name: 'Reintentar' })).toBeVisible();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  expect(screen.queryByText(emptyMessage)).not.toBeInTheDocument();
});
