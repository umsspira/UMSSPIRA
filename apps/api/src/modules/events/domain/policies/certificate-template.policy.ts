import { BusinessRuleError } from '../../../../shared/errors/business-rule-error';
import type { CertificateTemplateEvent } from '../entities/certificate-template';

export const MAX_CERTIFICATE_TEMPLATE_BYTES = 5 * 1024 * 1024;
export const CERTIFICATE_TEMPLATE_MIME = 'application/pdf';

function invalid(code: string, message: string): never {
  throw new BusinessRuleError('invalid', code, message);
}

/** Valida que el archivo sea un PDF no vacío, íntegro y de tamaño permitido. Devuelve su MIME. */
export function validateCertificateTemplate(name: string, bytes: Uint8Array): string {
  if (!bytes.length) {
    invalid('TEMPLATE_EMPTY', 'El archivo está vacío. Selecciona un PDF válido.');
  }
  if (bytes.length > MAX_CERTIFICATE_TEMPLATE_BYTES) {
    invalid('TEMPLATE_TOO_LARGE', 'El archivo supera el límite de 5 MB.');
  }
  const header = Buffer.from(bytes.subarray(0, 5)).toString('latin1');
  if (!name.toLowerCase().endsWith('.pdf') || header !== '%PDF-') {
    invalid('TEMPLATE_FORMAT_NOT_ALLOWED', 'Formato no admitido. Adjunta un archivo PDF.');
  }
  const tail = Buffer.from(bytes.subarray(Math.max(0, bytes.length - 1024))).toString('latin1');
  if (!tail.includes('%%EOF')) {
    invalid('TEMPLATE_DAMAGED', 'El archivo PDF está dañado o incompleto.');
  }
  return CERTIFICATE_TEMPLATE_MIME;
}

/**
 * Datos variables que el sistema completará. El nombre del Titulado lo aporta cada participante
 * al emitir; el nombre y la fecha deben existir en el evento.
 */
export function missingCertificateFields(
  event: Pick<CertificateTemplateEvent, 'title' | 'startDate'>,
): Array<'EVENT_NAME' | 'EVENT_DATE'> {
  const missing: Array<'EVENT_NAME' | 'EVENT_DATE'> = [];
  if (!event.title?.trim()) {
    missing.push('EVENT_NAME');
  }
  if (!event.startDate) {
    missing.push('EVENT_DATE');
  }
  return missing;
}
