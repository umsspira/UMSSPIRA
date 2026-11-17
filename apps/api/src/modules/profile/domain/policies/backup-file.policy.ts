import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';

// Respaldo de certificación (HU-18): foto JPG o documento PDF de hasta 5 MB
export const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
export const BACKUP_FILE_MESSAGE = 'Solo se aceptan archivos PDF o JPG de hasta 5 MB';

export type BackupMime = 'image/jpeg' | 'application/pdf';

// Se revisan la extensión y los primeros bytes: el tipo que manda el navegador se puede falsear
export function validateBackupFile(name: string, bytes: Uint8Array): BackupMime {
  const extension = name.toLowerCase().split('.').pop() ?? '';
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  // Todo PDF empieza con "%PDF-"
  const isPdf = [0x25, 0x50, 0x44, 0x46, 0x2d].every((value, index) => bytes[index] === value);
  const mime: BackupMime | null =
    isJpeg && ['jpg', 'jpeg'].includes(extension)
      ? 'image/jpeg'
      : isPdf && extension === 'pdf'
        ? 'application/pdf'
        : null;
  if (!mime || bytes.length > MAX_BACKUP_BYTES) {
    throw new BusinessRuleError('invalid', 'INVALID_BACKUP', BACKUP_FILE_MESSAGE);
  }
  return mime;
}

// Tipo guardado en certificacion_respaldo: el enum ya tiene DOCUMENTO, no hace falta migración
export function backupKind(mime: string): 'FOTO' | 'DOCUMENTO' {
  return mime === 'application/pdf' ? 'DOCUMENTO' : 'FOTO';
}
