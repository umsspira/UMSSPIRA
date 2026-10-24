import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';
import type { AvailabilityStatus } from '../entities/mentor';

export function assertDistinctInterests(ids: string[]): void {
  if (new Set(ids).size !== ids.length) {
    throw new BusinessRuleError(
      'conflict',
      'INTEREST_ALREADY_SELECTED',
      'No repitas un interés en la solicitud',
    );
  }
}

export function canReceiveMentorship(
  active: boolean,
  availability: AvailabilityStatus | null,
): boolean {
  return active && availability === 'DISPONIBLE';
}
