import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';

export function validateScheduledPublicationDate(
  scheduledAt: Date,
  now: Date,
): void {
  if (
    Number.isNaN(scheduledAt.getTime()) ||
    scheduledAt.getTime() <= now.getTime()
  ) {
    throw new BusinessRuleError(
      'invalid',
      'INVALID_SCHEDULED_PUBLICATION_DATE',
      'La fecha de publicación debe ser futura',
    );
  }
}
