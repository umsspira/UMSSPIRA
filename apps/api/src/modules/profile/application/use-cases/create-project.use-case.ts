import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { ProfileRepository } from '../ports/profile-repository.port';
import { profileScope } from '../services/profile-scope';
import type { ProjectInput } from '../contracts/profile-inputs';

// HU-19 (T19.3): proyecto del titulado autenticado
export class CreateProjectUseCase {
  constructor(private readonly repository: ProfileRepository) {}

  async execute(actor: ActorContext, input: ProjectInput) {
    return this.repository.createProject(profileScope(actor), input);
  }
}
