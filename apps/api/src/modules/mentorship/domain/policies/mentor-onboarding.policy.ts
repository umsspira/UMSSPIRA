import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';
import { UnprocessableEntityError } from '../../../../shared/errors/unprocessable-entity-error';
import type { AvailabilityStatus, MentorSchedule } from '../entities/mentor';
import type { MentorOnboardingSnapshot, OnboardingStep } from '../entities/mentor-onboarding';

export const MAX_ONBOARDING_AREAS = 5;
export const MAX_ONBOARDING_INTERESTS = 100;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const invalidStep = (fields: Record<string, string[]>, message: string): never => {
  throw new UnprocessableEntityError('DATOS_PASO_INVALIDOS', message, fields);
};

/**
 * Un paso solo cuenta como completado si todos sus anteriores también lo están.
 * Así el avance mostrado siempre es contiguo y no se puede "saltar" un paso.
 */
export function completedOnboardingSteps(snapshot: MentorOnboardingSnapshot): OnboardingStep[] {
  const completed: OnboardingStep[] = [];
  if (!snapshot.hasAreas) {
    return completed;
  }
  completed.push(1);
  if (!snapshot.hasInterests) {
    return completed;
  }
  completed.push(2);
  if (snapshot.hasAvailability) {
    completed.push(3);
  }
  return completed;
}

export function onboardingStatus(snapshot: MentorOnboardingSnapshot) {
  const completedSteps = completedOnboardingSteps(snapshot);
  const isComplete = completedSteps.length === 3;
  const currentStep = (isComplete ? 3 : completedSteps.length + 1) as OnboardingStep;
  return { completedSteps, currentStep, isComplete };
}

/** CANF-05: el servidor valida el orden, no solo la interfaz. */
export function assertPreviousOnboardingStepCompleted(
  step: OnboardingStep,
  snapshot: MentorOnboardingSnapshot,
): void {
  const completed = completedOnboardingSteps(snapshot);
  const required = step - 1;
  if (required > 0 && !completed.includes(required as OnboardingStep)) {
    throw new BusinessRuleError(
      'conflict',
      'PASO_PREVIO_INCOMPLETO',
      `Completa el paso ${required} antes de guardar el paso ${step}`,
    );
  }
}

export function assertValidOnboardingAreas(areaIds: string[]): void {
  if (areaIds.length === 0) {
    invalidStep(
      { areaIds: ['Selecciona al menos un área técnica'] },
      'Debes seleccionar al menos un área técnica',
    );
  }
  if (areaIds.length > MAX_ONBOARDING_AREAS) {
    invalidStep(
      { areaIds: [`Selecciona como máximo ${MAX_ONBOARDING_AREAS} áreas técnicas`] },
      'La selección de áreas supera el máximo permitido',
    );
  }
  if (new Set(areaIds).size !== areaIds.length) {
    invalidStep(
      { areaIds: ['No repitas un área técnica en la solicitud'] },
      'La selección de áreas contiene duplicados',
    );
  }
}

export function assertValidOnboardingInterests(interestIds: string[]): void {
  if (interestIds.length === 0) {
    invalidStep(
      { interestIds: ['Selecciona al menos un interés de mentoría'] },
      'Debes seleccionar al menos un interés',
    );
  }
  if (interestIds.length > MAX_ONBOARDING_INTERESTS) {
    invalidStep(
      { interestIds: [`Selecciona como máximo ${MAX_ONBOARDING_INTERESTS} intereses`] },
      'La selección de intereses supera el máximo permitido',
    );
  }
  if (new Set(interestIds).size !== interestIds.length) {
    invalidStep(
      { interestIds: ['No repitas un interés en la solicitud'] },
      'La selección de intereses contiene duplicados',
    );
  }
}

export function assertValidOnboardingAvailability(
  status: AvailabilityStatus,
  schedules: MentorSchedule[],
): void {
  if (!['DISPONIBLE', 'EN_PAUSA', 'NO_DISPONIBLE'].includes(status)) {
    invalidStep(
      { availabilityStatus: ['Selecciona un estado de disponibilidad válido'] },
      'El estado de disponibilidad no es válido',
    );
  }
  if (schedules.length === 0) {
    invalidStep(
      { schedules: ['Indica al menos un día y horario de disponibilidad'] },
      'Debes indicar al menos un día y horario',
    );
  }
  const fields: string[] = [];
  for (const schedule of schedules) {
    if (!Number.isInteger(schedule.weekday) || schedule.weekday < 1 || schedule.weekday > 7) {
      fields.push('El día de la semana debe estar entre 1 (lunes) y 7 (domingo)');
      continue;
    }
    if (!TIME_PATTERN.test(schedule.start) || !TIME_PATTERN.test(schedule.end)) {
      fields.push('Los horarios deben tener el formato HH:MM');
      continue;
    }
    if (schedule.end <= schedule.start) {
      fields.push('La hora de fin debe ser posterior a la hora de inicio');
    }
  }
  if (fields.length) {
    invalidStep({ schedules: fields }, 'Revisa los días y horarios indicados');
  }

  const byWeekday = new Map<number, MentorSchedule[]>();
  for (const schedule of schedules) {
    byWeekday.set(schedule.weekday, [...(byWeekday.get(schedule.weekday) ?? []), schedule]);
  }
  for (const daySchedules of byWeekday.values()) {
    const sorted = [...daySchedules].sort((a, b) => a.start.localeCompare(b.start));
    for (let index = 1; index < sorted.length; index += 1) {
      if (sorted[index].start < sorted[index - 1].end) {
        invalidStep(
          { schedules: ['Los horarios de un mismo día no pueden superponerse'] },
          'Los horarios indicados se superponen',
        );
      }
    }
  }
}
