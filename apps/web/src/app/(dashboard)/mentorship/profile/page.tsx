import { PageLayout } from '@/shared/components/page-layout';
import { MentorProfile } from '@/features/mentorship/components/mentor-profile';

export default function MentorProfilePage() {
  return (
    <main className="mentorship-shell">
      <PageLayout
        eyebrow="Red universitaria de desarrollo"
        title="Mi perfil de mentor"
        description="Administra la información de tu participación en la red de mentorías."
      >
        <MentorProfile />
      </PageLayout>
    </main>
  );
}
