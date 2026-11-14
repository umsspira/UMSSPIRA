export interface EventCertificate {
  id: string;
  eventName: string;
  participationDate: string;
}

export type CertificatesView =
  | { status: 'loading' }
  | { status: 'integration-pending' }
  | { status: 'success'; certificates: EventCertificate[] }
  | { status: 'error'; message: string }
  | { status: 'unauthenticated' };
