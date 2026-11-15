import type { MentorOnboardingRepository } from '../ports/mentor-onboarding-repository.port';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { OnboardingAvailabilityInput } from '../contracts/mentor-onboarding';

export class SaveMentorOnboardingAvailabilityUseCase {
  constructor(private readonly repository: MentorOnboardingRepository) {}

  async execute(actor: ActorContext, input: OnboardingAvailabilityInput) {
    return this.repository.saveAvailability(actor.id, input);
  }
}
