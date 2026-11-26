import { apiFetch } from '@/shared/services/api-client';
import { fetchMyApplications, fetchVacancyOffer } from './my-applications.service';

jest.mock('@/shared/services/api-client', () => ({ apiFetch: jest.fn() }));
const fetch = jest.mocked(apiFetch);
const id = '44500000-0000-4000-8000-000000000001';
const row = { id, vacancyId: id, vacancyTitle: 'Analista', companyName: null, appliedAt: null, matchPercentage: null, isVacancyAvailable: true };

it('conserva una postulación sin afinidad calculada', async () => {
  fetch.mockResolvedValueOnce([row]);
  await expect(fetchMyApplications()).resolves.toEqual([row]);
  expect(fetch).toHaveBeenCalledWith('/api/v1/vacantes/mis-postulaciones');
});

it('rechaza porcentajes fuera del contrato', async () => {
  fetch.mockResolvedValueOnce([{ ...row, matchPercentage: 101 }]);
  await expect(fetchMyApplications()).rejects.toThrow();
});

it('consulta la oferta solicitada y conserva su disponibilidad', async () => {
  const offer = { id, title: 'Analista', companyName: null, description: null, modality: null, experienceLevel: null, publishedAt: null, isAvailable: false };
  fetch.mockResolvedValueOnce(offer);
  await expect(fetchVacancyOffer(id)).resolves.toEqual(offer);
  expect(fetch).toHaveBeenCalledWith(`/api/v1/vacantes/${id}/oferta`);
});
