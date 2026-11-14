import { ConnectedNavbar } from '@/shared/components/navbar/index';
import { MyCertificatesPage } from '@/features/event-certificates/my-certificates-page';
import '@/app/(dashboard)/events/events.css';

export default function Page() {
  return (
    <>
      <ConnectedNavbar />
      <div className="events-app">
        <MyCertificatesPage view={{ status: 'integration-pending' }} />
      </div>
    </>
  );
}
