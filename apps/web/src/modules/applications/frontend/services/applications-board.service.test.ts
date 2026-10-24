import { fetchApplicationsBoard, fetchApplicationsMetrics, fetchApplicationDetail, fetchDocumentUrl } from './applications-board.service';
import { clearAccessToken, setAccessToken } from '@/shared/services/auth-session';

describe('applications-board.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setAccessToken('admin-token');
  });
  afterEach(() => clearAccessToken());

  it('envía periodos y consulta métricas con autenticación', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: {} }) });
    await fetchApplicationsBoard({ page: 1, pageSize: 15, period: 'custom', from: '2026-10-01', to: '2026-10-24', year: 2025 });
    const params = new URL((global.fetch as jest.Mock).mock.calls[0][0], 'http://localhost').searchParams;
    expect(params.get('period')).toBe('custom');
    expect(params.get('from')).toBe('2026-10-01');
    expect(params.get('to')).toBe('2026-10-24');
    expect(params.has('year')).toBe(false);
    await fetchApplicationsMetrics();
    expect(global.fetch).toHaveBeenLastCalledWith('/api/v1/applications/metrics', expect.objectContaining({ headers: { Authorization: 'Bearer admin-token' } }));
  });

  it('pide la bandeja con paginación y filtros (CA-04.1 y CA-04.2)', async () => {
    const page = { items: [], total: 0, page: 1, pageSize: 15 };
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: page }) });

    const result = await fetchApplicationsBoard({ page: 2, pageSize: 15, career: 'Sistemas', status: 'PENDIENTE', search: '20180' });

    expect(result).toEqual({ ok: true, data: page });
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/api/v1/applications?');
    expect(url).toContain('page=2');
    expect(url).toContain('career=Sistemas');
    expect(url).toContain('status=PENDIENTE');
    expect(url).toContain('search=20180');
  });

  it('marca needsLogin cuando falta la sesión de administrador', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });

    const result = await fetchApplicationsBoard({ page: 1, pageSize: 15 });

    expect(result).toEqual(expect.objectContaining({ ok: false, needsLogin: true }));
  });

  it('trae el expediente y la URL privada del documento (CA-04.3)', async () => {
    const detail = { id: 's-1', fullName: 'Ana Rojas' };
    const signed = { url: '/api/v1/applications/s-1/document/content', requiresAuthentication: true };
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: detail }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: signed }) });

    await expect(fetchApplicationDetail('s-1')).resolves.toEqual({ ok: true, data: detail });
    await expect(fetchDocumentUrl('s-1')).resolves.toEqual({ ok: true, data: signed });
    const [detailUrl] = (global.fetch as jest.Mock).mock.calls[0];
    const [docUrl] = (global.fetch as jest.Mock).mock.calls[1];
    expect(detailUrl).toContain('/api/v1/applications/s-1');
    expect(docUrl).toContain('/api/v1/applications/s-1/document');
  });
});
