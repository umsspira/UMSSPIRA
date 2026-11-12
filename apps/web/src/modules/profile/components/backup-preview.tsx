'use client';

// Contenido del visor de respaldos (HU-10, HU-18): solo dibuja el archivo.
// Va en su propio componente para que el zoom (T21.7) lo envuelva sin tocar el modal.
type BackupPreviewProps = {
  url: string;
  title: string;
  isLoaded: boolean;
  onLoad: () => void;
  onError: () => void;
};

export function BackupPreview({ url, title, isLoaded, onLoad, onError }: BackupPreviewProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- el enlace firmado vence, no se optimiza con next/image
    <img
      src={url}
      alt={`Respaldo de ${title}`}
      onLoad={onLoad}
      onError={onError}
      className={`max-h-[60dvh] w-full rounded-lg object-contain sm:max-h-[70vh] ${isLoaded ? '' : 'hidden'}`}
    />
  );
}
