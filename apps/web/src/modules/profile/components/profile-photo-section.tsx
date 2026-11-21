'use client';

import { getProfileInitials } from '@/modules/profile/utils/profile-photo-rules';

type ProfilePhotoSectionProps = {
  name: string;
};

export function ProfilePhotoSection({ name }: ProfilePhotoSectionProps) {
  const displayName = name.trim() || 'Titulado';

  return (
    <section
      aria-labelledby="profile-avatar-title"
      className="flex flex-col gap-4 rounded-2xl border border-oatmeal bg-white p-5 sm:flex-row sm:items-center sm:gap-6"
    >
      <div
        role="img"
        aria-label={`Avatar de ${displayName}`}
        className="mx-auto flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-[#20252B] text-2xl font-semibold text-white sm:mx-0"
      >
        {getProfileInitials(displayName)}
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <h2 id="profile-avatar-title" className="text-lg font-semibold text-blue-fantastic">
          Avatar de perfil
        </h2>
        <p className="text-sm text-blue-fantastic/70">
          Se usan las iniciales de tu nombre en tu avatar.
        </p>
      </div>
    </section>
  );
}
