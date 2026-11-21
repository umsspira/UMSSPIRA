import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { MyMentorshipRequestQuery } from '../contracts/my-mentorship-request-query';
import type { MentorshipRequestRepository } from '../ports/mentorship-request-repository.port';

export class ListMyMentorshipRequestsUseCase {
  constructor(private readonly repository: MentorshipRequestRepository) {}

  async execute(actor: ActorContext, query: MyMentorshipRequestQuery) {
    this.assertGraduate(actor);
    // No se exige participación activa como mentor: cualquier titulado puede
    // consultar las solicitudes que él mismo creó.
    return this.repository.listCreatedByUser(actor.id, query);
  }

  private assertGraduate(actor: ActorContext) {
    if (actor.role !== 'titulado') {
      throw new BusinessRuleError(
        'forbidden',
        'MENTORSHIP_REQUEST_FORBIDDEN',
        'Solo un titulado puede gestionar sus solicitudes de mentoría',
      );
    }
  }
}
