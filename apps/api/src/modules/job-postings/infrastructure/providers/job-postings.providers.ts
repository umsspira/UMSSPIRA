import type { Provider } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/database/prisma.service';
import {
  JOB_POSTING_REPOSITORY,
  type JobPostingRepository,
} from '../../application/ports/job-posting-repository.port';
import { CreateJobPostingUseCase } from '../../application/use-cases/create-job-posting.use-case';
import { GetPublishedJobPostingUseCase } from '../../application/use-cases/get-published-job-posting.use-case';
import { GetPublishedJobPostingTechnicalRequirementsUseCase } from '../../application/use-cases/get-published-job-posting-technical-requirements.use-case';
import { ListPublishedJobPostingsUseCase } from '../../application/use-cases/list-published-job-postings.use-case';
import { CanonicalTechnicalRequirementsReader } from '../readers/canonical-technical-requirements.reader';
import { PrismaJobPostingRepository } from '../repositories/prisma-job-posting.repository';
import {
  TECHNICAL_REQUIREMENTS_REPOSITORY,
  type TechnicalRequirementsRepository,
} from '../../application/ports/technical-requirements-repository.port';
import { GetTechnicalRequirementsUseCase } from '../../application/use-cases/get-technical-requirements.use-case';
import { SaveTechnicalRequirementsUseCase } from '../../application/use-cases/save-technical-requirements.use-case';
import { PrismaTechnicalRequirementsRepository } from '../repositories/prisma-technical-requirements.repository';

export const jobPostingsProviders: Provider[] = [
  PrismaJobPostingRepository,
  { provide: JOB_POSTING_REPOSITORY, useExisting: PrismaJobPostingRepository },
  PrismaTechnicalRequirementsRepository,
  {
    provide: TECHNICAL_REQUIREMENTS_REPOSITORY,
    useExisting: PrismaTechnicalRequirementsRepository,
  },
  {
    provide: CanonicalTechnicalRequirementsReader,
    inject: [PrismaService],
    useFactory: (prisma: PrismaService) =>
      new CanonicalTechnicalRequirementsReader({
        findMany: (query) => prisma.vacanteRequisitoTecnico.findMany(query),
      }),
  },
  {
    provide: CreateJobPostingUseCase,
    inject: [JOB_POSTING_REPOSITORY],
    useFactory: (repository: JobPostingRepository) => new CreateJobPostingUseCase(repository),
  },
  {
    provide: GetTechnicalRequirementsUseCase,
    inject: [TECHNICAL_REQUIREMENTS_REPOSITORY],
    useFactory: (repository: TechnicalRequirementsRepository) =>
      new GetTechnicalRequirementsUseCase(repository),
  },
  {
    provide: SaveTechnicalRequirementsUseCase,
    inject: [TECHNICAL_REQUIREMENTS_REPOSITORY],
    useFactory: (repository: TechnicalRequirementsRepository) =>
      new SaveTechnicalRequirementsUseCase(repository),
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
    provide: GetPublishedJobPostingTechnicalRequirementsUseCase,
    inject: [JOB_POSTING_REPOSITORY, CanonicalTechnicalRequirementsReader],
    useFactory: (
      repository: JobPostingRepository,
      requirements: CanonicalTechnicalRequirementsReader,
    ) => new GetPublishedJobPostingTechnicalRequirementsUseCase(repository, requirements),
  },
];
