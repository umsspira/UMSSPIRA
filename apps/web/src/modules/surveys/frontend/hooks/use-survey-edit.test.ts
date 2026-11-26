import { act, renderHook } from '@testing-library/react';

import { ApiError } from '@/shared/services/api-client';
import { useSurveyEdit } from './use-survey-edit';
import { updateMySurveyResponse } from '../services/surveys.service';

jest.mock('../services/surveys.service', () => ({
  ...jest.requireActual('../services/surveys.service'),
  updateMySurveyResponse: jest.fn(),
}));

const mockedUpdate =
  updateMySurveyResponse as jest.MockedFunction<
    typeof updateMySurveyResponse
  >;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useSurveyEdit', () => {
  const payload = {
    condicion_laboral: true,
    cargo: 'Analista',
    empresa: 'Acme',
    area: 'Sistemas',
    modalidad: 'Remoto',
    salario_mensual: '3.000–5.000',
    tiempo_insercion: '6',
  };

  it('guarda los cambios correctamente', async () => {
    mockedUpdate.mockResolvedValue();

    const { result } = renderHook(() => useSurveyEdit());

    let saved = false;

    await act(async () => {
      saved = await result.current.saveChanges(payload);
    });

    expect(saved).toBe(true);
    expect(result.current.status).toBe('success');
    expect(result.current.errorKind).toBeNull();
  });

  it('detecta edición ya utilizada', async () => {
    mockedUpdate.mockRejectedValue(
      new ApiError(409, 'Conflict'),
    );

    const { result } = renderHook(() => useSurveyEdit());

    await act(async () => {
      await result.current.saveChanges(payload);
    });

    expect(result.current.status).toBe('error');
    expect(result.current.errorKind).toBe('already-edited');
  });

  it('detecta encuesta vencida', async () => {
    mockedUpdate.mockRejectedValue(
      new ApiError(410, 'Expired'),
    );

    const { result } = renderHook(() => useSurveyEdit());

    await act(async () => {
      await result.current.saveChanges(payload);
    });

    expect(result.current.status).toBe('error');
    expect(result.current.errorKind).toBe('expired');
  });
});