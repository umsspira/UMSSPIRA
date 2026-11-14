import { randomUUID } from 'node:crypto';
import type { JobPosting } from '../../src/modules/job-postings/domain/entities/job-posting.entity';
import type { JobPostingRepository } from '../../src/modules/job-postings/application/ports/job-posting-repository.port';
import type { CreateJobPostingInput } from '../../src/modules/job-postings/application/contracts/create-job-posting.input';
import type { PublishedJobPosting } from '../../src/modules/job-postings/domain/entities/published-job-posting.entity';
import type { InMemoryCompanyProfileRepository } from './in-memory-company-profile.repository';

export class InMemoryJobPostingRepository implements JobPostingRepository {
  readonly postings = new Map<string, JobPosting>();

  constructor(private readonly companies: InMemoryCompanyProfileRepository) {}

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
    return posting;
  }

  async listPublished(): Promise<PublishedJobPosting[]> {
    return Array.from(this.postings.values())
      .filter((posting) => posting.status === 'PUBLICADO')
      .map((posting) => this.toPublishedPosting(posting));
  }

  async findPublishedById(id: string): Promise<PublishedJobPosting | null> {
    const posting = this.postings.get(id);
    if (!posting || posting.status !== 'PUBLICADO') {
      return null;
    }

    return this.toPublishedPosting(posting);
  }

  private toPublishedPosting(posting: JobPosting): PublishedJobPosting {
    return {
      id: posting.id,
      title: posting.title,
      modality: posting.modality,
      experienceLevel: posting.experienceLevel,
      technicalDescription: posting.technicalDescription,
      publishedAt: posting.createdAt,
      company: null,
      technicalRequirements: [],
    };
  }
}
