'use client';

import React from 'react';
import type { AffinityAreaExplanation } from '@umsspira/shared-types';
import { ErrorAlert } from './error-alert';
import {
  getChangeExplanation,
  type ChangeExplanationContributionInput,
} from '../constants/change-explanation-texts';

export interface ChangeExplanationProps {
  areaLabel: string;
  affinity: number;
  previousAffinity: number | null;
  explanation?: AffinityAreaExplanation | null;
  currentContributions?: ChangeExplanationContributionInput[];
  isLoading?: boolean;
  hasError?: boolean;
  onRetry?: () => void;
}

export const ChangeExplanation: React.FC<ChangeExplanationProps> = ({
  areaLabel,
  affinity,
  previousAffinity,
  explanation,
  currentContributions,
  isLoading = false,
  hasError = false,
  onRetry,
}) => {
  const explanationContributions: ChangeExplanationContributionInput[] =
    explanation?.changes.map((change) => ({
      keyword: change.keyword,
      percentagePoints: change.deltaPercentagePoints,
    })) ?? [];

  if (!isLoading && !hasError && !explanation && !currentContributions?.length) {
    return null;
  }

  const copy = getChangeExplanation({
    areaLabel,
    previousAffinity,
    affinity,
    cause: explanation?.cause ?? null,
    changes: explanationContributions,
    currentContributions: currentContributions ?? explanationContributions,
  });

  return (
    <section
      aria-labelledby="change-explanation-title"
      data-testid="change-explanation"
      className="min-w-0 space-y-2 rounded-lg border border-gray-200 bg-white p-3"
    >
      <h5
        id="change-explanation-title"
        className="text-sm font-semibold text-gray-700"
      >
        ¿Por qué cambió?
      </h5>

      {isLoading && (
        <p role="status" className="text-sm text-gray-500">
          Cargando la explicación de los cambios…
        </p>
      )}

      {!isLoading && hasError && (
        <ErrorAlert
          title="Error al cargar la explicación"
          message="No se pudo cargar la explicación de los cambios de esta área."
          onRetry={onRetry}
          isRetrying={isLoading}
        />
      )}

      {!isLoading && !hasError && (
        <>
          <p className="min-w-0 break-words text-sm text-gray-700">
            {copy.summary}
          </p>

          {copy.contributionIntro && (
            <p className="break-words text-xs font-medium text-gray-600">
              {copy.contributionIntro}
            </p>
          )}

          {copy.contributions.length > 0 && (
            <ul className="space-y-1" aria-label="Aportes de palabras clave">
              {copy.contributions.map((contribution, index) => (
                <li
                  key={`${contribution.keyword}-${contribution.points}-${index}`}
                  className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm text-gray-700"
                >
                  <span className="min-w-0 break-words font-medium">
                    {contribution.keyword}
                  </span>
                  <span className="shrink-0 tabular-nums text-gray-600">
                    {contribution.points}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
};
