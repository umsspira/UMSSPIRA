import { act, renderHook } from '@testing-library/react';
import {
  clearAllSurveyDrafts,
  hasDraftContent,
  sanitizeDraft,
  useSurveyDraft,
} from './use-survey-draft';

const KEY = 'umsspira:survey-draft:user-1';

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('sanitizeDraft', () => {
  it('descarta salario y tiempo de inserción', () => {
    const result = sanitizeDraft({
      workCondition: 'works',
      cargo: 'Analista',
      salario: '5001-8000',
      insercionMeses: 6,
    });
    expect(result).toEqual({
      workCondition: 'works',
      cargo: 'Analista',
      empresa: undefined,
      area: undefined,
      modalidad: undefined,
    });
    expect(result).not.toHaveProperty('salario');
    expect(result).not.toHaveProperty('insercionMeses');
  });

  it('con "No trabaja" conserva solo la condición', () => {
    expect(sanitizeDraft({ workCondition: 'not-works', cargo: 'Analista' })).toEqual({
      workCondition: 'not-works',
    });
  });

  it('rechaza datos inválidos', () => {
    expect(sanitizeDraft({ workCondition: 'otra' })).toBeNull();
    expect(sanitizeDraft('texto')).toBeNull();
  });
});

// QA Bug 2
describe('hasDraftContent', () => {
  it('es falso con solo la condición "Trabaja"', () => {
    expect(hasDraftContent({ workCondition: 'works' })).toBe(false);
  });

  it('es falso con campos en blanco o solo espacios', () => {
    expect(hasDraftContent({ workCondition: 'works', cargo: '   ', empresa: '' })).toBe(false);
  });

  it('es falso con "No trabaja"', () => {
    expect(hasDraftContent({ workCondition: 'not-works' })).toBe(false);
  });

  it('es verdadero cuando hay algún campo con valor', () => {
    expect(hasDraftContent({ workCondition: 'works', cargo: 'Dev' })).toBe(true);
    expect(hasDraftContent({ workCondition: 'works', modalidad: 'remoto' })).toBe(true);
    expect(hasDraftContent({ workCondition: 'works', salario_mensual: '5.001–8.000' })).toBe(true);
    expect(hasDraftContent({ workCondition: 'works', tiempo_insercion: '6' })).toBe(true);
  });
});

describe('useSurveyDraft', () => {
  it('guarda y recupera el borrador del usuario', () => {
    const first = renderHook(() => useSurveyDraft('user-1'));
    act(() => first.result.current.saveDraft({ workCondition: 'works', cargo: 'Dev' }));
    expect(first.result.current.status).toBe('saved');

    const second = renderHook(() => useSurveyDraft('user-1'));
    expect(second.result.current.draft?.cargo).toBe('Dev');
    expect(second.result.current.status).toBe('recovered');
  });

  it('no mezcla borradores entre usuarios', () => {
    const a = renderHook(() => useSurveyDraft('user-1'));
    act(() => a.result.current.saveDraft({ workCondition: 'works' }));

    const b = renderHook(() => useSurveyDraft('user-2'));
    expect(b.result.current.draft).toBeNull();
  });

  it('clearDraft elimina el borrador', () => {
    const { result } = renderHook(() => useSurveyDraft('user-1'));
    act(() => result.current.saveDraft({ workCondition: 'works' }));
    act(() => result.current.clearDraft());
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it('guarda salario y tiempo en sessionStorage y los recupera en la misma pestaña', () => {
    const first = renderHook(() => useSurveyDraft('user-1'));
    act(() => first.result.current.saveDraft({
      workCondition: 'works', cargo: 'Dev', salario_mensual: '5.001–8.000', tiempo_insercion: '6',
    }));
    expect(window.localStorage.getItem(KEY)).not.toContain('5.001');
    const second = renderHook(() => useSurveyDraft('user-1'));
    expect(second.result.current.draft).toEqual({
      workCondition: 'works', cargo: 'Dev', salario_mensual: '5.001–8.000', tiempo_insercion: '6',
    });
  });

  it('clearDraft también borra salario y tiempo de la sesión', () => {
    const { result } = renderHook(() => useSurveyDraft('user-1'));
    act(() => result.current.saveDraft({ workCondition: 'works', salario_mensual: '5.001–8.000' }));
    act(() => result.current.clearDraft());
    expect(window.sessionStorage.getItem('umsspira:survey-session:user-1')).toBeNull();
  });

  it('clearAllSurveyDrafts borra todos los borradores', () => {
    window.sessionStorage.setItem('umsspira:survey-session:a', '{}');
    window.localStorage.setItem('umsspira:survey-draft:a', '{}');
    window.localStorage.setItem('umsspira:survey-draft:b', '{}');
    window.localStorage.setItem('otra-clave', 'x');
    clearAllSurveyDrafts();
    expect(window.localStorage.getItem('umsspira:survey-draft:a')).toBeNull();
    expect(window.localStorage.getItem('otra-clave')).toBe('x');
    expect(window.sessionStorage.getItem('umsspira:survey-session:a')).toBeNull();
  });

  // QA Bug 2: el aviso «guardado» no debe aparecer con la encuesta vacía
  it('no muestra el aviso "guardado" si solo se eligió la condición', () => {
    const { result } = renderHook(() => useSurveyDraft('user-1'));
    act(() => result.current.saveDraft({ workCondition: 'works' }));
    expect(result.current.status).toBe('idle');
    expect(window.localStorage.getItem(KEY)).not.toBeNull();
  });

  it('muestra el aviso "guardado" cuando hay contenido', () => {
    const { result } = renderHook(() => useSurveyDraft('user-1'));
    act(() => result.current.saveDraft({ workCondition: 'works', cargo: 'Dev' }));
    expect(result.current.status).toBe('saved');
  });

  it('con "No trabaja" no muestra el aviso', () => {
    const { result } = renderHook(() => useSurveyDraft('user-1'));
    act(() => result.current.saveDraft({ workCondition: 'not-works' }));
    expect(result.current.status).toBe('idle');
  });

  it('borra el borrador cuando cambia el userId de la sesión (Mejora 1.6)', () => {
    const { result, rerender } = renderHook(({ id }: { id?: string }) => useSurveyDraft(id), {
      initialProps: { id: 'user-1' as string | undefined },
    });
    act(() => result.current.saveDraft({ workCondition: 'works', cargo: 'Dev 1' }));
    expect(window.localStorage.getItem(KEY)).not.toBeNull();

    rerender({ id: 'user-2' });
    expect(window.localStorage.getItem(KEY)).toBeNull();
    expect(result.current.draft).toBeNull();
  });

  it('borra el borrador cuando se detecta limpieza de autenticación en storage', () => {
    const { result } = renderHook(() => useSurveyDraft('user-1'));
    act(() => result.current.saveDraft({ workCondition: 'works', cargo: 'Dev 1' }));
    expect(window.localStorage.getItem(KEY)).not.toBeNull();

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'umsspira:auth-token',
          newValue: null,
        }),
      );
    });
    expect(window.localStorage.getItem(KEY)).toBeNull();
    expect(result.current.draft).toBeNull();
  });
});