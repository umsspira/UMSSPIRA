export const JOB_POSTING_AFFINITY_EXTRACTOR = Symbol('JOB_POSTING_AFFINITY_EXTRACTOR');

export interface JobPostingAffinityExtractorPort {
  extractSkills(texts: readonly string[]): Promise<string[]>;
}
