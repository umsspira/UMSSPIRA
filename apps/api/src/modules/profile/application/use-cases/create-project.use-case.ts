import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { ProjectInput } from '../contracts/project-inputs';
import type { ProjectRepository } from '../ports/project-repository.port';
import { profileScope } from '../services/profile-scope';

export class CreateProjectUseCase {
  constructor(private readonly repository: ProjectRepository) {}

  // El dueño sale de la sesión, nunca del cuerpo de la petición
  async execute(actor: ActorContext, input: ProjectInput) {
    return this.repository.create(profileScope(actor), input);
  }
}
