import { apiFetch, ApiError } from '@/shared/services/api-client';

/**
 * T3.4 — Ruta provisional pendiente de acordar con T3.1 (backend).
 * La API real de encuestas todavía no existe en epic9.
 * Centralizarla aquí evita acoplar componentes a un endpoint supuesto.
 */
export const SURVEY_SUBMISSION_PATH = '/api/v1/surveys';
export const SURVEY_SUBMISSION_STATUS_PATH = `${SURVEY_SUBMISSION_PATH}/status`;
export const SURVEY_MY_RESPONSE_PATH = `${SURVEY_SUBMISSION_PATH}/me`;
export const SURVEY_EDIT_PATH = SURVEY_MY_RESPONSE_PATH;

export interface SurveyPersistedAnswer {
  condicion_laboral: boolean;
  cargo: string | null;
  empresa: string | null;
  area: string | null;
  modalidad: string | null;
  salario_mensual: string | null;
  tiempo_insercion: string | null;
  /** HU-006 CA-07: true cuando ya se usó la única edición (lo devuelve la T6.1). */
  edicion_usada?: boolean;
}

export const SURVEY_SENT_MESSAGE = 'Encuesta enviada correctamente';
export const SURVEY_SEND_ERROR_MESSAGE = 'No se pudo enviar la encuesta. Intente nuevamente';

/** Estructura compatible por tipado estructural con el payload de T1.2. */
export interface SurveySubmitInput {
  condicion_laboral: boolean;
  /** Se incluye solo si el contrato final de T3.1 lo requiere en el body. */
  id_encuesta?: string;
  cargo?: string;
  empresa?: string;
  area?: string;
  modalidad?: string;
  salario_mensual?: string;
  tiempo_insercion?: string;
}

export interface SurveyStatusInfo {
  submitted: boolean;
  hasActiveSurvey: boolean;
  surveyId: string | null;
}

export async function getSurveyStatusInfo(): Promise<SurveyStatusInfo> {
  // apiFetch ya desenvuelve la propiedad data de la respuesta HTTP.
  const response = await apiFetch<{
    submitted: boolean;
    hasActiveSurvey?: boolean;
    surveyId?: string | null;
  }>(SURVEY_SUBMISSION_STATUS_PATH, { method: 'GET', cache: 'no-store' });

  if (typeof response?.submitted !== 'boolean') {
    throw new Error('No se pudo verificar el estado de la encuesta');
  }

  return {
    submitted: response.submitted,
    hasActiveSurvey: response.hasActiveSurvey ?? true,
    surveyId: response.surveyId ?? null,
  };
}

export async function getSurveySubmissionStatus(): Promise<boolean> {
  const info = await getSurveyStatusInfo();
  return info.submitted;
}

export async function getMySurveyResponse(): Promise<SurveyPersistedAnswer | null> {
  const response = await apiFetch<{ responded: boolean; response: SurveyPersistedAnswer | null }>(
    SURVEY_MY_RESPONSE_PATH,
    { method: 'GET', cache: 'no-store' },
  );
  if (typeof response?.responded !== 'boolean' || (response.responded && !response.response)) {
    throw new Error('No se pudo leer la respuesta guardada');
  }
  return response.response;
}

/**
 * Defensa en profundidad: si el titulado no trabaja, ninguno de los campos
 * laborales llega a la API aunque otro componente conserve datos obsoletos.
 * T3.1 debe validar/sanitizar nuevamente en el servidor (CA-02/CA-03).
 */
export function buildSurveySubmissionBody(input: SurveySubmitInput): Record<string, string | boolean> {
  if (typeof input.condicion_laboral !== 'boolean') {
    throw new Error('Debe seleccionar su condición laboral');
  }

  const body: Record<string, string | boolean> = {
    condicion_laboral: input.condicion_laboral,
  };
  if (input.id_encuesta !== undefined) body.id_encuesta = input.id_encuesta;
  if (!input.condicion_laboral) return body;

  const fields = [
    'cargo', 'empresa', 'area', 'modalidad', 'salario_mensual', 'tiempo_insercion',
  ] as const;

  for (const field of fields) {
    if (typeof input[field] === 'string') body[field] = input[field];
  }
  return body;
}

/**
 * Usa el cliente autenticado existente (token, renovación y errores HTTP).
 * El 409 significa que esta encuesta ya fue enviada y se presenta como éxito
 * según el CA-04. Cualquier otro error se propaga al hook para mostrar el
 * mensaje de CA-05 sin borrar los datos del formulario.
 */
export async function submitSurvey(
  input: SurveySubmitInput,
): Promise<void> {
  const body = buildSurveySubmissionBody(input);

  try {
    await apiFetch<unknown>(SURVEY_SUBMISSION_PATH, {
      method: 'POST',
      cache: 'no-store',
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) {
      return;
    }

    throw error;
  }
}

export async function updateMySurveyResponse(
  input: SurveySubmitInput,
): Promise<void> {
  const body = buildSurveySubmissionBody(input);

  await apiFetch<unknown>(SURVEY_EDIT_PATH, {
    method: 'PATCH',
    cache: 'no-store',
    body: JSON.stringify(body),
  });
}
