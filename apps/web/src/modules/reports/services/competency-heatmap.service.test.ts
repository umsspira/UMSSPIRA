import { authenticatedFetch, SessionError } from '@/shared/services/auth-session';
import { assertHeatmapData, createHeatmapHttpLoader } from './competency-heatmap.service';
import { heatmapMockupFixture } from '../components/competency-heatmap/__fixtures__/competency-heatmap.fixture';

jest.mock('@/shared/services/auth-session', () => {
  const actual = jest.requireActual('@/shared/services/auth-session');
  return { ...actual, authenticatedFetch: jest.fn() };
});

const http = jest.mocked(authenticatedFetch);
const path = '/api/v1/solo-ejemplo-no-produccion' as const;
const adapter = (payload: unknown) => (payload as { data: ReturnType<typeof heatmapMockupFixture> }).data;

describe('Integración futura de T2.1: servicio aislado', () => {
  beforeEach(() => jest.clearAllMocks());

  it('consulta el endpoint suministrado sin caché y pasa AbortSignal', async () => {
    const fixture = heatmapMockupFixture();
    http.mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: fixture }) } as Response);
    const signal = new AbortController().signal;
    const load = createHeatmapHttpLoader({ endpoint: path, adapt: adapter });
    await expect(load(signal)).resolves.toEqual(fixture);
    expect(http).toHaveBeenCalledWith(path, { method: 'GET', cache: 'no-store', signal });
  });

  it('rechaza datos incompletos e impide divulgar una muestra pequeña en HTTP', () => {
    const fixture = heatmapMockupFixture();
    fixture.cohorts[0].areas['software-development'] = { status: 'calculated', percentage: 88, graduateCount: 3 };
    expect(() => assertHeatmapData(fixture)).toThrow(/menos de cinco/);
  });

  it('rechaza estado insuficiente que contiene porcentaje oculto', () => {
    const fixture = heatmapMockupFixture();
    fixture.cohorts[0].areas['software-development'] = {
      status: 'insufficient', percentage: 70, graduateCount: 3,
    } as unknown as typeof fixture.cohorts[number]['areas']['software-development'];
    expect(() => assertHeatmapData(fixture)).toThrow(/no puede exponer/);
  });

  it('reconoce un HTTP 401 y conserva la clase SessionError', async () => {
    http.mockResolvedValue({ status: 401, ok: false } as Response);
    const load = createHeatmapHttpLoader({ endpoint: path, adapt: adapter });
    await expect(load(new AbortController().signal)).rejects.toBeInstanceOf(SessionError);
  });
});
