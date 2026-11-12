import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { ProjectRepository } from '../ports/project-repository.port';
import { profileScope } from '../services/profile-scope';

export class ListProjectsUseCase {
  constructor(private readonly repository: ProjectRepository) {}

  // Solo los proyectos del titulado de la sesión
  async execute(actor: ActorContext) {
    return this.repository.list(profileScope(actor));
  }
}
