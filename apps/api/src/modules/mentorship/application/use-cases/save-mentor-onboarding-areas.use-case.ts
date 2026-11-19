import type { MentorOnboardingRepository } from '../ports/mentor-onboarding-repository.port';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { OnboardingAreasInput } from '../contracts/mentor-onboarding';

export class SaveMentorOnboardingAreasUseCase {
  constructor(private readonly repository: MentorOnboardingRepository) {}

  async execute(actor: ActorContext, input: OnboardingAreasInput) {
    return this.repository.saveAreas(actor.id, input);
  }
}
