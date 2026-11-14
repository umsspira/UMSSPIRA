import { ConnectedNavbar } from '@/shared/components/navbar/index';
import { MyCertificatesController } from '@/features/event-certificates/my-certificates-controller';
import '@/app/(dashboard)/events/events.css';

export default function Page() {
  return (
    <>
      <ConnectedNavbar />
      <div className="events-app">
        <MyCertificatesController />
      </div>
    </>
  );
}
