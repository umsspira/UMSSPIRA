import type { MentorCatalogRepository } from '../ports/mentor-catalog-repository.port';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { UpdateCustomInterestInput } from '../contracts/mentor-inputs';

export class UpdateCustomInterestUseCase {
  constructor(private readonly repository: MentorCatalogRepository) {}

  async execute(actor: ActorContext, id: string, input: UpdateCustomInterestInput) {
    return this.repository.updateCustomInterest(actor.id, id, input.texto);
  }
}
