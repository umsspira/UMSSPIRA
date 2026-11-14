import { randomUUID } from 'node:crypto';
import type { TechnicalRequirementInput } from '@umsspira/shared-types';
import type { TechnicalRequirementsRepository } from '../../src/modules/job-postings/application/ports/technical-requirements-repository.port';
import type {
  TechnicalRequirement,
  TechnicalRequirementsForVacancy,
} from '../../src/modules/job-postings/domain/entities/technical-requirement.entity';
import type { InMemoryJobPostingRepository } from './in-memory-job-posting.repository';

export class InMemoryTechnicalRequirementsRepository implements TechnicalRequirementsRepository {
  readonly requirements = new Map<string, TechnicalRequirement[]>();

  constructor(private readonly jobPostings: InMemoryJobPostingRepository) {}

  async findForVacancy(
    vacancyId: string,
    companyIds: readonly string[],
  ): Promise<TechnicalRequirementsForVacancy | null> {
    const vacancy = this.jobPostings.postings.get(vacancyId);
    if (!vacancy || !companyIds.includes(vacancy.companyId)) {
      return null;
    }

    return {
      vacancyId,
      vacancyTitle: vacancy.title,
      requirements: [...(this.requirements.get(vacancyId) ?? [])].sort((left, right) =>
        left.competency.localeCompare(right.competency, 'es'),
      ),
    };
  }

  async replaceForVacancy(
    vacancyId: string,
    companyIds: readonly string[],
    input: TechnicalRequirementInput[],
  ): Promise<TechnicalRequirementsForVacancy | null> {
    const vacancy = this.jobPostings.postings.get(vacancyId);
    if (!vacancy || !companyIds.includes(vacancy.companyId)) {
      return null;
    }

    this.requirements.set(
      vacancyId,
      input.map((item) => ({
        id: randomUUID(),
        vacancyId,
        competency: item.competenciaTecnica.trim(),
        expectedLevel: item.nivelEsperado,
        type: item.tipo,
        description: item.descripcion.trim() || null,
        createdAt: new Date(),
      })),
    );
    return this.findForVacancy(vacancyId, companyIds);
  }
}
