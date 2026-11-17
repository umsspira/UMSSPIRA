import { randomUUID } from 'node:crypto';
import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';
import type { UploadedFileData } from '../../../../shared/files/contracts/uploaded-file';
import { safeFileName } from '../../../../shared/files/policies/image-file.policy';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import { validateCertificateTemplate } from '../../domain/policies/certificate-template.policy';
import type { CertificateTemplatesRepository } from '../ports/certificate-templates-repository.port';

export class UploadCertificateTemplateUseCase {
  constructor(private readonly repository: CertificateTemplatesRepository) {}

  async execute(actor: ActorContext, eventId: string, file?: UploadedFileData) {
    if (!file) {
      throw new BusinessRuleError('invalid', 'TEMPLATE_REQUIRED', 'Adjunta un archivo PDF');
    }
    // Se valida antes de tocar la base: si falla, la configuración anterior no cambia.
    const mime = validateCertificateTemplate(file.originalname, file.buffer);
    await this.repository.savePending(actor.id, eventId, {
      id: randomUUID(),
      name: safeFileName(file.originalname),
      mime,
      bytes: file.buffer,
      size: file.buffer.length,
    });
  }
}
