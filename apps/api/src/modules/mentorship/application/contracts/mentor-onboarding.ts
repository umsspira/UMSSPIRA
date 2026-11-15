import type { AvailabilityStatus, MentorSchedule } from '../../domain/entities/mentor';

export interface OnboardingAreasInput {
  areaIds: string[];
}

export interface OnboardingInterestsInput {
  interestIds: string[];
}

export interface OnboardingAvailabilityInput {
  availabilityStatus: AvailabilityStatus;
  schedules: MentorSchedule[];
}
