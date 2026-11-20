import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { CertificateTemplatesRepository } from '../ports/certificate-templates-repository.port';
import { missingCertificateFields } from '../../domain/policies/certificate-template.policy';

export class GetCertificateTemplateUseCase {
  constructor(private readonly repository: CertificateTemplatesRepository) {}

  async execute(actor: ActorContext, eventId: string) {
    const overview = await this.repository.overview(actor.id, eventId);
    return { ...overview, missingFields: missingCertificateFields(overview.event) };
  }
}
