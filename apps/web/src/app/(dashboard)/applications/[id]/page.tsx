import { Suspense } from 'react';
import { ApplicationDetailPage } from '@/modules/applications/frontend/components/application-detail-page';

interface ApplicationPageProps {
  params: { id: string };
}

export default function ApplicationPage({ params }: ApplicationPageProps) {
  return (
    <Suspense fallback={null}>
      <ApplicationDetailPage applicationId={params.id} />
    </Suspense>
  );
}
