import { randomUUID } from 'node:crypto';
import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { UploadedFileData } from '../../../../shared/files/contracts/uploaded-file';
import { safeFileName } from '../../../../shared/files/policies/image-file.policy';
import { validateBackupFile } from '../../domain/policies/backup-file.policy';
import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';
import type { ProfileRepository } from '../ports/profile-repository.port';
import { profileScope } from '../services/profile-scope';

export class UploadCertificationBackupUseCase {
  constructor(private readonly repository: ProfileRepository) {}

  async execute(actor: ActorContext, id: string, file?: UploadedFileData) {
    const scope = profileScope(actor);
    if (!file) {
      throw new BusinessRuleError(
        'invalid',
        'BACKUP_REQUIRED',
        'Adjunta el respaldo PDF o JPG de la certificación',
      );
    }
    // HU-18: PDF o JPG de hasta 5 MB; si ya había respaldo, el repositorio lo reemplaza en el mismo registro
    const mime = validateBackupFile(file.originalname, file.buffer);
    return this.repository.saveBackup(scope, id, {
      id: randomUUID(),
      name: safeFileName(file.originalname),
      mime,
      bytes: file.buffer,
      size: file.buffer.length,
    });
  }
}
