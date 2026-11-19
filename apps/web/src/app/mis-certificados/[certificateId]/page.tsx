
import { ConnectedNavbar } from '@/shared/components/navbar/index';
import { ConnectedCertificateDetail } from '@/features/event-certificates/connected-certificate-detail';
import '@/app/(dashboard)/events/events.css';

interface Props {
  params: {
    certificateId: string;
  };
}

export default function CertificateDetailRoute({
  params,
}: Props) {
  return (
    <>
      <ConnectedNavbar />

      <div className="events-app">
        <ConnectedCertificateDetail
          certificateId={params.certificateId}
        />
      </div>
    </>
  );
}
