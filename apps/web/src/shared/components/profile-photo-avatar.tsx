'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';

import { useProfilePhotoStore } from '@/shared/hooks/use-profile-photo-store';

// Contenido de un avatar circular: la foto de perfil guardada o, si no hay,
// el contenido de respaldo (las iniciales). Se actualiza al instante cuando
// Mis registros guarda una foto nueva, porque lee el estado compartido.
export function ProfilePhotoContent({ fallback = null }: { fallback?: ReactNode }) {
  const photoUrl = useProfilePhotoStore((state) => state.photoUrl);
  const loadPhoto = useProfilePhotoStore((state) => state.loadPhoto);

  useEffect(() => {
    void loadPhoto();
  }, [loadPhoto]);

  if (!photoUrl) return <>{fallback}</>;
  // La foto es una URL local (blob:), por eso se usa img y no next/image.
  // El alt va vacío porque el avatar es decorativo: el botón que lo contiene ya tiene nombre.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={photoUrl} alt="" className="h-full w-full rounded-full object-cover" />;
}

// Círculo pequeño con solo la foto, para encabezados que no tienen avatar con iniciales.
// Sin foto guardada no dibuja nada.
export function ProfilePhotoBadge({ className = '' }: { className?: string }) {
  const photoUrl = useProfilePhotoStore((state) => state.photoUrl);
  const loadPhoto = useProfilePhotoStore((state) => state.loadPhoto);

  useEffect(() => {
    void loadPhoto();
  }, [loadPhoto]);

  if (!photoUrl) return null;
  return (
    <span
      data-testid="profile-photo-badge"
      className={`inline-block h-8 w-8 shrink-0 overflow-hidden rounded-full border border-burning-flame ${className}`}
    >
      <ProfilePhotoContent />
    </span>
  );
}