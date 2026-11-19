import {
  MAX_PROFILE_PHOTO_BYTES,
  getProfileInitials,
  isValidProfilePhoto,
} from './profile-photo-rules';

function createFile(type: string, size: number): File {
  const file = new File(['x'], 'foto', { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('isValidProfilePhoto', () => {
  it('acepta un JPG de hasta 5 MB', () => {
    expect(isValidProfilePhoto(createFile('image/jpeg', MAX_PROFILE_PHOTO_BYTES))).toBe(true);
  });

  it('rechaza un archivo que no es JPG', () => {
    expect(isValidProfilePhoto(createFile('image/png', 1024))).toBe(false);
  });

  it('rechaza un JPG de más de 5 MB', () => {
    expect(isValidProfilePhoto(createFile('image/jpeg', MAX_PROFILE_PHOTO_BYTES + 1))).toBe(false);
  });
});

describe('getProfileInitials', () => {
  it('usa la primera letra de las dos primeras palabras', () => {
    expect(getProfileInitials('francisco lazarte rojas')).toBe('FL');
  });

  it('devuelve un signo cuando no hay nombre', () => {
    expect(getProfileInitials('   ')).toBe('?');
  });
});