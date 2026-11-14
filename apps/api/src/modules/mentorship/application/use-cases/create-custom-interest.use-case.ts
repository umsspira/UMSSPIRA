import type { MentorCatalogRepository } from '../ports/mentor-catalog-repository.port';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { CreateCustomInterestInput } from '../contracts/mentor-inputs';

export class CreateCustomInterestUseCase {
  constructor(private readonly repository: MentorCatalogRepository) {}

  async execute(actor: ActorContext, input: CreateCustomInterestInput) {
    return this.repository.createCustomInterest(actor.id, input.areaId, input.texto);
  }
}
