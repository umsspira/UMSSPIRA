import { ConnectedNavbar } from '@/shared/components/navbar/index';
import { CertificateDetailPage } from '@/features/event-certificates/certificate-detail-page';
import '@/app/(dashboard)/events/events.css';

interface Props {
  params: {
    certificateId: string;
  };
}

export default function CertificateDetailRoute({ params }: Props) {
  // El identificador se recibe desde la URL.
  // Cuando HU18 confirme la API, se usará para consultar
  // exclusivamente el certificado autorizado para el usuario.
  const certificateId = params.certificateId;

  // No consultar todavía: el contrato de HU18 está pendiente.
  // No se debe utilizar el endpoint administrativo de HU17.
  void certificateId;

  return (
    <>
      <ConnectedNavbar />
      <div className="events-app">
        <CertificateDetailPage state="unavailable" />
      </div>
    </>
  );
}
