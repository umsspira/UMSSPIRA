import type { MentorOnboardingRepository } from '../ports/mentor-onboarding-repository.port';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { OnboardingInterestsInput } from '../contracts/mentor-onboarding';

export class SaveMentorOnboardingInterestsUseCase {
  constructor(private readonly repository: MentorOnboardingRepository) {}

  async execute(actor: ActorContext, input: OnboardingInterestsInput) {
    return this.repository.saveInterests(actor.id, input);
  }
}
