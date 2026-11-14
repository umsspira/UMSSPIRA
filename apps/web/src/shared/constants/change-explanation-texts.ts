import type { AffinityChangeCause } from '@umsspira/shared-types';
import { clampPercentage } from '../utils/percentage';

export type ChangeExplanationVariant =
  | 'increase'
  | 'decrease'
  | 'no-visible-change'
  | 'first-calculation'
  | 'system-update';

export interface ChangeExplanationContributionInput {
  keyword: string;
  percentagePoints: number;
}

export interface ChangeExplanationContribution {
  keyword: string;
  points: string;
}

export interface ChangeExplanationCopy {
  variant: ChangeExplanationVariant;
  summary: string;
  contributionIntro: string | null;
  contributions: ChangeExplanationContribution[];
}

export interface ChangeExplanationInput {
  areaLabel: string;
  previousAffinity: number | null;
  affinity: number;
  cause?: AffinityChangeCause | null;
  changes?: ChangeExplanationContributionInput[];
  currentContributions?: ChangeExplanationContributionInput[];
}

const SYSTEM_CAUSE_LABELS: Record<'algorithm' | 'dictionary', string> = {
  algorithm: 'una actualización del algoritmo de cálculo',
  dictionary: 'una actualización del diccionario de palabras clave',
};

function formatDecimal(value: number): string {
  return value
    .toFixed(2)
    .replace(/0+$/, '')
    .replace(/\.$/, '')
    .replace('.', ',');
}

function getPointsUnit(value: number): string {
  return value === 1 ? 'punto porcentual' : 'puntos porcentuales';
}

export function formatSignedPercentagePoints(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  const absolute = Math.abs(rounded);

  if (absolute === 0) {
    return `0 ${getPointsUnit(0)}`;
  }

  const sign = rounded > 0 ? '+' : '\u2212';
  return `${sign}${formatDecimal(absolute)} ${getPointsUnit(absolute)}`;
}

export function formatPercentagePoints(value: number): string {
  const absolute = Math.abs(Math.round(value * 100) / 100);
  return `${formatDecimal(absolute)} ${getPointsUnit(absolute)}`;
}

function formatAffinityPercentage(value: number): string {
  return `${clampPercentage(value)} %`;
}

function toContributions(
  changes: ChangeExplanationContributionInput[],
  mode: 'signed' | 'current' | 'negative',
): ChangeExplanationContribution[] {
  return changes
    .filter((change) => {
      if (mode === 'negative') {
        return change.percentagePoints < 0;
      }
      return change.percentagePoints !== 0;
    })
    .map((change) => ({
      keyword: change.keyword,
      points:
        mode === 'current'
          ? formatPercentagePoints(change.percentagePoints)
          : formatSignedPercentagePoints(change.percentagePoints),
    }));
}

export function getIncreaseExplanation(
  input: ChangeExplanationInput,
): ChangeExplanationCopy {
  const contributions = toContributions(input.changes ?? [], 'signed');

  return {
    variant: 'increase',
    summary: `${input.areaLabel} aumentó de ${formatAffinityPercentage(
      input.previousAffinity ?? 0,
    )} a ${formatAffinityPercentage(input.affinity)}.`,
    contributionIntro:
      contributions.length > 0 ? 'En el cálculo actual:' : null,
    contributions,
  };
}

export function getDecreaseExplanation(
  input: ChangeExplanationInput,
): ChangeExplanationCopy {
  const contributions = toContributions(input.changes ?? [], 'negative');

  return {
    variant: 'decrease',
    summary: `${input.areaLabel} disminuyó de ${formatAffinityPercentage(
      input.previousAffinity ?? 0,
    )} a ${formatAffinityPercentage(input.affinity)}.`,
    contributionIntro:
      contributions.length > 0 ? 'Los aportes que bajaron son:' : null,
    contributions,
  };
}

export function getNoVisibleVariationExplanation(
  input: ChangeExplanationInput,
): ChangeExplanationCopy {
  return {
    variant: 'no-visible-change',
    summary: `${input.areaLabel} se mantiene en ${formatAffinityPercentage(
      input.affinity,
    )}. No hay una variación visible respecto del cálculo anterior.`,
    contributionIntro: null,
    contributions: [],
  };
}

export function getFirstCalculationExplanation(
  input: ChangeExplanationInput,
): ChangeExplanationCopy {
  const contributions = toContributions(
    input.currentContributions ?? [],
    'current',
  );

  return {
    variant: 'first-calculation',
    summary: `Primer cálculo de ${input.areaLabel}: ${formatAffinityPercentage(
      input.affinity,
    )}.`,
    contributionIntro:
      contributions.length > 0 ? 'Aportes actuales:' : null,
    contributions,
  };
}

export function getSystemUpdateExplanation(
  input: ChangeExplanationInput,
): ChangeExplanationCopy {
  const cause = input.cause === 'dictionary' ? 'dictionary' : 'algorithm';
  const contributions = toContributions(input.changes ?? [], 'signed');

  return {
    variant: 'system-update',
    summary: `La afinidad de ${input.areaLabel} cambió de ${formatAffinityPercentage(
      input.previousAffinity ?? 0,
    )} a ${formatAffinityPercentage(input.affinity)} por ${
      SYSTEM_CAUSE_LABELS[cause]
    }.`,
    contributionIntro:
      contributions.length > 0 ? 'En el cálculo actual:' : null,
    contributions,
  };
}

export function getChangeExplanation(
  input: ChangeExplanationInput,
): ChangeExplanationCopy {
  const previousAffinity = input.previousAffinity;

  if (previousAffinity === null || previousAffinity === undefined) {
    return getFirstCalculationExplanation(input);
  }

  const previousRounded = clampPercentage(previousAffinity);
  const currentRounded = clampPercentage(input.affinity);

  if (previousRounded === currentRounded) {
    return getNoVisibleVariationExplanation(input);
  }

  if (input.cause === 'algorithm' || input.cause === 'dictionary') {
    return getSystemUpdateExplanation(input);
  }

  if (currentRounded > previousRounded) {
    return getIncreaseExplanation(input);
  }

  return getDecreaseExplanation(input);
}
