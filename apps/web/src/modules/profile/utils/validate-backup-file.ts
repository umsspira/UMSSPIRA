// Respaldo de un registro (HU-18): foto JPG o documento PDF de hasta 5 MB.
// Mismas reglas que validateBackupFile del backend (apps/api/src/modules/profile/domain/policies/backup-file.policy.ts)
export const BACKUP_FILE_MESSAGE = 'Solo se aceptan archivos PDF o JPG de hasta 5 MB';
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
// Valor del atributo accept de los campos de respaldo
export const BACKUP_ACCEPT = 'application/pdf,image/jpeg';
// Texto de ayuda bajo los botones de respaldo
export const BACKUP_HINT = 'PDF o JPG, máximo 5 MB';

export type BackupType = 'pdf' | 'image';

const ALLOWED_TYPES: Record<string, { type: BackupType; extensions: string[] }> = {
  'image/jpeg': { type: 'image', extensions: ['.jpg', '.jpeg'] },
  'application/pdf': { type: 'pdf', extensions: ['.pdf'] },
};

// Tipo del respaldo según el archivo; undefined si no es PDF ni JPG
export function backupTypeOf(file: File): BackupType | undefined {
  const allowed = ALLOWED_TYPES[file.type];
  const name = file.name.toLowerCase();
  return allowed?.extensions.some((extension) => name.endsWith(extension)) ? allowed.type : undefined;
}

// El atributo accept se puede saltar eligiendo "Todos los archivos", por eso se revisa aquí.
// Devuelve el mensaje de error o undefined si el archivo es válido
export function validateBackupFile(file: File): string | undefined {
  if (!backupTypeOf(file) || file.size > MAX_BACKUP_BYTES) return BACKUP_FILE_MESSAGE;
  return undefined;
}
