import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { ProjectInput } from '../contracts/project-inputs';
import type { ProjectRepository } from '../ports/project-repository.port';
import { profileScope } from '../services/profile-scope';

export class UpdateProjectUseCase {
  constructor(private readonly repository: ProjectRepository) {}

  // Un proyecto ajeno responde 403 y uno inexistente 404
  async execute(actor: ActorContext, id: string, input: ProjectInput) {
    return this.repository.update(profileScope(actor), id, input);
  }
}
