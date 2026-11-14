import { ConnectedNavbar } from '@/shared/components/navbar/index';
import { CertificateDetailPage } from '@/features/event-certificates/certificate-detail-page';
import '@/app/(dashboard)/events/events.css';

export default function Page() {
  return (
    <>
      <ConnectedNavbar />
      <div className="events-app">
        <CertificateDetailPage state="unavailable" />
      </div>
    </>
  );
}
