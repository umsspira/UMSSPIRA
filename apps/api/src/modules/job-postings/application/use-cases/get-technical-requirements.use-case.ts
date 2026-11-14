import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { JobPostingTechnicalRequirementsNotFoundError } from '../../domain/errors/technical-requirement.errors';
import type { TechnicalRequirementsRepository } from '../ports/technical-requirements-repository.port';

export class GetTechnicalRequirementsUseCase {
  constructor(private readonly requirements: TechnicalRequirementsRepository) {}

  async execute(actor: ActorContext, vacancyId: string) {
    const result = await this.requirements.findForVacancy(
      vacancyId,
      actor.scopes.companyIds,
    );
    if (!result) {
      throw new JobPostingTechnicalRequirementsNotFoundError();
    }
    return result;
  }
}
