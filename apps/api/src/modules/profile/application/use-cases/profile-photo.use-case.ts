import type { ActorContext } from '../../../../shared/security/contexts/actor-context';
import type { UploadedFileData } from '../../../../shared/files/contracts/uploaded-file';
import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';
import { PROFILE_PHOTO_MESSAGE, validateProfilePhoto } from '../../domain/policies/profile-photo.policy';
import type { ProfileRepository } from '../ports/profile-repository.port';
import { profileScope } from '../services/profile-scope';

// HU-16 (T16.2): guarda o reemplaza la foto del titulado autenticado
export class SaveProfilePhotoUseCase {
  constructor(private readonly repository: ProfileRepository) {}

  async execute(actor: ActorContext, file?: UploadedFileData) {
    const scope = profileScope(actor);
    if (!file) {
      throw new BusinessRuleError('invalid', 'PROFILE_PHOTO_REQUIRED', PROFILE_PHOTO_MESSAGE);
    }
    const mime = validateProfilePhoto(file.buffer);
    await this.repository.savePhoto(scope, { mime, bytes: file.buffer, size: file.buffer.length });
  }
}

// HU-16 (T16.2): devuelve la foto del titulado autenticado; 404 si no tiene
export class ReadProfilePhotoUseCase {
  constructor(private readonly repository: ProfileRepository) {}

  async execute(actor: ActorContext) {
    return this.repository.readPhoto(profileScope(actor));
  }
}
