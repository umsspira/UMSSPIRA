import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';

// Foto de perfil (HU-16): solo JPG de hasta 5 MB, el mismo mensaje que muestra el formulario
export const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;
export const PROFILE_PHOTO_MESSAGE = 'La foto debe ser JPG de máximo 5 MB.';

// Se revisan los primeros bytes: el tipo que manda el navegador se puede falsear
export function validateProfilePhoto(bytes: Uint8Array): 'image/jpeg' {
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (!isJpeg || bytes.length > MAX_PROFILE_PHOTO_BYTES) {
    throw new BusinessRuleError('invalid', 'INVALID_PROFILE_PHOTO', PROFILE_PHOTO_MESSAGE);
  }
  return 'image/jpeg';
}
