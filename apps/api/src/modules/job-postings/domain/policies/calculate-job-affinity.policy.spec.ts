import { calculateJobAffinity } from './calculate-job-affinity.policy';

describe('calculateJobAffinity', () => {
  const radar = [
    { areaId: 'frontend', percentage: 80 },
    { areaId: 'backend', percentage: 60 },
  ];

  it('returns the average affinity for all required areas', () => {
    expect(calculateJobAffinity(['frontend', 'backend'], radar)).toBe(70);
  });

  it('counts unmatched required areas as zero', () => {
    expect(calculateJobAffinity(['frontend', 'missing'], radar)).toBe(40);
  });

  it('deduplicates repeated required areas before calculating', () => {
    expect(calculateJobAffinity(['frontend', 'frontend', 'backend'], radar)).toBe(70);
  });

  it('returns zero for a calculated profile without matching areas', () => {
    expect(calculateJobAffinity(['unmatched'], radar)).toBe(0);
  });

  it('returns null when the profile has no radar calculation', () => {
    expect(calculateJobAffinity(['frontend'], null)).toBeNull();
  });

  it('returns null when the vacancy has no valid required areas', () => {
    expect(calculateJobAffinity([null, undefined, ''], radar)).toBeNull();
  });

  it('clamps out-of-range values and rounds the average to two decimals', () => {
    expect(calculateJobAffinity(['one', 'two'], [
      { areaId: 'one', percentage: 120 },
      { areaId: 'two', percentage: 33.333 },
    ])).toBe(66.67);
  });
});
