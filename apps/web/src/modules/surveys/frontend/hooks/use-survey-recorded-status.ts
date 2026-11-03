'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getMySurveyStatus,
  type SurveyPersistedAnswer,
} from '../services/surveys.service';

export type RecordedSurveyPhase = 'checking' | 'editable' | 'answered' | 'error';

/**
 * La fuente de verdad es la respuesta persistida por la API, no el borrador ni
 * una bandera en localStorage. Ante un fallo de consulta NO habilitamos edición.
 */
export function useSurveyRecordedStatus() {
  const [phase, setPhase] = useState<RecordedSurveyPhase>('checking');
  const [response, setResponse] = useState<SurveyPersistedAnswer | null>(null);
  const [attempt, setAttempt] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    let active = true;
    const controller = new AbortController();
    setPhase('checking');
    setResponse(null);

    void getMySurveyStatus(controller.signal)
      .then((result) => {
        if (!active) return;
        if (result.responded && result.response) {
          setResponse(result.response);
          setPhase('answered');
        } else {
          setPhase('editable');
        }
      })
      .catch(() => {
        if (active) setPhase('error');
      });

    return () => {
      active = false;
      mounted.current = false;
      controller.abort();
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  /**
   * Se invoca después de POST 201 o 409 (CA-04). Bloquea inmediatamente y
   * consulta el valor real del servidor: con 409 puede diferir del borrador.
   * Un error de la lectura posterior jamás vuelve a habilitar el formulario.
   */
  const markSubmitted = useCallback(() => {
    setPhase('answered');
    void getMySurveyStatus()
      .then((result) => {
        if (mounted.current && result.responded && result.response) {
          setResponse(result.response);
        }
      })
      .catch(() => {
        // Ya sabemos que POST terminó en 201 o 409: permanece bloqueado.
      });
  }, []);

  return { phase, response, retry, markSubmitted };
}
