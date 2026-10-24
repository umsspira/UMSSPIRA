import type { BoardStatus, PeriodFilters } from './applications-board.service';

export const PAGE_SIZE_OPTIONS = [10, 15, 25, 50] as const;
export const DEFAULT_PAGE_SIZE = 15;

const STATUS_VALUES: readonly BoardStatus[] = ['PENDIENTE', 'OBSERVADA', 'APROBADA', 'RECHAZADA'];
export interface ApplicationsUrlState extends PeriodFilters {
  page: number;
  pageSize: number;
  search: string;
  career: string;
  status: '' | BoardStatus;
}

export const EMPTY_URL_STATE: ApplicationsUrlState = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  search: '',
  career: '',
  status: '',
};

type ParamsReader = { get(name: string): string | null };

function readPeriod(params: ParamsReader): PeriodFilters {
  const period = params.get('period');
  if (period === 'last15' || period === 'last30') return { period };
  if (period === 'semester1' || period === 'semester2') {
    const year = Number(params.get('year'));
    return {
      period,
      ...(Number.isInteger(year) && year >= 2000 && year <= 2100 ? { year } : {}),
    };
  }
  if (period !== 'custom') return {};
  const validDate = (value: string | null) => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : undefined;
  };
  const from = validDate(params.get('from'));
  const to = validDate(params.get('to'));
  if ((!from && !to) || (from && to && from > to)) return {};
  return { period, ...(from ? { from } : {}), ...(to ? { to } : {}) };
}

function toPositiveInt(value: string | null, fallback: number): number {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 ? number : fallback;
}

export function parseApplicationsUrl(params: ParamsReader): ApplicationsUrlState {
  const size = toPositiveInt(params.get('size'), DEFAULT_PAGE_SIZE);
  const status = params.get('status') ?? '';

  return {
    page: toPositiveInt(params.get('page'), 1),
    pageSize: (PAGE_SIZE_OPTIONS as readonly number[]).includes(size) ? size : DEFAULT_PAGE_SIZE,
    search: (params.get('q') ?? '').trim(),
    career: params.get('career') ?? '',
    status: (STATUS_VALUES as readonly string[]).includes(status) ? (status as BoardStatus) : '',
    ...readPeriod(params),
  };
}

export function toApplicationsParams(state: ApplicationsUrlState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.page > 1) params.set('page', String(state.page));
  if (state.pageSize !== DEFAULT_PAGE_SIZE) params.set('size', String(state.pageSize));
  if (state.search) params.set('q', state.search);
  if (state.career) params.set('career', state.career);
  if (state.status) params.set('status', state.status);
  if (state.period) params.set('period', state.period);
  if ((state.period === 'semester1' || state.period === 'semester2') && state.year !== undefined) {
    params.set('year', String(state.year));
  }
  if (state.period === 'custom') {
    if (state.from) params.set('from', state.from);
    if (state.to) params.set('to', state.to);
  }
  return params;
}

export function changePageSize(state: ApplicationsUrlState, pageSize: number): ApplicationsUrlState {
  return { ...state, pageSize, page: 1 };
}

export function changeFilters(
  state: ApplicationsUrlState,
  patch: Partial<Pick<ApplicationsUrlState, 'search' | 'career' | 'status' | 'period' | 'year' | 'from' | 'to'>>,
): ApplicationsUrlState {
  return { ...state, ...patch, page: 1 };
}

export function changePage(state: ApplicationsUrlState, page: number): ApplicationsUrlState {
  return { ...state, page: Math.max(1, page) };
}

export function totalPagesFor(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function clampPage(state: ApplicationsUrlState, total: number): ApplicationsUrlState {
  const lastPage = totalPagesFor(total, state.pageSize);
  return state.page > lastPage ? { ...state, page: lastPage } : state;
}
