import type { AffinityAreaExplanation } from '@umsspira/shared-types';

const explanationFixture: AffinityAreaExplanation = {
  cause: 'profile',
  changes: [
    {
      keyword: 'AWS',
      previousPoints: 0,
      currentPoints: 10,
      deltaPercentagePoints: 25,
    },
    {
      keyword: 'Solutions Architect',
      previousPoints: 0,
      currentPoints: 4,
      deltaPercentagePoints: 10,
    },
  ],
};

const originalFetch = global.fetch;

describe('affinity-service · explicación del radar', () => {
  const originalEnv = process.env;

  beforeEach(async () => {
    jest.resetModules();
    process.env = { ...originalEnv, NEXT_PUBLIC_USE_AFFINITY_MOCK: 'false' };
    const authSession = await import('@/shared/services/auth-session');
    authSession.setAccessToken('test-token');
  });

  afterEach(async () => {
    process.env = originalEnv;
    const authSession = await import('@/shared/services/auth-session');
    authSession.clearAccessToken();
    global.fetch = originalFetch;
  });

  it('conserva la explicación y la versión del diccionario devueltas por la API', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          graduateId: 'graduate-test',
          calculatedAt: '2026-11-14T12:00:00.000Z',
          status: 'ok',
          algorithmVersion: '1.0.0/test',
          dictionaryVersion: '2026-11-14',
          hasPendingChanges: false,
          areas: [
            {
              area: 'cloud-devops',
              affinity: 35,
              previousAffinity: 0,
              weighting: 5,
              topKeywords: [
                {
                  keyword: 'AWS',
                  weight: 5,
                  frequency: 2,
                  points: 10,
                  percentage: 25,
                },
              ],
              explanation: explanationFixture,
            },
          ],
        },
      }),
    });

    const { getAffinityVector } = await import('./affinity-service');
    const result = await getAffinityVector();

    expect(result.dictionaryVersion).toBe('2026-11-14');
    expect(result.areas[0].explanation).toEqual(
      explanationFixture,
    );
  });
});
