import { ConnectedNavbar } from '@/shared/components/navbar/index';
import { CertificateDetailController } from '@/features/event-certificates/certificate-detail-controller';
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
        <CertificateDetailController
          certificateId={params.certificateId}
        />
      </div>
    </>
  );
}
