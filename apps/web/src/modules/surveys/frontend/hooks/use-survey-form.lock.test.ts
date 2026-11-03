import { act, renderHook } from '@testing-library/react';
import { useSurveyForm } from './use-survey-form';

describe('T1.2: la purga solamente afecta formularios editables', () => {
  it('mantiene la purga en caliente antes del envío', () => {
    const { result } = renderHook(() => useSurveyForm({
      condicion_laboral: true, cargo: 'Analista', empresa: 'UMSS',
    }));
    act(() => result.current.setWorkCondition(false));
    expect(result.current.values.cargo).toBe('');
    expect(result.current.values.empresa).toBe('');
  });

  it('tras bloquear desde respuesta persistida conserva los datos y descarta cambios', () => {
    const { result } = renderHook(() => useSurveyForm());
    act(() => result.current.lockForm({
      condicion_laboral: true, cargo: 'Analista original', empresa: 'UMSS',
    }));
    expect(result.current.isLocked).toBe(true);
    expect(result.current.canProceed).toBe(false);
    act(() => {
      result.current.setWorkCondition(false);
      result.current.setWorkField('cargo', 'CAMBIO INDEBIDO');
      result.current.replaceValues({ condicion_laboral: false });
      result.current.resetForm();
    });
    expect(result.current.values.condicion_laboral).toBe(true);
    expect(result.current.values.cargo).toBe('Analista original');
    expect(result.current.values.empresa).toBe('UMSS');
    expect(() => result.current.getSubmissionPayload()).toThrow('La encuesta ya fue enviada');
  });

  it('puede hidratar una respuesta original en un formulario bloqueado (caso 409)', () => {
    const { result } = renderHook(() => useSurveyForm({ condicion_laboral: false }));
    act(() => result.current.lockForm());
    act(() => result.current.lockForm({ condicion_laboral: true, cargo: 'Guardado previamente' }));
    expect(result.current.isLocked).toBe(true);
    expect(result.current.values.cargo).toBe('Guardado previamente');
  });
});
