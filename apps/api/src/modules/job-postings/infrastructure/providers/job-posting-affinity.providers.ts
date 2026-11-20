import type { Provider } from '@nestjs/common';
import { JOB_POSTING_AFFINITY_DATA } from '../../application/ports/job-posting-affinity-data.port';
import {
  JOB_POSTING_AFFINITY_EXTRACTOR,
  type JobPostingAffinityExtractorPort,
} from '../../application/ports/job-posting-affinity-extractor.port';
import { CalculateJobPostingAffinity } from '../../application/use-cases/calculate-job-posting-affinity.use-case';
import { NlpJobPostingAffinityAdapter } from '../adapters/nlp-job-posting-affinity.adapter';
import { PrismaJobPostingAffinityDataAdapter } from '../adapters/prisma-job-posting-affinity-data.adapter';

export const jobPostingAffinityProviders: Provider[] = [
  PrismaJobPostingAffinityDataAdapter,
  NlpJobPostingAffinityAdapter,
  { provide: JOB_POSTING_AFFINITY_DATA, useExisting: PrismaJobPostingAffinityDataAdapter },
  { provide: JOB_POSTING_AFFINITY_EXTRACTOR, useExisting: NlpJobPostingAffinityAdapter },
  {
    provide: CalculateJobPostingAffinity,
    inject: [JOB_POSTING_AFFINITY_EXTRACTOR],
    useFactory: (extractor: JobPostingAffinityExtractorPort) =>
      new CalculateJobPostingAffinity(extractor),
  },
];
