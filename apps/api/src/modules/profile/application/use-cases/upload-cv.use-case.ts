import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { UploadedFileData } from '../../../../shared/files/contracts/uploaded-file';
import { safeFileName } from '../../../../shared/files/policies/image-file.policy';
import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';
import { validateCvFile } from '../../domain/policies/cv-file.policy';
import type { ProfileRepository } from '../ports/profile-repository.port';
import { profileScope } from '../services/profile-scope';

export class UploadCvUseCase {
  constructor(private readonly repository: ProfileRepository) {}

  async execute(actor: ActorContext, file?: UploadedFileData) {
    const scope = profileScope(actor);
    if (!file) {
      throw new BusinessRuleError('invalid', 'CV_REQUIRED', 'Adjunta tu CV en formato PDF');
    }
    validateCvFile(file.originalname, file.buffer);
    const saved = await this.repository.saveCv(scope, {
      name: safeFileName(file.originalname),
      mime: 'application/pdf',
      bytes: file.buffer,
      size: file.buffer.length,
      uploadedAt: new Date(),
    });
    return {
      name: saved.name,
      size: saved.size,
      uploadedAt: saved.uploadedAt,
      replaced: saved.replaced,
    };
  }
}
