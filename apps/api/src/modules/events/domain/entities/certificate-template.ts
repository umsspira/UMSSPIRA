export type CertificateTemplateStatus = 'NO_CONFIGURADO' | 'EN_CONFIGURACION' | 'HABILITADO';

export type CertificateTemplateVersion = 'active' | 'pending';

export type CertificateField = 'TITULADO_NAME' | 'EVENT_NAME' | 'EVENT_DATE';

export interface CertificateTemplateEvent {
  id: string;
  title: string | null;
  startDate: Date | null;
  location: string | null;
}

export interface CertificateTemplateFile {
  id: string;
  name: string;
  size: number;
  uploadedAt: Date;
  activatedAt: Date | null;
}

export interface CertificateTemplateOverview {
  event: CertificateTemplateEvent;
  status: CertificateTemplateStatus;
  active: CertificateTemplateFile | null;
  pending: CertificateTemplateFile | null;
}
