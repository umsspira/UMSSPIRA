import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { missingCertificateFields } from '../../domain/policies/certificate-template.policy';
import type { CertificateTemplatesRepository } from '../ports/certificate-templates-repository.port';

export class ConfirmCertificateTemplateUseCase {
  constructor(private readonly repository: CertificateTemplatesRepository) {}

  async execute(actor: ActorContext, eventId: string) {
    const overview = await this.repository.overview(actor.id, eventId);
    if (!overview.pending) {
      throw new BusinessRuleError(
        'missing',
        'TEMPLATE_PENDING_REQUIRED',
        'Selecciona una plantilla válida antes de guardar la configuración',
      );
    }
    const missing = missingCertificateFields(overview.event);
    if (missing.length) {
      throw new BusinessRuleError(
        'invalid',
        'CERTIFICATE_FIELDS_INCOMPLETE',
        'Faltan datos obligatorios del evento para el certificado: ' + missing.join(', '),
      );
    }
    await this.repository.activatePending(actor.id, eventId);
    return this.repository.overview(actor.id, eventId);
  }
}
