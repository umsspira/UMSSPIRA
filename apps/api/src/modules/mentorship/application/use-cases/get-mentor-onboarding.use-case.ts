import type { MentorOnboardingRepository } from '../ports/mentor-onboarding-repository.port';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';

export class GetMentorOnboardingUseCase {
  constructor(private readonly repository: MentorOnboardingRepository) {}

  async execute(actor: ActorContext) {
    return this.repository.read(actor.id);
  }
}
