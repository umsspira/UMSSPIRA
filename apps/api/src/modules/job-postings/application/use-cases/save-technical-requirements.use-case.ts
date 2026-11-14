import { normalizeTechnicalCompetency } from '@umsspira/shared-types';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { SaveTechnicalRequirementsInput } from '../contracts/technical-requirement.input';
import {
  DuplicateTechnicalRequirementError,
  JobPostingTechnicalRequirementsNotFoundError,
} from '../../domain/errors/technical-requirement.errors';
import type { TechnicalRequirementsRepository } from '../ports/technical-requirements-repository.port';

export class SaveTechnicalRequirementsUseCase {
  constructor(private readonly requirements: TechnicalRequirementsRepository) {}

  async execute(
    actor: ActorContext,
    vacancyId: string,
    input: SaveTechnicalRequirementsInput,
  ) {
    const normalized = input.map((requirement) =>
      normalizeTechnicalCompetency(requirement.competenciaTecnica),
    );
    if (new Set(normalized).size !== normalized.length) {
      throw new DuplicateTechnicalRequirementError();
    }

    const result = await this.requirements.replaceForVacancy(
      vacancyId,
      actor.scopes.companyIds,
      input,
    );
    if (!result) {
      throw new JobPostingTechnicalRequirementsNotFoundError();
    }
    return result;
  }
}
