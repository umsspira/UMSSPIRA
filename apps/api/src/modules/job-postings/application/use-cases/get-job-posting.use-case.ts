import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { JobPostingRepository } from '../ports/job-posting-repository.port';
import { JobPostingTechnicalRequirementsNotFoundError } from '../../domain/errors/technical-requirement.errors';

export class GetJobPostingUseCase {
  constructor(private readonly postings: JobPostingRepository) {}

  async execute(actor: ActorContext, vacancyId: string) {
    const posting = await this.postings.findById(vacancyId, actor.scopes.companyIds);
    if (!posting) {
      throw new JobPostingTechnicalRequirementsNotFoundError();
    }
    return posting;
  }
}
