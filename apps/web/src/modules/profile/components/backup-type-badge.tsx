import { FileText, Image as ImageIcon } from 'lucide-react';

import { backupTypeLabel } from '@/modules/profile/utils/backup-type-label';
import type { BackupType } from '@/modules/profile/utils/validate-backup-file';

// Etiqueta con ícono que indica si el respaldo es un PDF o una foto (HU-18, T18.5)
export function BackupTypeBadge({ type }: { type?: BackupType }) {
  const label = backupTypeLabel(type);
  const Icon = type === 'pdf' ? FileText : ImageIcon;
  return (
    <span className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full bg-palladian px-2 py-0.5 text-[11px] font-semibold text-truffle-trouble">
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  );
}
