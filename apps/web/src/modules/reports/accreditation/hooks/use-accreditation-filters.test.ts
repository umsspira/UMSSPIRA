import { act, renderHook } from '@testing-library/react';
import {
  buildFiltersQuery,
  readFiltersFromParams,
  useAccreditationFilters,
} from './use-accreditation-filters';

const mockReplace = jest.fn();
let mockQuery = '';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/reports/acreditacion',
  useSearchParams: () => new URLSearchParams(mockQuery),
}));

beforeEach(() => {
  mockReplace.mockClear();
  mockQuery = '';
});

describe('lectura de filtros desde la URL', () => {
  test('sin parámetros los filtros quedan en «Todas» y «Todos»', () => {
    expect(readFiltersFromParams(new URLSearchParams(''))).toEqual({
      cohort: '',
      semester: '',
    });
  });

  test('CA-06: recupera cohorte y semestre guardados en la URL', () => {
    expect(
      readFiltersFromParams(new URLSearchParams('cohorte=2023&semestre=1-2026')),
    ).toEqual({ cohort: '2023', semester: '1/2026' });
  });

  test('ignora valores inválidos en la URL', () => {
    expect(
      readFiltersFromParams(new URLSearchParams('cohorte=abc&semestre=3-2026')),
    ).toEqual({ cohort: '', semester: '' });
  });
});

describe('escritura de filtros en la URL', () => {
  test('guarda la cohorte y el semestre sin codificar la barra', () => {
    expect(buildFiltersQuery('', { cohort: '2023', semester: '2/2026' })).toBe(
      'cohorte=2023&semestre=2-2026',
    );
  });

  test('conserva otros parámetros de la URL y quita los filtros en «Todas»/«Todos»', () => {
    expect(
      buildFiltersQuery('tab=x&cohorte=2023&semestre=2-2026', {
        cohort: '',
        semester: '',
      }),
    ).toBe('tab=x');
  });
});

describe('useAccreditationFilters', () => {
  test('al elegir una cohorte actualiza la URL sin recargar ni desplazar', () => {
    const { result } = renderHook(() => useAccreditationFilters());
    act(() => result.current.setCohort('2023'));
    expect(mockReplace).toHaveBeenCalledWith(
      '/reports/acreditacion?cohorte=2023',
      { scroll: false },
    );
  });

  test('al elegir un semestre conserva la cohorte ya elegida', () => {
    mockQuery = 'cohorte=2023';
    const { result } = renderHook(() => useAccreditationFilters());
    act(() => result.current.setSemester('1/2026'));
    expect(mockReplace).toHaveBeenCalledWith(
      '/reports/acreditacion?cohorte=2023&semestre=1-2026',
      { scroll: false },
    );
  });

  test('CA-07: «Limpiar filtros» vuelve a «Todas» y «Todos»', () => {
    mockQuery = 'cohorte=2023&semestre=1-2026';
    const { result } = renderHook(() => useAccreditationFilters());
    expect(result.current.hasActiveFilters).toBe(true);
    act(() => result.current.clearFilters());
    expect(mockReplace).toHaveBeenCalledWith('/reports/acreditacion', {
      scroll: false,
    });
  });

  test('CA-05: indica cuándo hay un semestre elegido', () => {
    mockQuery = 'semestre=2-2026';
    const { result } = renderHook(() => useAccreditationFilters());
    expect(result.current.isSemesterActive).toBe(true);
    expect(result.current.filters).toEqual({ cohort: '', semester: '2/2026' });
  });
});