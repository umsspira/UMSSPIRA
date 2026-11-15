import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';
import { UnprocessableEntityError } from '../../../../shared/errors/unprocessable-entity-error';
import {
  assertPreviousOnboardingStepCompleted,
  assertValidOnboardingAreas,
  assertValidOnboardingAvailability,
  assertValidOnboardingInterests,
  completedOnboardingSteps,
  onboardingStatus,
} from './mentor-onboarding.policy';

const capture = (action: () => void) => {
  try {
    action();
  } catch (error) {
    return error;
  }
  return null;
};

describe('Política del onboarding de mentor', () => {
  it('solo cuenta pasos completados de forma contigua', () => {
    expect(
      completedOnboardingSteps({ hasAreas: false, hasInterests: true, hasAvailability: true }),
    ).toEqual([]);
    expect(
      completedOnboardingSteps({ hasAreas: true, hasInterests: false, hasAvailability: true }),
    ).toEqual([1]);
    expect(
      completedOnboardingSteps({ hasAreas: true, hasInterests: true, hasAvailability: false }),
    ).toEqual([1, 2]);
    expect(
      completedOnboardingSteps({ hasAreas: true, hasInterests: true, hasAvailability: true }),
    ).toEqual([1, 2, 3]);
  });

  it('calcula el paso actual y el total para el indicador de progreso', () => {
    expect(
      onboardingStatus({ hasAreas: false, hasInterests: false, hasAvailability: false }),
    ).toMatchObject({
      completedSteps: [],
      currentStep: 1,
      isComplete: false,
    });
    expect(
      onboardingStatus({ hasAreas: true, hasInterests: false, hasAvailability: false }),
    ).toMatchObject({
      completedSteps: [1],
      currentStep: 2,
    });
    expect(
      onboardingStatus({ hasAreas: true, hasInterests: true, hasAvailability: true }),
    ).toMatchObject({
      completedSteps: [1, 2, 3],
      currentStep: 3,
      isComplete: true,
    });
  });

  it('rechaza un paso posterior con PASO_PREVIO_INCOMPLETO', () => {
    const error = capture(() =>
      assertPreviousOnboardingStepCompleted(2, {
        hasAreas: false,
        hasInterests: false,
        hasAvailability: false,
      }),
    );
    expect(error).toBeInstanceOf(BusinessRuleError);
    expect((error as BusinessRuleError).code).toBe('PASO_PREVIO_INCOMPLETO');
    expect((error as BusinessRuleError).reason).toBe('conflict');
  });

  it('exige al menos un área y como máximo cinco sin duplicados', () => {
    const empty = capture(() => assertValidOnboardingAreas([]));
    expect(empty).toBeInstanceOf(UnprocessableEntityError);
    expect((empty as UnprocessableEntityError).fields.areaIds).toBeDefined();

    const tooMany = capture(() => assertValidOnboardingAreas(['1', '2', '3', '4', '5', '6']));
    expect(tooMany).toBeInstanceOf(UnprocessableEntityError);

    const repeated = capture(() => assertValidOnboardingAreas(['1', '1']));
    expect(repeated).toBeInstanceOf(UnprocessableEntityError);
  });

  it('exige al menos un interés', () => {
    const error = capture(() => assertValidOnboardingInterests([]));
    expect(error).toBeInstanceOf(UnprocessableEntityError);
    expect((error as UnprocessableEntityError).code).toBe('DATOS_PASO_INVALIDOS');
    expect((error as UnprocessableEntityError).fields.interestIds).toBeDefined();
  });

  it('rechaza horarios con fin anterior al inicio, sin días o superpuestos', () => {
    const reversed = capture(() =>
      assertValidOnboardingAvailability('DISPONIBLE', [
        { weekday: 2, start: '20:00', end: '18:00' },
      ]),
    );
    expect(reversed).toBeInstanceOf(UnprocessableEntityError);
    expect((reversed as UnprocessableEntityError).fields.schedules.join(' ')).toMatch(/posterior/i);

    const empty = capture(() => assertValidOnboardingAvailability('DISPONIBLE', []));
    expect(empty).toBeInstanceOf(UnprocessableEntityError);

    const overlapping = capture(() =>
      assertValidOnboardingAvailability('DISPONIBLE', [
        { weekday: 2, start: '18:00', end: '20:00' },
        { weekday: 2, start: '19:00', end: '21:00' },
      ]),
    );
    expect(overlapping).toBeInstanceOf(UnprocessableEntityError);
  });

  it('acepta una disponibilidad válida', () => {
    expect(() =>
      assertValidOnboardingAvailability('DISPONIBLE', [
        { weekday: 2, start: '18:00', end: '20:00' },
        { weekday: 4, start: '09:00', end: '11:00' },
      ]),
    ).not.toThrow();
  });
});
