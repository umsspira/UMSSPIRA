import { PageLayout } from '@/shared/components/page-layout';
import { MentorshipRequestFlow } from '@/features/mentorship/components/mentorship-request-flow';

export default function MentorshipRequestRoute({ params }: { params: { mentorId: string } }) {
  return (
    <main className="mentorship-shell mentor-availability-shell">
      <PageLayout
        eyebrow="Red universitaria de desarrollo"
        title="Solicitar sesión de mentoría"
        description="Selecciona una fecha y un bloque de una hora. El mentor responderá tu solicitud."
      >
        <MentorshipRequestFlow mentorId={params.mentorId} />
      </PageLayout>
    </main>
  );
}
