import type { KeywordExtractor } from '../../domain/policies/requirement-similarity';

export const JOB_POSTING_AFFINITY_EXTRACTOR = Symbol('JOB_POSTING_AFFINITY_EXTRACTOR');

/** HU-11: el motor necesita el extractor (no solo las habilidades) para procesar también los requisitos. */
export interface JobPostingAffinityExtractorPort {
  loadExtractor(): Promise<KeywordExtractor>;
}
