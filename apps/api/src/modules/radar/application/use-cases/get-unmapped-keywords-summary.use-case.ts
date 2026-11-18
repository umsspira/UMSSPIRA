import { Inject, Injectable } from '@nestjs/common';
import { DICTIONARY_VERSION } from '../../domain/policies/affinity-config';
import {
  type AggregatedUnmappedKeyword,
  RADAR_REPOSITORY_PORT,
  type RadarRepositoryPort,
} from '../ports/radar-repository.port';

export interface UnmappedKeywordsSummary {
  dictionaryVersion: string;
  totalTerms: number;
  items: AggregatedUnmappedKeyword[];
}

function compareTerms(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

/**
 * Caso de uso para consultar de forma agregada y anónima los términos no reconocidos
 * detectados en los perfiles, mostrando frecuencia total y cantidad de titulados
 * sin exponer identidades (HU-15 / T15.1, CA-HU15-01).
 */
@Injectable()
export class GetUnmappedKeywordsSummaryUseCase {
  constructor(
    @Inject(RADAR_REPOSITORY_PORT)
    private readonly radarRepository: RadarRepositoryPort,
  ) {}

  async execute(): Promise<UnmappedKeywordsSummary> {
    const rawItems = this.radarRepository.getAggregatedUnmappedKeywords
      ? await this.radarRepository.getAggregatedUnmappedKeywords()
      : [];

    const items = rawItems
      .filter(
        (item) =>
          typeof item.term === 'string' &&
          item.term.trim().length > 0 &&
          Number.isFinite(item.totalFrequency) &&
          item.totalFrequency > 0 &&
          Number.isFinite(item.graduatesCount) &&
          item.graduatesCount > 0,
      )
      .map((item) => ({
        term: item.term.trim().toLowerCase(),
        totalFrequency: Math.trunc(item.totalFrequency),
        graduatesCount: Math.trunc(item.graduatesCount),
        lastDetectedAt: item.lastDetectedAt ?? null,
      }))
      .sort(
        (left, right) =>
          right.totalFrequency - left.totalFrequency ||
          right.graduatesCount - left.graduatesCount ||
          compareTerms(left.term, right.term),
      );

    return {
      dictionaryVersion: DICTIONARY_VERSION,
      totalTerms: items.length,
      items,
    };
  }
}