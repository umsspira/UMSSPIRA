import { randomUUID } from 'node:crypto';
import type { JobPosting } from '../../src/modules/job-postings/domain/entities/job-posting.entity';
import type { JobPostingRepository } from '../../src/modules/job-postings/application/ports/job-posting-repository.port';
import type { CreateJobPostingInput } from '../../src/modules/job-postings/application/contracts/create-job-posting.input';
import type {
  JobPostingDetailCandidate,
  JobPostingListCandidate,
} from '../../src/modules/job-postings/application/contracts/available-job-posting';
import type { InMemoryCompanyProfileRepository } from './in-memory-company-profile.repository';
import { PUBLISHED_JOB_POSTING_STATUSES } from '../../src/modules/job-postings/domain/policies/job-posting-availability.policy';

export class InMemoryJobPostingRepository implements JobPostingRepository {
  readonly postings = new Map<string, JobPosting>();
  readonly readPostings = new Map<string, JobPostingDetailCandidate>();
  detailError: Error | null = null;

  constructor(private readonly companies: InMemoryCompanyProfileRepository) {}

  reset(): void {
    this.postings.clear();
    this.readPostings.clear();
    this.detailError = null;
  }

  async create(ownerId: string, input: CreateJobPostingInput, now: Date) {
    const company = this.companies.companies.get(input.empresaId);
    if (!company || company.ownerId !== ownerId) {
      return null;
    }
    const posting: JobPosting = {
      id: randomUUID(),
      companyId: input.empresaId,
      title: input.titulo,
      modality: input.modalidad,
      experienceLevel: input.nivelExperiencia,
      technicalDescription: input.descripcionTecnica,
      status: 'PUBLICADO',
      createdAt: now,
    };
    this.postings.set(posting.id, posting);
    this.readPostings.set(posting.id, {
      id: posting.id,
      title: posting.title,
      status: posting.status,
      closingDate: null,
      companyName: company.legalName,
      publicationDate: now,
      technicalDescription: posting.technicalDescription,
      modality: posting.modality,
      experienceLevel: posting.experienceLevel,
      requirements: [],
    });
    return posting;
  }

  async listPublished(): Promise<JobPostingListCandidate[]> {
    return [...this.readPostings.values()]
      .filter((posting) =>
        PUBLISHED_JOB_POSTING_STATUSES.some((status) => status === posting.status),
      )
      .sort(
        (left, right) =>
          (right.publicationDate?.getTime() ?? Number.NEGATIVE_INFINITY) -
          (left.publicationDate?.getTime() ?? Number.NEGATIVE_INFINITY),
      )
      .map(
        ({
          id,
          title,
          status,
          closingDate,
          companyName,
          technicalDescription,
          modality,
          publicationDate,
        }) => ({
          id,
          title,
          status,
          closingDate,
          companyName,
          technicalDescription,
          modality,
          publicationDate,
        }),
      );
  }

  async findById(id: string): Promise<JobPostingDetailCandidate | null> {
    if (this.detailError) {
      const error = this.detailError;
      this.detailError = null;
      throw error;
    }
    return this.readPostings.get(id) ?? null;
  }
}
