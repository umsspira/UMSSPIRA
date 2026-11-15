import type { MentorOnboardingState } from '../../domain/entities/mentor-onboarding';
import type {
  OnboardingAreasInput,
  OnboardingAvailabilityInput,
  OnboardingInterestsInput,
} from '../contracts/mentor-onboarding';

export const MENTOR_ONBOARDING_REPOSITORY = Symbol('MENTOR_ONBOARDING_REPOSITORY');

export interface MentorOnboardingRepository {
  read(userId: string): Promise<MentorOnboardingState>;
  saveAreas(userId: string, input: OnboardingAreasInput): Promise<MentorOnboardingState>;
  saveInterests(userId: string, input: OnboardingInterestsInput): Promise<MentorOnboardingState>;
  saveAvailability(
    userId: string,
    input: OnboardingAvailabilityInput,
  ): Promise<MentorOnboardingState>;
}
