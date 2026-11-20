
import { ConnectedNavbar } from '@/shared/components/navbar/index';
import { ConnectedMyCertificates } from '@/features/event-certificates/connected-my-certificates';
import '@/app/(dashboard)/events/events.css';

export default function Page() {
  return (
    <>
      <ConnectedNavbar />
      <div className="events-app">
        <ConnectedMyCertificates />
      </div>
    </>
  );
}
