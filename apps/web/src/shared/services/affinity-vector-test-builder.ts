import {
  AFFINITY_AREAS,
  type AffinityArea,
  type AffinityAreaScore,
  type AffinityKeywordContribution,
  type AffinityVectorResponse,
} from '@umsspira/shared-types/src/affinity';

export interface AffinityAreaOverride {
  affinity?: number;
  previousAffinity?: number | null;
  weighting?: number | null;
  topKeywords?: AffinityKeywordContribution[];
}

export interface AffinityVectorOverrides {
  graduateId?: string;
  calculatedAt?: string;
  hasLaborHistory?: boolean;
  status?: 'ok' | 'empty';
  algorithmVersion?: string;
  hasPendingChanges?: boolean;
  recalculated?: boolean;
  processingMs?: number;
  unmappedKeywords?: string[];
  areas?: AffinityAreaScore[];
  areaOverrides?: Partial<Record<AffinityArea, AffinityAreaOverride>>;
}

const DEFAULT_KEYWORDS: Record<AffinityArea, AffinityKeywordContribution> = {
  'software-development': { keyword: 'typescript', weight: 5, frequency: 2, points: 10, percentage: 25 },
  'cloud-devops': { keyword: 'aws', weight: 4, frequency: 1, points: 4, percentage: 10 },
  'data-ai': { keyword: 'python', weight: 3, frequency: 1, points: 3, percentage: 7.5 },
  'quality-assurance': { keyword: 'jest', weight: 3, frequency: 1, points: 3, percentage: 7.5 },
  'cybersecurity-networks': { keyword: 'firewalls', weight: 2, frequency: 1, points: 2, percentage: 5 },
  'it-management': { keyword: 'scrum', weight: 4, frequency: 1, points: 4, percentage: 10 },
};

export function buildAffinityVectorResponse(
  overrides: AffinityVectorOverrides = {},
): AffinityVectorResponse {
  const { areaOverrides = {}, ...vectorOverrides } = overrides;
  const areas = overrides.areas ?? AFFINITY_AREAS.map((area) => ({
    area,
    affinity: 50,
    previousAffinity: null,
    weighting: 5,
    topKeywords: [DEFAULT_KEYWORDS[area]],
    ...areaOverrides[area],
  }));

  return {
    graduateId: 'graduate-test',
    calculatedAt: '2026-11-11T12:00:00.000Z',
    hasLaborHistory: true,
    status: 'ok',
    algorithmVersion: '1.0.0/test',
    hasPendingChanges: false,
    processingMs: 0,
    unmappedKeywords: [],
    ...vectorOverrides,
    areas,
  };
}
