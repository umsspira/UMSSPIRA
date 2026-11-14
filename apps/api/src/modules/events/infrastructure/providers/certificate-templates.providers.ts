import type { Provider } from '@nestjs/common';
import {
  CERTIFICATE_TEMPLATES_REPOSITORY,
  type CertificateTemplatesRepository,
} from '../../application/ports/certificate-templates-repository.port';
import { ConfirmCertificateTemplateUseCase } from '../../application/use-cases/confirm-certificate-template.use-case';
import { GetCertificateTemplateUseCase } from '../../application/use-cases/get-certificate-template.use-case';
import { ReadCertificateTemplateFileUseCase } from '../../application/use-cases/read-certificate-template-file.use-case';
import { UploadCertificateTemplateUseCase } from '../../application/use-cases/upload-certificate-template.use-case';
import { PrismaCertificateTemplatesRepository } from '../repositories/prisma-certificate-templates.repository';

export const certificateTemplatesProviders: Provider[] = [
  PrismaCertificateTemplatesRepository,
  {
    provide: CERTIFICATE_TEMPLATES_REPOSITORY,
    useExisting: PrismaCertificateTemplatesRepository,
  },
  {
    provide: GetCertificateTemplateUseCase,
    inject: [CERTIFICATE_TEMPLATES_REPOSITORY],
    useFactory: (repository: CertificateTemplatesRepository) =>
      new GetCertificateTemplateUseCase(repository),
  },
  {
    provide: UploadCertificateTemplateUseCase,
    inject: [CERTIFICATE_TEMPLATES_REPOSITORY],
    useFactory: (repository: CertificateTemplatesRepository) =>
      new UploadCertificateTemplateUseCase(repository),
  },
  {
    provide: ConfirmCertificateTemplateUseCase,
    inject: [CERTIFICATE_TEMPLATES_REPOSITORY],
    useFactory: (repository: CertificateTemplatesRepository) =>
      new ConfirmCertificateTemplateUseCase(repository),
  },
  {
    provide: ReadCertificateTemplateFileUseCase,
    inject: [CERTIFICATE_TEMPLATES_REPOSITORY],
    useFactory: (repository: CertificateTemplatesRepository) =>
      new ReadCertificateTemplateFileUseCase(repository),
  },
];
