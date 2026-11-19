import { BACKUP_FILE_MESSAGE, MAX_BACKUP_BYTES, backupKind, validateBackupFile } from './backup-file.policy';

const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
const pdf = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);

describe('validateBackupFile (HU-18)', () => {
  it('acepta una foto JPG', () => {
    expect(validateBackupFile('foto.JPG', jpeg)).toBe('image/jpeg');
  });

  it('acepta un documento PDF', () => {
    expect(validateBackupFile('titulo.pdf', pdf)).toBe('application/pdf');
  });

  it('rechaza otro formato aunque la extensión diga pdf', () => {
    expect(() => validateBackupFile('falso.pdf', Uint8Array.from([0x89, 0x50, 0x4e, 0x47]))).toThrow(
      BACKUP_FILE_MESSAGE,
    );
  });

  it('rechaza un archivo de más de 5 MB', () => {
    const grande = new Uint8Array(MAX_BACKUP_BYTES + 1);
    grande.set(pdf);
    expect(() => validateBackupFile('grande.pdf', grande)).toThrow(BACKUP_FILE_MESSAGE);
  });

  it('guarda el PDF como DOCUMENTO y la foto como FOTO', () => {
    expect(backupKind('application/pdf')).toBe('DOCUMENTO');
    expect(backupKind('image/jpeg')).toBe('FOTO');
  });
});
