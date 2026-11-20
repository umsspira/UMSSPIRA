import { readApiError } from '@/shared/services/api-contract';
import { authenticatedFetch } from '@/shared/services/auth-session';

export type CertificateTemplateStatus = 'NO_CONFIGURADO' | 'EN_CONFIGURACION' | 'HABILITADO';
export type CertificateMissingField = 'EVENT_NAME' | 'EVENT_DATE';

export interface CertificateTemplateFileDto {
  id: string;
  fileName: string;
  sizeBytes: number;
  uploadedAt: string;
  activatedAt: string | null;
}

export interface CertificateTemplateDto {
  event: { id: string; title: string | null; startDate: string | null; location: string | null };
  status: CertificateTemplateStatus;
  activeTemplate: CertificateTemplateFileDto | null;
  pendingTemplate: CertificateTemplateFileDto | null;
  missingFields: CertificateMissingField[];
  maxFileBytes: number;
  allowedFormats: string[];
}

export class CertificateTemplateError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'CertificateTemplateError';
  }
}

const base = (eventId: string) =>
  `/api/v1/events/${encodeURIComponent(eventId)}/certificate-template`;

async function request(path: string, init: RequestInit, fallback: string) {
  let response: Response;
  try {
    response = await authenticatedFetch(path, init);
  } catch {
    throw new CertificateTemplateError(
      'No se pudo conectar con el servidor. Revisa tu conexión e intenta nuevamente.',
      0,
    );
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const error = readApiError(body, fallback);
    throw new CertificateTemplateError(error.message, response.status, error.code);
  }
  return (body as { data: CertificateTemplateDto }).data;
}

export function getCertificateTemplate(eventId: string) {
  return request(base(eventId), {}, 'No se pudo consultar la configuración de certificados.');
}

export function uploadCertificateTemplate(eventId: string, file: File) {
  const body = new FormData();
  body.append('file', file);
  return request(base(eventId), { method: 'POST', body }, 'No se pudo cargar la plantilla.');
}

export function confirmCertificateTemplate(eventId: string) {
  return request(
    `${base(eventId)}/confirm`,
    { method: 'POST' },
    'No se pudo guardar la configuración.',
  );
}

/** Abre el PDF guardado en una pestaña nueva (la ruta exige sesión, por eso se descarga como blob). */
export async function openCertificateTemplateFile(
  eventId: string,
  version: 'active' | 'pending',
) {
  const response = await authenticatedFetch(`${base(eventId)}/file?version=${version}`);
  if (!response.ok) {
    throw new CertificateTemplateError('No se pudo abrir el archivo de la plantilla.', response.status);
  }
  const url = URL.createObjectURL(await response.blob());
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
