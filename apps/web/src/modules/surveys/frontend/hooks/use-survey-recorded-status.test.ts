import { act, renderHook, waitFor } from '@testing-library/react';
import { useSurveyRecordedStatus } from './use-survey-recorded-status';
import { getMySurveyStatus } from '../services/surveys.service';

jest.mock('../services/surveys.service', () => ({
  getMySurveyStatus: jest.fn(),
}));
const mockGet = getMySurveyStatus as jest.Mock;

beforeEach(() => mockGet.mockReset());

const stored = {
  condicion_laboral: true, cargo: 'Analista original', empresa: 'UMSS',
  area: 'TI', modalidad: 'Remoto', salario_mensual: '3.000–5.000',
  tiempo_insercion: '6',
};

describe('T3.4 — consulta del estado de encuesta', () => {
  it('solo permite editar después de recibir que no hay respuesta', async () => {
    let resolve!: (value: unknown) => void;
    mockGet.mockImplementationOnce(() => new Promise((r) => { resolve = r; }));
    const { result } = renderHook(() => useSurveyRecordedStatus());
    expect(result.current.phase).toBe('checking');
    await act(async () => resolve({ responded: false, response: null }));
    expect(result.current.phase).toBe('editable');
  });

  it('al recargar recupera la respuesta real y marca el formulario bloqueado', async () => {
    mockGet.mockResolvedValueOnce({ responded: true, response: stored });
    const { result } = renderHook(() => useSurveyRecordedStatus());
    await waitFor(() => expect(result.current.phase).toBe('answered'));
    expect(result.current.response).toEqual(stored);
  });

  it('no habilita la edición si la consulta falla, y permite reintentar', async () => {
    mockGet.mockRejectedValueOnce(new Error('Fuera de línea'));
    mockGet.mockResolvedValueOnce({ responded: false, response: null });
    const { result } = renderHook(() => useSurveyRecordedStatus());
    await waitFor(() => expect(result.current.phase).toBe('error'));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.phase).toBe('editable'));
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('tras POST 409 conserva el bloqueo y obtiene la respuesta original', async () => {
    mockGet.mockResolvedValueOnce({ responded: false, response: null });
    mockGet.mockResolvedValueOnce({ responded: true, response: stored });
    const { result } = renderHook(() => useSurveyRecordedStatus());
    await waitFor(() => expect(result.current.phase).toBe('editable'));
    act(() => result.current.markSubmitted());
    expect(result.current.phase).toBe('answered');
    await waitFor(() => expect(result.current.response).toEqual(stored));
  });

  it('no desbloquea aunque falle la lectura posterior a POST confirmado', async () => {
    mockGet.mockResolvedValueOnce({ responded: false, response: null });
    mockGet.mockRejectedValueOnce(new Error('Servidor indisponible'));
    const { result } = renderHook(() => useSurveyRecordedStatus());
    await waitFor(() => expect(result.current.phase).toBe('editable'));
    act(() => result.current.markSubmitted());
    await waitFor(() => expect(mockGet).toHaveBeenCalledTimes(2));
    expect(result.current.phase).toBe('answered');
  });
});
