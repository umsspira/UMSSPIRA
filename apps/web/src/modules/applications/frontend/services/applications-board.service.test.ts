import {
  fetchApplicationsBoard,
  fetchApplicationsMetrics,
  fetchApplicationDetail,
  fetchApplicationHistory,
  fetchDocumentUrl,
  fetchFindingChecks,
  saveFindingCheck,
  type HumanFindingCheck,
} from './applications-board.service';
import { clearAccessToken, setAccessToken } from '@/shared/services/auth-session';

describe('applications-board.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setAccessToken('admin-token');
  });
  afterEach(() => clearAccessToken());

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

  it('envía el periodo personalizado y la gestión del semestre al backend', async () => {
    const page = { items: [], total: 0, page: 1, pageSize: 15 };
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: page }) });

    await fetchApplicationsBoard({
      page: 1,
      pageSize: 15,
      period: 'custom',
      from: '2026-10-01',
      to: '2026-10-24',
    });
    await fetchApplicationsBoard({
      page: 1,
      pageSize: 15,
      period: 'semester2',
      year: 2026,
    });

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('period=custom'),
      expect.anything(),
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('period=semester2'),
      expect.anything(),
    );
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('from=2026-10-01');
    expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('to=2026-10-24');
    expect((global.fetch as jest.Mock).mock.calls[1][0]).toContain('year=2026');
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

  it('consulta los indicadores mediante el endpoint administrativo', async () => {
    const metrics = {
      receivedToday: 3,
      pending: 12,
      urgent: 2,
      resolvedToday: 4,
      generatedAt: '2026-10-24T12:00:00.000Z',
      timeZone: 'America/La_Paz',
    };
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: metrics }) });

    await expect(fetchApplicationsMetrics()).resolves.toEqual({ ok: true, data: metrics });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/applications/metrics',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer admin-token' }),
      }),
    );
  });

  it('conserva el objeto de historial del contrato API, incluidos los eventos anidados', async () => {
    const history = {
      applicationId: 's-1',
      currentVersion: 2,
      ocr: { latestAnalysis: null, latestResult: null },
      eventCount: 1,
      events: [
        {
          id: 'event-1',
          version: 2,
          action: 'ENVIO',
          title: 'Solicitud corregida y reenviada',
          description: 'Corrección reenviada para revisión.',
          actor: { type: 'TITULADO', id: 'user-1' },
          occurredAt: '2026-11-15T12:00:00.000Z',
        },
      ],
    };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: history }),
    });

    await expect(fetchApplicationHistory('s-1')).resolves.toEqual({
      ok: true,
      data: history,
    });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/applications/s-1/history',
      expect.anything(),
    );
  });

  describe('comprobación humana de hallazgos (CA-14.3 y CA-14.7)', () => {
    it('obtiene las comprobaciones humanas registradas desde la API', async () => {
      const checks: HumanFindingCheck[] = [
        {
          field: 'career',
          action: 'CONFIRMADO',
          author: 'admin@umss.edu',
          checkedAt: '2026-11-17T20:00:00.000Z',
          version: 1,
        },
      ];
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: checks }),
      });

      const result = await fetchFindingChecks('app-1');
      expect(result).toEqual({ ok: true, data: checks });
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/v1/applications/app-1/findings-checks',
        expect.anything(),
      );
    });

    it('guarda una comprobación y sincroniza con el almacenamiento local', async () => {
      const check: HumanFindingCheck = {
        field: 'career',
        action: 'CORREGIDO',
        verifiedValue: 'Ingeniería de Sistemas',
        author: 'revisor@umss.edu',
        checkedAt: '2026-11-17T21:00:00.000Z',
        version: 1,
      };
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: check }),
      });

      const result = await saveFindingCheck(
        'app-1',
        {
          field: 'career',
          action: 'CORREGIDO',
          verifiedValue: 'Ingeniería de Sistemas',
          author: 'revisor@umss.edu',
        },
        1,
      );

      expect(result).toEqual({ ok: true, data: check });
    });

    it('exige actualizar si la versión de la solicitud cambió (CA-14.7)', async () => {
      const result = await saveFindingCheck(
        'app-1',
        {
          field: 'career',
          action: 'CONFIRMADO',
          expectedVersion: 1,
        },
        2, // versión actual avanzada a 2
      );

      expect(result).toEqual({
        ok: false,
        status: 409,
        needsLogin: false,
        message: 'La solicitud cambió; actualiza el expediente.',
      });
    });

    it('maneja el código 409 del servidor y devuelve vista desactualizada', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ error: 'VERSION_CONFLICT' }),
      });

      const result = await saveFindingCheck(
        'app-1',
        {
          field: 'graduationYear',
          action: 'NO_VERIFICABLE',
          reason: 'Documento borroso en el año',
          expectedVersion: 1,
        },
        1,
      );

      expect(result).toEqual({
        ok: false,
        status: 409,
        needsLogin: false,
        message: 'La solicitud cambió; actualiza el expediente.',
      });
    });

    it('usa el almacenamiento local si el endpoint devuelve 404', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ message: 'Not found' }),
      });

      const result = await saveFindingCheck(
        'app-local',
        {
          field: 'ci',
          action: 'CONFIRMADO',
          author: 'localAdmin',
          expectedVersion: 1,
        },
        1,
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.field).toBe('ci');
        expect(result.data.action).toBe('CONFIRMADO');
        expect(result.data.author).toBe('localAdmin');
        expect(result.data.version).toBe(1);
      }

      // Al consultar, debe devolver el registro guardado localmente
      const fetched = await fetchFindingChecks('app-local');
      expect(fetched.ok).toBe(true);
      if (fetched.ok) {
        expect(fetched.data.some((c) => c.field === 'ci')).toBe(true);
      }
    });
  });
});
