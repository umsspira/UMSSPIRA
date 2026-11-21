import { authenticatedFetch } from '@/shared/services/auth-session';

export interface CvInfo {
  hasFile: boolean;
  name: string | null;
  sizeBytes: number | null;
  uploadedAt: string | null;
}

export const NO_CV: CvInfo = { hasFile: false, name: null, sizeBytes: null, uploadedAt: null };

/**
 * Error de subida con el código HTTP y el código de la API, para elegir el mensaje del CA:
 * INVALID_CV_TYPE → CA-03, CV_TOO_LARGE o 413 → CA-04.
 */
export class CvUploadError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string | null = null,
  ) {
    super(`No se pudo subir el CV (${status})`);
    this.name = 'CvUploadError';
  }
}

/** Lee el bloque «cv» de GET /api/v1/perfil: tieneArchivo, nombre, tamanio, fechaSubida. */
export function mapCv(body: unknown): CvInfo {
  const data = typeof body === 'object' && body !== null && 'data' in body
    ? (body as { data?: Record<string, unknown> }).data
    : undefined;
  const cv = data?.cv;
  if (typeof cv !== 'object' || cv === null) return NO_CV;
  const raw = cv as Record<string, unknown>;
  if (raw.tieneArchivo !== true) return NO_CV;
  return {
    hasFile: true,
    name: typeof raw.nombre === 'string' ? raw.nombre : null,
    sizeBytes: typeof raw.tamanio === 'number' ? raw.tamanio : null,
    uploadedAt: typeof raw.fechaSubida === 'string' ? raw.fechaSubida : null,
  };
}

/** Código de la API en el cuerpo de error: { error: { code, message } }. */
async function readErrorCode(response: Response): Promise<string | null> {
  try {
    const body = (await response.json()) as { error?: { code?: unknown } };
    return typeof body?.error?.code === 'string' ? body.error.code : null;
  } catch {
    return null;
  }
}

export async function loadCv(): Promise<CvInfo> {
  const response = await authenticatedFetch('/api/v1/perfil', { cache: 'no-store' });
  if (!response.ok) throw new Error('No se pudo cargar el CV.');
  return mapCv(await response.json());
}

/** PUT multipart con el campo «archivo». No se fija Content-Type: el navegador agrega el boundary. */
export async function uploadCv(file: File): Promise<void> {
  const form = new FormData();
  form.append('archivo', file);
  const response = await authenticatedFetch('/api/v1/perfil/cv', { method: 'PUT', body: form });
  if (!response.ok) throw new CvUploadError(response.status, await readErrorCode(response));
}

/** Pide el CV propio (GET /api/v1/perfil/cv) con la sesión y devuelve una URL local para abrirlo. */
export async function getMyCvUrl(): Promise<string> {
  const response = await authenticatedFetch('/api/v1/perfil/cv', { cache: 'no-store' });
  if (!response.ok) throw new Error('No se pudo abrir el CV.');
  const blob = await response.blob();
  return URL.createObjectURL(blob.type ? blob : new Blob([blob], { type: 'application/pdf' }));
}
