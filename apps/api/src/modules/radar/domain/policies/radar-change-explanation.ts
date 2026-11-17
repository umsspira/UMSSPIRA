import {
  AFFINITY_PERCENTAGE_DECIMALS,
  DICTIONARY_VERSION,
  MAX_POSSIBLE_SCORE,
} from './affinity-config';
import {
  type KeywordContribution,
  normalizeKeywordContributions,
} from './affinity-calculator';

export type RadarChangeCause = 'initial' | 'profile' | 'algorithm' | 'dictionary';

export type RadarVariationKind = 'initial' | 'increase' | 'decrease' | 'unchanged';

export interface KeywordContributionChange {
  keyword: string;
  previousPoints: number;
  currentPoints: number;
  deltaPoints: number;
  deltaPercentagePoints: number;
}

export interface AreaExplanationSnapshotInput {
  areaId: string;
  area?: string;
  porcentaje: number;
  palabrasClaveTop?: readonly KeywordContribution[];
  contribucionesKeyword?: readonly KeywordContribution[];
}

export interface CalculationExplanationSnapshotInput {
  versionAlgoritmo: string;
  versionDiccionario?: string | null;
  afinidad: readonly AreaExplanationSnapshotInput[];
}

export interface AreaChangeExplanation {
  areaId: string;
  area?: string;
  previousAffinity: number | null;
  affinity: number;
  deltaAffinity: number | null;
  cause: RadarChangeCause;
  variation: RadarVariationKind;
  isFirstCalculation: boolean;
  changes: KeywordContributionChange[];
}

function roundPercentagePoints(value: number): number {
  return Number(value.toFixed(AFFINITY_PERCENTAGE_DECIMALS));
}

function compareKeywords(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function getEffectiveContributions(
  area: AreaExplanationSnapshotInput | undefined,
): KeywordContribution[] {
  if (!area) {
    return [];
  }
  const source =
    area.contribucionesKeyword && area.contribucionesKeyword.length > 0
      ? area.contribucionesKeyword
      : (area.palabrasClaveTop ?? []);

  return normalizeKeywordContributions(source);
}

/**
 * Determina la causa del cambio entre dos instantáneas del cálculo (CA-HU13-04, CA-HU13-05).
 */
export function resolveRadarChangeCause(
  current: Pick<CalculationExplanationSnapshotInput, 'versionAlgoritmo' | 'versionDiccionario'>,
  previous: Pick<
    CalculationExplanationSnapshotInput,
    'versionAlgoritmo' | 'versionDiccionario'
  > | null,
): RadarChangeCause {
  if (!previous) {
    return 'initial';
  }

  if (previous.versionAlgoritmo.trim() !== current.versionAlgoritmo.trim()) {
    return 'algorithm';
  }

  const prevDict = previous.versionDiccionario?.trim() ?? null;
  const currDict = current.versionDiccionario?.trim() ?? null;

  if (prevDict !== null && currDict !== null && prevDict !== currDict) {
    return 'dictionary';
  }

  // Si el registro previo era anterior a M2 (null) pero la versión actual ya evolucionó
  // respecto a la versión inicial de M2, la diferencia proviene del diccionario.
  if (prevDict === null && currDict !== null && currDict !== DICTIONARY_VERSION) {
    return 'dictionary';
  }

  return 'profile';
}

/**
 * Clasifica la variación visible usando los porcentajes enteros mostrados (CA-HU13-03).
 */
export function resolveRadarVariationKind(
  currentAffinity: number,
  previousAffinity: number | null,
): RadarVariationKind {
  if (previousAffinity === null) {
    return 'initial';
  }

  const currentRounded = Math.round(currentAffinity);
  const previousRounded = Math.round(previousAffinity);

  if (currentRounded > previousRounded) {
    return 'increase';
  }
  if (currentRounded < previousRounded) {
    return 'decrease';
  }
  return 'unchanged';
}

/**
 * Compara las contribuciones completas de un área entre el cálculo anterior y el actual (CA-HU13-01, CA-HU13-02, CA-HU13-08).
 */
export function compareAreaKeywordContributions(
  currentContributions: readonly KeywordContribution[],
  previousContributions: readonly KeywordContribution[] | null,
): KeywordContributionChange[] {
  const normalizedCurrent = normalizeKeywordContributions(currentContributions);

  if (previousContributions === null) {
    return normalizedCurrent.map((item) => ({
      keyword: item.keyword,
      previousPoints: 0,
      currentPoints: item.points,
      deltaPoints: item.points,
      deltaPercentagePoints: roundPercentagePoints((item.points * 100) / MAX_POSSIBLE_SCORE),
    }));
  }

  const normalizedPrevious = normalizeKeywordContributions(previousContributions);
  const previousByKeyword = new Map<string, KeywordContribution>(
    normalizedPrevious.map((item) => [item.keyword.toLowerCase(), item]),
  );
  const currentByKeyword = new Map<string, KeywordContribution>(
    normalizedCurrent.map((item) => [item.keyword.toLowerCase(), item]),
  );

  const allKeys = new Set<string>([
    ...previousByKeyword.keys(),
    ...currentByKeyword.keys(),
  ]);

  const changes: KeywordContributionChange[] = [];

  for (const key of allKeys) {
    const prev = previousByKeyword.get(key);
    const curr = currentByKeyword.get(key);

    const previousPoints = prev?.points ?? 0;
    const currentPoints = curr?.points ?? 0;
    const deltaPoints = currentPoints - previousPoints;

    if (deltaPoints === 0) {
      continue;
    }

    changes.push({
      keyword: curr?.keyword ?? prev?.keyword ?? key,
      previousPoints,
      currentPoints,
      deltaPoints,
      deltaPercentagePoints: roundPercentagePoints((deltaPoints * 100) / MAX_POSSIBLE_SCORE),
    });
  }

  return changes.sort(
    (left, right) =>
      Math.abs(right.deltaPoints) - Math.abs(left.deltaPoints) ||
      right.currentPoints - left.currentPoints ||
      compareKeywords(left.keyword, right.keyword),
  );
}

/**
 * Política de dominio pura (T13.2): explica los cambios de todas las áreas entre el
 * cálculo anterior y el actual.
 */
export function explainRadarChanges(
  current: CalculationExplanationSnapshotInput,
  previous: CalculationExplanationSnapshotInput | null,
): AreaChangeExplanation[] {
  const cause = resolveRadarChangeCause(current, previous);
  const isFirstCalculation = previous === null;

  return current.afinidad.map((currentArea) => {
    const previousArea =
      previous?.afinidad.find((candidate) => candidate.areaId === currentArea.areaId) ??
      undefined;

    const previousAffinity = isFirstCalculation ? null : (previousArea?.porcentaje ?? 0);
    const affinity = currentArea.porcentaje;
    const deltaAffinity =
      previousAffinity === null ? null : roundPercentagePoints(affinity - previousAffinity);

    const currentContributions = getEffectiveContributions(currentArea);
    const previousContributions = isFirstCalculation
      ? null
      : getEffectiveContributions(previousArea);

    const changes = compareAreaKeywordContributions(
      currentContributions,
      previousContributions,
    );

    return {
      areaId: currentArea.areaId,
      ...(currentArea.area === undefined ? {} : { area: currentArea.area }),
      previousAffinity,
      affinity,
      deltaAffinity,
      cause,
      variation: resolveRadarVariationKind(affinity, previousAffinity),
      isFirstCalculation,
      changes,
    };
  });
}