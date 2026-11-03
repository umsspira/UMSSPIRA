import { act, renderHook } from '@testing-library/react';
import { useSurveySubmit } from './use-survey-submit';
import { submitSurvey } from '../services/surveys.service';

jest.mock('../services/surveys.service', () => ({
  ...jest.requireActual('../services/surveys.service'),
  submitSurvey: jest.fn(),
}));
const mockedSubmit = submitSurvey as jest.Mock;

beforeEach(() => mockedSubmit.mockReset());

describe('T3.4: bloqueo después de 201 o 409', () => {
  it('no permite segundo POST ni resetFeedback tras el éxito', async () => {
    mockedSubmit.mockResolvedValue(undefined);
    const { result } = renderHook(() => useSurveySubmit());
    const input = { condicion_laboral: false };
    await act(async () => { await result.current.submit(input); });
    expect(result.current.status).toBe('success');
    act(() => result.current.resetFeedback());
    expect(result.current.status).toBe('success');
    await act(async () => {
      expect(await result.current.submit(input)).toBe(false);
    });
    expect(mockedSubmit).toHaveBeenCalledTimes(1);
  });
});
