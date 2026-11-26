
import { CertificateFileError, fetchCertificatePdf } from './certificate-file-service';
import {
  loadMyCertificates,
  resolveMyCertificatePdfEndpoint,
} from './my-certificates-api';

export async function loadMyCertificateDetail(
  certificateId: string,
  signal: AbortSignal,
) {
  const certificates = await loadMyCertificates(signal);

  const certificate = certificates.find(
    (item) => item.id === certificateId,
  );

  if (!certificate) {
    throw new CertificateFileError(
      404,
      'El certificado solicitado no está disponible.',
    );
  }

  const pdf = await fetchCertificatePdf(
    resolveMyCertificatePdfEndpoint(certificateId),
    signal,
  );

  return {
    id: certificate.id,
    eventName: certificate.eventName,
    participationDate: certificate.participationDate,
    pdf,
  };
}
