import ProfileSummary from '@/modules/profile/ver/profile-summary';

// ?guardado=1 llega desde «Guardar perfil profesional» y muestra «Se guardó correctamente» (HU-21, CA-01)
export default function ProfilePage({ searchParams }: { searchParams?: { guardado?: string } }) {
  return <ProfileSummary showSavedNotice={searchParams?.guardado === '1'} />;
}
