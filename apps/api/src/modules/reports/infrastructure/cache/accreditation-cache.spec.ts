import { AccreditationCache } from './accreditation-cache';

let mockRedisClient: {
  status: string;
  connect: jest.Mock;
  on: jest.Mock;
  get: jest.Mock;
  set: jest.Mock;
  del: jest.Mock;
  scan: jest.Mock;
  disconnect: jest.Mock;
};

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn(() => mockRedisClient),
}));

describe('AccreditationCache', () => {
  let cache: AccreditationCache;

  beforeEach(() => {
    mockRedisClient = {
      status: 'wait',
      connect: jest.fn().mockImplementation(async () => {
        mockRedisClient.status = 'ready';
      }),
      on: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      scan: jest.fn(),
      disconnect: jest.fn(),
    };
    cache = new AccreditationCache({ get: () => 'redis://localhost:6379' } as never);
  });

  it('lee y guarda JSON con TTL de cinco minutos', async () => {
    mockRedisClient.get.mockResolvedValue(JSON.stringify({ total: 4 }));

    await expect(cache.get('dashboard-key')).resolves.toEqual({ total: 4 });
    await cache.set('dashboard-key', { total: 5 });

    expect(mockRedisClient.set).toHaveBeenCalledWith(
      'dashboard-key',
      JSON.stringify({ total: 5 }),
      'EX',
      300,
    );
    expect(mockRedisClient.connect).toHaveBeenCalledTimes(1);
  });

  it('mantiene claves diferentes por carrera y filtros normalizados', () => {
    const first = cache.buildAccreditationDashboardCacheKey(['career-1'], {
      cohort: 2023,
      semester: ' 2/2026 ',
    });

    expect(first).toBe(
      'acreditacion:indicadores:carrera:career-1:filtros:{"cohort":2023,"semester":"2/2026"}',
    );
    expect(cache.buildAccreditationDashboardCacheKey(['career-2'], { cohort: 2023 })).not.toBe(
      first,
    );
    expect(cache.buildAccreditationDashboardCacheKey(['career-1'], { cohort: 2022 })).not.toBe(
      first,
    );
  });

  it('continúa el SCAN aunque una página intermedia no contenga claves', async () => {
    mockRedisClient.status = 'ready';
    mockRedisClient.scan
      .mockResolvedValueOnce(['5', []])
      .mockResolvedValueOnce(['8', ['matching-key-1']])
      .mockResolvedValueOnce(['0', ['matching-key-2']]);
    mockRedisClient.del.mockResolvedValue(1);

    await expect(cache.deleteByPrefix('acreditacion:')).resolves.toBe(2);

    expect(mockRedisClient.scan).toHaveBeenNthCalledWith(
      1,
      '0',
      'MATCH',
      'acreditacion:*',
      'COUNT',
      100,
    );
    expect(mockRedisClient.scan).toHaveBeenNthCalledWith(
      2,
      '5',
      'MATCH',
      'acreditacion:*',
      'COUNT',
      100,
    );
    expect(mockRedisClient.scan).toHaveBeenNthCalledWith(
      3,
      '8',
      'MATCH',
      'acreditacion:*',
      'COUNT',
      100,
    );
    expect(mockRedisClient.del).toHaveBeenNthCalledWith(1, 'matching-key-1');
    expect(mockRedisClient.del).toHaveBeenNthCalledWith(2, 'matching-key-2');
  });

  it('invalida con el prefijo de la carrera y cierra su conexión al destruirse', async () => {
    mockRedisClient.status = 'ready';
    mockRedisClient.scan.mockResolvedValue(['0', []]);

    await cache.invalidateAccreditationDashboardCache('career-1');
    cache.onModuleDestroy();

    expect(mockRedisClient.scan).toHaveBeenCalledWith(
      '0',
      'MATCH',
      'acreditacion:indicadores:carrera:career-1:*',
      'COUNT',
      100,
    );
    expect(mockRedisClient.disconnect).toHaveBeenCalledTimes(1);
  });
});
