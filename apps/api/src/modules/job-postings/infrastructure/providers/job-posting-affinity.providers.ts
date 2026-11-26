import type { Provider } from '@nestjs/common';
import {
  JOB_POSTING_AFFINITY_DATA,
  type JobPostingAffinityDataPort,
} from '../../application/ports/job-posting-affinity-data.port';
import type { JobPostingAffinityBatchDataPort } from '../../application/ports/job-posting-affinity-batch-data.port';
import { JOB_POSTING_AFFINITY_BATCH_DATA } from '../../application/ports/job-posting-affinity-batch-data.port';
import {
  JOB_POSTING_AFFINITY_EXTRACTOR,
  type JobPostingAffinityExtractorPort,
} from '../../application/ports/job-posting-affinity-extractor.port';
import { CalculateJobPostingAffinity } from '../../application/use-cases/calculate-job-posting-affinity.use-case';
import { CalculateJobPostingAffinityBatch } from '../../application/use-cases/calculate-job-posting-affinity-batch.use-case';
import { NlpJobPostingAffinityAdapter } from '../adapters/nlp-job-posting-affinity.adapter';
import { PrismaJobPostingAffinityDataAdapter } from '../adapters/prisma-job-posting-affinity-data.adapter';
import { RefreshJobPostingAffinity } from '../../application/use-cases/refresh-job-posting-affinity.use-case';
import { JOB_POSTING_AFFINITY_REFRESH, type JobPostingAffinityRefreshPort } from '../../application/ports/job-posting-affinity-refresh.port';
import { PrismaJobPostingAffinityRefreshRepository } from '../repositories/prisma-job-posting-affinity-refresh.repository';

export const jobPostingAffinityProviders: Provider[] = [
  PrismaJobPostingAffinityDataAdapter,
  PrismaJobPostingAffinityRefreshRepository,
  { provide: JOB_POSTING_AFFINITY_REFRESH, useExisting: PrismaJobPostingAffinityRefreshRepository },
  NlpJobPostingAffinityAdapter,
  { provide: JOB_POSTING_AFFINITY_DATA, useExisting: PrismaJobPostingAffinityDataAdapter },
  { provide: JOB_POSTING_AFFINITY_BATCH_DATA, useExisting: PrismaJobPostingAffinityDataAdapter },
  { provide: JOB_POSTING_AFFINITY_EXTRACTOR, useExisting: NlpJobPostingAffinityAdapter },
  {
    provide: CalculateJobPostingAffinityBatch,
    inject: [
      JOB_POSTING_AFFINITY_DATA,
      JOB_POSTING_AFFINITY_BATCH_DATA,
      CalculateJobPostingAffinity,
    ],
    useFactory: (
      data: JobPostingAffinityDataPort,
      batchData: JobPostingAffinityBatchDataPort,
      calculate: CalculateJobPostingAffinity,
    ) =>
      new CalculateJobPostingAffinityBatch(data, batchData, calculate),
  },
  {
    provide: CalculateJobPostingAffinity,
    inject: [JOB_POSTING_AFFINITY_EXTRACTOR],
    useFactory: (extractor: JobPostingAffinityExtractorPort) =>
      new CalculateJobPostingAffinity(extractor),
  },
  {
    provide: RefreshJobPostingAffinity,
    inject: [JOB_POSTING_AFFINITY_DATA, JOB_POSTING_AFFINITY_REFRESH, CalculateJobPostingAffinity],
    useFactory: (data: JobPostingAffinityDataPort, repository: JobPostingAffinityRefreshPort, calculate: CalculateJobPostingAffinity) =>
      new RefreshJobPostingAffinity(data, repository, calculate),
  },
];
