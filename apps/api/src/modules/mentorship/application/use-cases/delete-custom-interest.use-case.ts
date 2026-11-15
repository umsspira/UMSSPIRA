import type { MentorCatalogRepository } from '../ports/mentor-catalog-repository.port';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';

export class DeleteCustomInterestUseCase {
  constructor(private readonly repository: MentorCatalogRepository) {}

  async execute(actor: ActorContext, id: string) {
    await this.repository.removeCustomInterest(actor.id, id);
    return { id, eliminado: true, mensaje: 'Interés eliminado' };
  }
}
