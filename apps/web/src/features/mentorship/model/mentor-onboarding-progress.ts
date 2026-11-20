import type { MentorOnboardingState } from '../services/mentor-onboarding-api';
import type { MentorProfileInformationState } from '../services/mentor-profile-info-api';

export type MentorProgressStepNumber = 1 | 2 | 3 | 4;

export interface MentorProgressStep {
  step: MentorProgressStepNumber;
  key: 'areas' | 'interests' | 'availability' | 'information';
  label: string;
  href: string;
  completed: boolean;
}

export function isMentorProfileInformationComplete(
  information: MentorProfileInformationState | null,
): boolean {
  return Boolean(
    information?.exists
    && information.profile?.descripcion?.trim()
    && information.profile?.experiencia?.trim(),
  );
}

export function getMentorProgressSteps(
  state: Pick<MentorOnboardingState, 'areas' | 'interests' | 'availability'>,
  information: MentorProfileInformationState | null,
): MentorProgressStep[] {
  return [
    {
      step: 1,
      key: 'areas',
      label: 'Áreas técnicas',
      href: '/mentorship/profile/areas#first-incomplete',
      completed: state.areas.selectedIds.length > 0,
    },
    {
      step: 2,
      key: 'interests',
      label: 'Intereses de mentoría',
      href: '/mentorship/profile/interests#first-incomplete',
      completed: state.interests.selectedIds.length > 0,
    },
    {
      step: 3,
      key: 'availability',
      label: 'Disponibilidad',
      href: '/mentorship/profile/availability#first-incomplete',
      completed:
        state.availability.availabilityStatus !== null
        && state.availability.schedules.length > 0,
    },
    {
      step: 4,
      key: 'information',
      label: 'Información del perfil',
      href: '/mentorship/profile/information?edit=1#first-incomplete',
      completed: isMentorProfileInformationComplete(information),
    },
  ];
}
