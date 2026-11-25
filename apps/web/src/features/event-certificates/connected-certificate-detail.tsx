
'use client';

import { CertificateDetailController } from './certificate-detail-controller';
import { loadMyCertificateDetail } from './my-certificate-detail-api';

interface Props {
  certificateId: string;
}

export function ConnectedCertificateDetail({
  certificateId,
}: Props) {
  return (
    <CertificateDetailController
      certificateId={certificateId}
      loadCertificate={loadMyCertificateDetail}
    />
  );
}
