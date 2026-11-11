import { BACKUP_FILE_MESSAGE, MAX_BACKUP_BYTES, backupTypeOf, validateBackupFile } from './validate-backup-file';

function file(name: string, type: string, size = 10) {
  const result = new File(['x'], name, { type });
  Object.defineProperty(result, 'size', { value: size });
  return result;
}

describe('validateBackupFile (HU-18)', () => {
  it('acepta PDF y JPG de hasta 5 MB', () => {
    expect(validateBackupFile(file('titulo.pdf', 'application/pdf', MAX_BACKUP_BYTES))).toBeUndefined();
    expect(validateBackupFile(file('foto.jpg', 'image/jpeg'))).toBeUndefined();
  });

  it('rechaza otro formato o más de 5 MB con el mismo mensaje', () => {
    expect(validateBackupFile(file('foto.png', 'image/png'))).toBe(BACKUP_FILE_MESSAGE);
    expect(validateBackupFile(file('titulo.pdf', 'application/pdf', MAX_BACKUP_BYTES + 1))).toBe(BACKUP_FILE_MESSAGE);
  });

  it('indica si el respaldo es PDF o foto', () => {
    expect(backupTypeOf(file('titulo.pdf', 'application/pdf'))).toBe('pdf');
    expect(backupTypeOf(file('foto.jpeg', 'image/jpeg'))).toBe('image');
    expect(backupTypeOf(file('falso.pdf', 'image/jpeg'))).toBeUndefined();
  });
});
