import { fetchMiniAffinity, SAMPLE_VALUES } from './mini-affinity-source';

describe('fetchMiniAffinity provisional (HU-17)', () => {
  it('devuelve los 6 valores de ejemplo con status "ok"', async () => {
    await expect(fetchMiniAffinity()).resolves.toEqual({ status: 'ok', values: SAMPLE_VALUES });
    expect(SAMPLE_VALUES).toHaveLength(6);
  });
});