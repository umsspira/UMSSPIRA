import type { MentorCatalogRepository } from '../ports/mentor-catalog-repository.port';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { SaveMentorInterestsInput } from '../contracts/mentor-inputs';
import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';

/**
 * HU 6.21: guarda áreas y tópicos en una sola operación.
 * Sustituye la secuencia de 5-7 peticiones que hacía el cliente.
 */
export class SaveMentorInterestsUseCase {
  constructor(private readonly repository: MentorCatalogRepository) {}

  async execute(actor: ActorContext, input: SaveMentorInterestsInput) {
    if (new Set(input.areaIds).size !== input.areaIds.length) {
      throw new BusinessRuleError('invalid', 'AREA_INVALID', 'No repitas un área en la solicitud');
    }
    if (new Set(input.topicIds).size !== input.topicIds.length) {
      throw new BusinessRuleError(
        'invalid',
        'INTEREST_INVALID',
        'No repitas un tópico en la solicitud',
      );
    }
    return this.repository.saveInterests(actor.id, input.areaIds, input.topicIds);
  }
}
