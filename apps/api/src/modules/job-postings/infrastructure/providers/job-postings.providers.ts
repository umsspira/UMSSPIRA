import type { Provider } from '@nestjs/common';
import {
  JOB_POSTING_REPOSITORY,
  type JobPostingRepository,
} from '../../application/ports/job-posting-repository.port';
import { CreateJobPostingUseCase } from '../../application/use-cases/create-job-posting.use-case';
import { GetPublishedJobPostingUseCase } from '../../application/use-cases/get-published-job-posting.use-case';
import { GetTechnicalRequirementsUseCase } from '../../application/use-cases/get-technical-requirements.use-case';
import { ListPublishedJobPostingsUseCase } from '../../application/use-cases/list-published-job-postings.use-case';
import { RequisitosTecnicosService } from '../../../vacantes/requisitos-tecnicos.service';
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
    provide: ListPublishedJobPostingsUseCase,
    inject: [JOB_POSTING_REPOSITORY],
    useFactory: (repository: JobPostingRepository) =>
      new ListPublishedJobPostingsUseCase(repository),
  },
  {
    provide: GetPublishedJobPostingUseCase,
    inject: [JOB_POSTING_REPOSITORY],
    useFactory: (repository: JobPostingRepository) =>
      new GetPublishedJobPostingUseCase(repository),
  },
  {
    provide: GetTechnicalRequirementsUseCase,
    inject: [JOB_POSTING_REPOSITORY, RequisitosTecnicosService],
    useFactory: (
      repository: JobPostingRepository,
      requirements: RequisitosTecnicosService,
    ) => new GetTechnicalRequirementsUseCase(repository, requirements),
  },
];
