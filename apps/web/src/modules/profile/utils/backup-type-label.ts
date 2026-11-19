import type { BackupType } from '@/modules/profile/utils/validate-backup-file';

// HU-18 (T18.5): nombre corto del tipo de respaldo para Mis registros y el resumen.
// Un respaldo sin tipo es de antes de HU-18, cuando solo se aceptaban fotos JPG.
export function backupTypeLabel(type: BackupType | undefined): 'PDF' | 'Foto' {
  return type === 'pdf' ? 'PDF' : 'Foto';
}
