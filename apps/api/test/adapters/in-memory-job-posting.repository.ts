import { randomUUID } from 'node:crypto';
import type { JobPosting } from '../../src/modules/job-postings/domain/entities/job-posting.entity';
import type { AvailableJobPosting } from '../../src/modules/job-postings/domain/entities/available-job-posting.entity';
import type { JobPostingRepository } from '../../src/modules/job-postings/application/ports/job-posting-repository.port';
import type { CreateJobPostingInput } from '../../src/modules/job-postings/application/contracts/create-job-posting.input';
import type { InMemoryCompanyProfileRepository } from './in-memory-company-profile.repository';

export class InMemoryJobPostingRepository implements JobPostingRepository {
  readonly postings = new Map<string, JobPosting>();
  readonly available: AvailableJobPosting[] = [];

  constructor(private readonly companies: InMemoryCompanyProfileRepository) {}

  async listAvailable(): Promise<AvailableJobPosting[]> {
    return [...this.available];
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
    this.available.push({
      id: posting.id,
      title: posting.title,
      companyName: this.companies.companies.get(input.empresaId)?.legalName ?? 'Empresa',
      companyLogoUrl: null,
      technicalDescription: posting.technicalDescription,
      area: null,
      modality: posting.modality,
      experienceLevel: posting.experienceLevel,
      location: null,
      publishedAt: now,
      affinityPercentage: null,
    });
    return posting;
  }
}
