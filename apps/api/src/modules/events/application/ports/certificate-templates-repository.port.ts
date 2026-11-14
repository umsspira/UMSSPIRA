import type { StoredFile } from '../../../../shared/files/contracts/uploaded-file';
import type {
  CertificateTemplateOverview,
  CertificateTemplateVersion,
} from '../../domain/entities/certificate-template';

export const CERTIFICATE_TEMPLATES_REPOSITORY = Symbol('CERTIFICATE_TEMPLATES_REPOSITORY');

export interface CertificateTemplatesRepository {
  overview(ownerId: string, eventId: string): Promise<CertificateTemplateOverview>;
  savePending(ownerId: string, eventId: string, file: StoredFile): Promise<void>;
  activatePending(ownerId: string, eventId: string): Promise<void>;
  readFile(
    ownerId: string,
    eventId: string,
    version: CertificateTemplateVersion,
  ): Promise<StoredFile>;
}
