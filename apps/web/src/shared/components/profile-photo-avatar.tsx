import type { ReactNode } from 'react';

export function ProfilePhotoContent({ fallback = null }: { fallback?: ReactNode }) {
  return <>{fallback}</>;
}

export function ProfilePhotoBadge() {
  return null;
}