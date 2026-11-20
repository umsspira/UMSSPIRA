import { act, renderHook, waitFor } from '@testing-library/react';
import { getCurrentUser } from '@/modules/auth/frontend/services/auth.service';
import {
  filtersStorageKey,
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

jest.mock('@/modules/auth/frontend/services/auth.service', () => ({
  getCurrentUser: jest.fn(),
}));

const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;
const ADMIN_A = 'admin-a';
const ADMIN_B = 'admin-b';

function loggedAs(id: string) {
  mockGetCurrentUser.mockResolvedValue({ id } as Awaited<ReturnType<typeof getCurrentUser>>);
}

beforeEach(() => {
  mockReplace.mockClear();
  mockQuery = '';
  window.sessionStorage.clear();
  loggedAs(ADMIN_A);
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
  // Estas pruebas solo revisan la URL: el usuario no llega a cargarse.
  beforeEach(() => {
    mockGetCurrentUser.mockReturnValue(new Promise(() => {}));
  });

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

describe('filtros al navegar entre secciones', () => {
  test('al volver al tablero sin filtros en la URL, recupera los últimos del mismo usuario', async () => {
    window.sessionStorage.setItem(filtersStorageKey(ADMIN_A), 'cohorte=2021&semestre=2-2025');
    renderHook(() => useAccreditationFilters());
    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(
        '/reports/acreditacion?cohorte=2021&semestre=2-2025',
        { scroll: false },
      ),
    );
  });

  test('otro usuario en la misma pestaña no recupera los filtros guardados', async () => {
    window.sessionStorage.setItem(filtersStorageKey(ADMIN_A), 'cohorte=2021&semestre=2-2025');
    loggedAs(ADMIN_B);
    renderHook(() => useAccreditationFilters());
    await waitFor(() => expect(mockGetCurrentUser).toHaveBeenCalled());
    await act(async () => {});
    expect(mockReplace).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(filtersStorageKey(ADMIN_A))).toBe(
      'cohorte=2021&semestre=2-2025',
    );
  });

  test('si la URL ya trae filtros, no los cambia por los guardados y guarda los de la URL', async () => {
    window.sessionStorage.setItem(filtersStorageKey(ADMIN_A), 'cohorte=2021');
    mockQuery = 'cohorte=2023';
    renderHook(() => useAccreditationFilters());
    await waitFor(() =>
      expect(window.sessionStorage.getItem(filtersStorageKey(ADMIN_A))).toBe('cohorte=2023'),
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('sin filtros elegidos no queda nada guardado', async () => {
    window.sessionStorage.setItem(filtersStorageKey(ADMIN_A), 'cohorte=abc');
    renderHook(() => useAccreditationFilters());
    await waitFor(() =>
      expect(window.sessionStorage.getItem(filtersStorageKey(ADMIN_A))).toBeNull(),
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('sin usuario identificado no guarda ni recupera filtros', async () => {
    mockGetCurrentUser.mockRejectedValue(new Error('sin sesión'));
    mockQuery = 'cohorte=2023';
    renderHook(() => useAccreditationFilters());
    await act(async () => {});
    expect(window.sessionStorage.length).toBe(0);
  });
});