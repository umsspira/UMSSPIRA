import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { ProjectRepository } from '../ports/project-repository.port';
import { profileScope } from '../services/profile-scope';

export class DeleteProjectUseCase {
  constructor(private readonly repository: ProjectRepository) {}

  // Un proyecto ajeno responde 403 y uno inexistente 404
  async execute(actor: ActorContext, id: string) {
    return this.repository.remove(profileScope(actor), id);
  }
}
