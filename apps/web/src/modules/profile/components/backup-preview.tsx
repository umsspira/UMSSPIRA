'use client';

import type { BackupType } from '@/modules/profile/utils/validate-backup-file';

// Contenido del visor de respaldos (HU-10, HU-18): solo dibuja el archivo.
// Va en su propio componente para que el zoom (T21.7) lo envuelva sin tocar el modal.
type BackupPreviewProps = {
  url: string;
  title: string;
  // Sin tipo se trata como foto, igual que antes de HU-18
  type?: BackupType;
  isLoaded: boolean;
  onLoad: () => void;
  onError: () => void;
};

export function BackupPreview({ url, title, type = 'image', isLoaded, onLoad, onError }: BackupPreviewProps) {
  const hiddenClassName = isLoaded ? '' : 'hidden';

  if (type === 'pdf') {
    // El navegador muestra el PDF con su propio lector dentro del visor
    return (
      <iframe
        src={url}
        title={`Respaldo de ${title}`}
        onLoad={onLoad}
        className={`h-[60dvh] w-full rounded-lg border-0 bg-white sm:h-[70vh] ${hiddenClassName}`}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- el enlace firmado vence, no se optimiza con next/image
    <img
      src={url}
      alt={`Respaldo de ${title}`}
      onLoad={onLoad}
      onError={onError}
      className={`max-h-[60dvh] w-full rounded-lg object-contain sm:max-h-[70vh] ${hiddenClassName}`}
    />
  );
}
