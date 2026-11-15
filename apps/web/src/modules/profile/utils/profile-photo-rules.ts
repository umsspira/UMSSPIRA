// Reglas de la foto de perfil (HU-16): solo JPG y hasta 5 MB
export const PROFILE_PHOTO_MIME_TYPE = 'image/jpeg';
export const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;
export const PROFILE_PHOTO_ERROR_MESSAGE = 'Solo JPG, máximo 5 MB';

export function isValidProfilePhoto(file: File): boolean {
  return file.type === PROFILE_PHOTO_MIME_TYPE && file.size <= MAX_PROFILE_PHOTO_BYTES;
}

// Iniciales del avatar: primera letra de las dos primeras palabras del nombre
export function getProfileInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
  return initials || '?';
}