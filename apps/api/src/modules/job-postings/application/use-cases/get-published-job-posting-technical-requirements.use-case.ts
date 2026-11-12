import { JobPostingNotFoundError } from '../../domain/errors/job-posting-not-found.error';
import type { JobPostingRepository } from '../ports/job-posting-repository.port';
import type {
  PublishedTechnicalRequirement,
  PublishedTechnicalRequirementsReader,
} from '../ports/published-technical-requirements-reader.port';

export class GetPublishedJobPostingTechnicalRequirementsUseCase {
  constructor(
    private readonly jobs: JobPostingRepository,
    private readonly requirements: PublishedTechnicalRequirementsReader,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(id: string): Promise<{
    idVacante: string;
    requisitos: PublishedTechnicalRequirement[];
  }> {
    // Share HU12's publication and closing-date policy before reading HU2 data.
    const posting = await this.jobs.findPublishedById(id, this.now());
    if (!posting) {
      throw new JobPostingNotFoundError();
    }

    return {
      idVacante: posting.id,
      requisitos: await this.requirements.obtenerRequisitos(posting.id),
    };
  }
}
