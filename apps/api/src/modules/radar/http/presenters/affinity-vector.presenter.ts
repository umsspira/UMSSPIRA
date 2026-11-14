import {
  AFFINITY_AREAS,
  RADAR_AREA_IDS,
  type AffinityArea,
  type AffinityAreaExplanation,
  type AffinityAreaScore,
  type AffinityKeywordContribution,
  type AffinityVectorResponse,
} from '@umsspira/shared-types';
import {
  normalizeTopKeywords,
  type KeywordContribution,
} from '../../domain/policies/affinity-calculator';
import { AFFINITY_PERCENTAGE_DECIMALS } from '../../domain/policies/affinity-config';
import type { RadarAreaVector, RadarVector } from '../../application/contracts/radar-vector';

export interface PresentAffinityVectorOptions {
  includeRecalculated?: boolean;
}

const AREA_ID_BY_SLUG = new Map<AffinityArea, string>(
  AFFINITY_AREAS.map((area) => [area, RADAR_AREA_IDS[area]]),
);

function roundPercentage(value: number): number {
  return Number(value.toFixed(AFFINITY_PERCENTAGE_DECIMALS));
}

function toPercentage(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }

  return roundPercentage(Math.min(100, Math.max(0, value)));
}

function toPreviousPercentage(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return roundPercentage(Math.min(100, Math.max(0, value)));
}

function toWeighting(value: unknown, keywords: readonly KeywordContribution[]): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5) {
    return value;
  }

  if (keywords.length === 0) {
    return null;
  }

  return Math.max(...keywords.map(({ weight }) => weight));
}

function toExplanation(
  explanation: unknown,
): AffinityAreaExplanation | null | undefined {
  if (explanation === undefined) {
    return undefined;
  }
  if (!explanation || typeof explanation !== 'object') {
    return null;
  }

  const candidate = explanation as Partial<AffinityAreaExplanation>;
  if (
    candidate.cause !== 'profile' &&
    candidate.cause !== 'algorithm' &&
    candidate.cause !== 'dictionary'
  ) {
    return null;
  }

  if (!Array.isArray(candidate.changes)) {
    return null;
  }
  const changes = [];
  for (const change of candidate.changes) {
    if (
      !change ||
      typeof change.keyword !== 'string' ||
      change.keyword.trim().length === 0 ||
      !Number.isFinite(change.previousPoints) ||
      !Number.isFinite(change.currentPoints) ||
      !Number.isFinite(change.deltaPercentagePoints)
    ) {
      return null;
    }
    changes.push({
      keyword: change.keyword,
      previousPoints: change.previousPoints,
      currentPoints: change.currentPoints,
      deltaPercentagePoints: roundPercentage(change.deltaPercentagePoints),
    });
  }

  return {
    cause: candidate.cause,
    changes,
  };
}

function buildArea(
  area: AffinityArea,
  vectorArea: RadarAreaVector | undefined,
): AffinityAreaScore {
  const topKeywords = normalizeTopKeywords(vectorArea?.topKeywords);

  const areaScore: AffinityAreaScore = {
    area,
    affinity: toPercentage(vectorArea?.affinity),
    previousAffinity: toPreviousPercentage(vectorArea?.previousAffinity),
    weighting: toWeighting(vectorArea?.weighting, topKeywords),
    topKeywords: topKeywords.map(
      ({ keyword, weight, frequency, points, percentage }): AffinityKeywordContribution => ({
        keyword,
        weight,
        frequency,
        points,
        percentage,
      }),
    ),
  };

  const explanation = toExplanation(vectorArea?.explanation);
  if (explanation !== undefined) {
    areaScore.explanation = explanation;
  }

  return areaScore;
}

/**
 * Convierte el resultado interno en el contrato HTTP.
 *
 * Garantiza siempre las seis áreas en el orden fijo de AFFINITY_AREAS, con
 * `topKeywords` como arreglo (nunca undefined) y `previousAffinity` numérico o null.
 * Si una fila histórica no tiene un área, se completa en cero para no romper el contrato.
 */
export function presentAffinityVector(
  vector: RadarVector,
  options: PresentAffinityVectorOptions = {},
): AffinityVectorResponse {
  const areasById = new Map(vector.areas.map((area) => [area.areaId, area]));
  const response: AffinityVectorResponse = {
    graduateId: vector.graduateId,
    hasLaborHistory: vector.hasLaborHistory,
    calculatedAt: vector.calculatedAt.toISOString(),
    status: vector.status,
    algorithmVersion: vector.algorithmVersion,
    ...(vector.dictionaryVersion !== undefined
      ? { dictionaryVersion: vector.dictionaryVersion }
      : {}),
    hasPendingChanges: vector.hasPendingChanges,
    processingMs:
      Number.isFinite(vector.processingMs) && vector.processingMs > 0
        ? Math.round(vector.processingMs)
        : 0,
    areas: AFFINITY_AREAS.map((area) =>
      buildArea(area, areasById.get(AREA_ID_BY_SLUG.get(area) ?? '')),
    ),
    unmappedKeywords: [
      ...new Set(
        vector.unmappedKeywords.filter(
          (keyword): keyword is string => typeof keyword === 'string' && keyword.length > 0,
        ),
      ),
    ],
  };

  if (options.includeRecalculated) {
    response.recalculated = vector.recalculated ?? false;
  }

  return response;
}
