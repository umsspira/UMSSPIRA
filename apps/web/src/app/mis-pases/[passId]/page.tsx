import { ConnectedNavbar } from '@/shared/components/navbar/index';
import EventPassDetailPage from '@/features/event-passes/event-pass-detail-page';
import '@/app/(dashboard)/events/events.css';

export default function PassDetailRoute({
  params,
  searchParams,
}: {
  params: { passId: string };
  searchParams: { from?: string };
}) {
  const backHref = searchParams.from === 'catalog' ? '/events/catalog/passes' : '/mis-pases';
  return (
    <>
      <ConnectedNavbar />
      <div className="events-app">
        <EventPassDetailPage passId={params.passId} backHref={backHref} />
      </div>
    </>
  );
}
