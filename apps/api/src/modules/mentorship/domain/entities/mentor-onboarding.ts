import type {
  AvailabilityStatus,
  InterestCatalogGroup,
  MentorAreas,
  MentorSchedule,
} from './mentor';

export const ONBOARDING_STEPS = ['areas', 'interests', 'availability'] as const;

export type OnboardingStep = 1 | 2 | 3;
export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number];

export const ONBOARDING_STEP_LABELS: Record<OnboardingStepKey, string> = {
  areas: 'Áreas técnicas',
  interests: 'Intereses',
  availability: 'Disponibilidad',
};

/** Lo que ya está persistido y permite calcular el avance real del asistente. */
export interface MentorOnboardingSnapshot {
  hasAreas: boolean;
  hasInterests: boolean;
  hasAvailability: boolean;
}

export interface MentorOnboardingState extends MentorOnboardingSnapshot {
  currentStep: OnboardingStep;
  totalSteps: number;
  completedSteps: OnboardingStep[];
  isComplete: boolean;
  areas: MentorAreas;
  interests: InterestCatalogGroup[];
  selectedInterestIds: string[];
  availability: {
    status: AvailabilityStatus | null;
    schedules: MentorSchedule[];
  };
}
