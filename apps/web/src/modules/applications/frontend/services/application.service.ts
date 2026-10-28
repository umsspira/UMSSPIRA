import { readApiError } from '@/shared/services/api-contract';
import type { CorrectionResult } from '../hooks/use-observed-correction';

const API_BASE_URL = '/api/v1';

export type ResubmitOutcome =
  | { status: 'success' }
  | { status: 'conflict' } // CA-10.5: la solicitud cambió
  | { status: 'invalid-link' }
  | { status: 'expired' }
  | { status: 'error'; message: string };

const CONNECTION_ERROR =
  'No se pudo conectar con el servidor. Tus cambios siguen aquí, intenta nuevamente.';

// TODO: confirmar ruta, formato (multipart o archivo subido aparte) y versión con el backend de HU-10.
// Se envía el token del enlace: el backend resuelve el expediente original y no crea otro (CA-10.4).
export async function resubmitObservedApplication(
  token: string,
  result: CorrectionResult,
): Promise<ResubmitOutcome> {
  const body = new FormData();
  body.append('changes', JSON.stringify(result.values));
  if (result.file) body.append('document', result.file);

  try {
    const response = await fetch(
      `${API_BASE_URL}/applications/corrections/${encodeURIComponent(token)}/submit`,
      { method: 'POST', body },
    );
    if (response.ok) return { status: 'success' };
    if (response.status === 409) return { status: 'conflict' };
    if (response.status === 404) return { status: 'invalid-link' };
    if (response.status === 410) return { status: 'expired' };

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      /* sin cuerpo */
    }
    return {
      status: 'error',
      message: readApiError(
        payload as never,
        'No pudimos entregar tu solicitud. Intenta nuevamente.',
      ).message,
    };
  } catch {
    return { status: 'error', message: CONNECTION_ERROR };
  }
}