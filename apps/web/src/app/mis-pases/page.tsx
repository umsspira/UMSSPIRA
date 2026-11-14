import { ConnectedNavbar } from '@/shared/components/navbar/index';
import MyQrPassesPage from '@/features/event-passes/my-qr-passes-page';
import '@/app/(dashboard)/events/events.css';

export default function MyPassesPage() {
  return (
    <>
      <ConnectedNavbar />
      <div className="events-app">
        <MyQrPassesPage passesHref="/mis-pases" />
      </div>
    </>
  );
}
