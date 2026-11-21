import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { MentorshipRequestRepository } from '../ports/mentorship-request-repository.port';

export class CancelMyMentorshipRequestUseCase {
  constructor(
    private readonly repository: MentorshipRequestRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(actor: ActorContext, requestId: string) {
    if (actor.role !== 'titulado') {
      throw new BusinessRuleError(
        'forbidden',
        'MENTORSHIP_REQUEST_FORBIDDEN',
        'Solo un titulado puede gestionar sus solicitudes de mentoría',
      );
    }
    return this.repository.cancelCreated(actor.id, requestId, this.now());
  }
}
