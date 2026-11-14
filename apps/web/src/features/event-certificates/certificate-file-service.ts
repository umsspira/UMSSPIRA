import { authenticatedFetch } from '@/shared/services/auth-session';
import { apiUrl } from '@/shared/services/api-contract';

export class CertificateFileError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'CertificateFileError';
  }
}

export async function fetchCertificatePdf(
  endpoint: string,
  signal?: AbortSignal,
): Promise<Blob> {
  // El endpoint será proporcionado por la integración con HU18.
  // No se aceptan URL externas ni rutas fuera del módulo de eventos.
  if (
    !endpoint.startsWith('/api/v1/events/') ||
    endpoint.includes('..') ||
    endpoint.includes('?') ||
    endpoint.includes('#')
  ) {
    throw new Error('Ruta de certificado no válida');
  }

  const response = await authenticatedFetch(apiUrl(endpoint), {
    method: 'GET',
    cache: 'no-store',
    signal,
    headers: {
      Accept: 'application/pdf',
    },
  });

  if (!response.ok) {
    const messages: Record<number, string> = {
      401: 'Tu sesión expiró. Inicia sesión nuevamente.',
      403: 'No tienes permiso para consultar este certificado.',
      404: 'El certificado solicitado no está disponible.',
      503: 'El servicio está temporalmente fuera de servicio.',
    };

    throw new CertificateFileError(
      response.status,
      messages[response.status] ??
        'No fue posible recuperar el certificado.',
    );
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (!contentType.toLowerCase().includes('application/pdf')) {
    throw new CertificateFileError(
      502,
      'El servidor no devolvió un documento PDF válido.',
    );
  }

  const blob = await response.blob();

  if (blob.size === 0) {
    throw new CertificateFileError(
      502,
      'El archivo del certificado está vacío.',
    );
  }

  // Verificar la cabecera PDF para rechazar contenido incorrecto.
  const header = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
  const pdfSignature = [37, 80, 68, 70, 45]; // %PDF-

  if (
    header.length !== pdfSignature.length ||
    !pdfSignature.every((byte, index) => header[index] === byte)
  ) {
    throw new CertificateFileError(
      502,
      'El archivo recibido no tiene un formato PDF válido.',
    );
  }

  return blob;
}

export function downloadCertificatePdf(
  pdf: Blob,
  certificateId: string,
): void {
  const safeId =
    certificateId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80) ||
    'certificado';

  const url = URL.createObjectURL(pdf);
  const link = document.createElement('a');

  link.href = url;
  link.download = `certificado-${safeId}.pdf`;

  document.body.appendChild(link);

  try {
    link.click();
  } finally {
    link.remove();
    // Un pequeño margen permite que el navegador inicie la descarga.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
