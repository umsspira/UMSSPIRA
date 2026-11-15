import type { MentorOnboardingResponse } from '@umsspira/shared-types';
import type { MentorOnboardingState } from '../../domain/entities/mentor-onboarding';
import { ONBOARDING_STEP_LABELS } from '../../domain/entities/mentor-onboarding';
import { presentMentorAreas } from './mentor.presenter';

const STEP_KEYS = ['areas', 'interests', 'availability'] as const;

export function presentMentorOnboarding(state: MentorOnboardingState): MentorOnboardingResponse {
  const areas = presentMentorAreas(state.areas);
  return {
    isComplete: state.isComplete,
    currentStep: state.currentStep,
    totalSteps: state.totalSteps,
    completedSteps: state.completedSteps,
    steps: STEP_KEYS.map((key, index) => {
      const step = (index + 1) as 1 | 2 | 3;
      return {
        step,
        key,
        label: ONBOARDING_STEP_LABELS[key],
        completed: state.completedSteps.includes(step),
      };
    }),
    areas: {
      catalog: areas.areas,
      selectedIds: areas.selectedIds,
      intereses: areas.intereses,
    },
    interests: {
      selectedIds: state.selectedInterestIds,
      catalog: state.interests.map((group) => ({
        area: { id: group.area.id, nombre: group.area.name },
        intereses: group.interests.map((interest) => ({
          id: interest.id,
          nombre: interest.name,
          area: { id: interest.area.id, nombre: interest.area.name },
          seleccionado: interest.selected,
        })),
      })),
    },
    availability: {
      availabilityStatus: state.availability.status,
      schedules: state.availability.schedules.map((schedule) => ({
        weekday: schedule.weekday,
        start: schedule.start,
        end: schedule.end,
      })),
    },
  };
}
