
'use client';

import { MyCertificatesController } from './my-certificates-controller';
import {
  loadMyCertificates,
  resolveMyCertificatePdfEndpoint,
} from './my-certificates-api';

export function ConnectedMyCertificates() {
  return (
    <MyCertificatesController
      loadCertificates={loadMyCertificates}
      resolvePdfEndpoint={resolveMyCertificatePdfEndpoint}
    />
  );
}
