import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { ProfileRepository } from '../ports/profile-repository.port';
import { profileScope } from '../services/profile-scope';

export class ReadCvUseCase {
  constructor(private readonly repository: ProfileRepository) {}

  execute(actor: ActorContext) {
    return this.repository.readCv(profileScope(actor));
  }
}
