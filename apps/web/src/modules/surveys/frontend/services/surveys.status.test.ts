import { apiFetch, ApiError } from '@/shared/services/api-client';
import { getMySurveyStatus, SURVEY_STATUS_PATH } from './surveys.service';

jest.mock('@/shared/services/api-client', () => ({
  ...jest.requireActual('@/shared/services/api-client'),
  apiFetch: jest.fn(),
}));
const mockedFetch = apiFetch as jest.Mock;
beforeEach(() => mockedFetch.mockReset());

describe('T3.4: consulta GET autenticada de estado', () => {
  it('consulta sin caché el estado real del titulado', async () => {
    mockedFetch.mockResolvedValueOnce({ responded: false, response: null });
    await expect(getMySurveyStatus()).resolves.toEqual({ responded: false, response: null });
    expect(mockedFetch).toHaveBeenCalledWith(SURVEY_STATUS_PATH, expect.objectContaining({
      method: 'GET', cache: 'no-store',
    }));
  });

  it('propaga errores HTTP y no los transforma en permiso para editar', async () => {
    mockedFetch.mockRejectedValueOnce(new ApiError(503, 'Servidor caído'));
    await expect(getMySurveyStatus()).rejects.toMatchObject({ status: 503 });
  });

  it('rechaza un cuerpo inválido en vez de habilitar un formulario inseguro', async () => {
    mockedFetch.mockResolvedValueOnce(undefined);
    await expect(getMySurveyStatus()).rejects.toThrow('Respuesta inválida');
  });
});
