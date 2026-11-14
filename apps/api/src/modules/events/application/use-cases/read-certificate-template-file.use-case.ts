import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { CertificateTemplateVersion } from '../../domain/entities/certificate-template';
import type { CertificateTemplatesRepository } from '../ports/certificate-templates-repository.port';

export class ReadCertificateTemplateFileUseCase {
  constructor(private readonly repository: CertificateTemplatesRepository) {}

  async execute(actor: ActorContext, eventId: string, version: CertificateTemplateVersion) {
    return this.repository.readFile(actor.id, eventId, version);
  }
}
