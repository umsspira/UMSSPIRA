import type { Provider } from '@nestjs/common';
import {
  JOB_POSTING_REPOSITORY,
  type JobPostingRepository,
} from '../../application/ports/job-posting-repository.port';
import { CreateJobPostingUseCase } from '../../application/use-cases/create-job-posting.use-case';
import { ListAvailableJobPostingsUseCase } from '../../application/use-cases/list-available-job-postings.use-case';
import { PrismaJobPostingRepository } from '../repositories/prisma-job-posting.repository';

export const jobPostingsProviders: Provider[] = [
  PrismaJobPostingRepository,
  { provide: JOB_POSTING_REPOSITORY, useExisting: PrismaJobPostingRepository },
  {
    provide: CreateJobPostingUseCase,
    inject: [JOB_POSTING_REPOSITORY],
    useFactory: (repository: JobPostingRepository) => new CreateJobPostingUseCase(repository),
  },
  {
    provide: ListAvailableJobPostingsUseCase,
    inject: [JOB_POSTING_REPOSITORY],
    useFactory: (repository: JobPostingRepository) => new ListAvailableJobPostingsUseCase(repository),
  },
];
