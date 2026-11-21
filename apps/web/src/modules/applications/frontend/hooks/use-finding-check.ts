'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  fetchFindingChecks,
  saveFindingCheck,
  type FindingAction,
  type HumanFindingCheck,
} from '../services/applications-board.service';

export const STALE_FINDING_MESSAGE = 'La solicitud cambió; actualiza el expediente.';

export interface UseFindingCheckOptions {
  applicationId: string;
  expectedVersion?: number;
  currentAuthor?: string;
  onSaved?: (check: HumanFindingCheck) => void;
  onRefreshNeeded?: () => void;
}

export interface SaveCheckPayload {
  field: string;
  action: FindingAction;
  verifiedValue?: string;
  reason?: string;
}

export function useFindingCheck({
  applicationId,
  expectedVersion,
  currentAuthor,
  onSaved,
  onRefreshNeeded,
}: UseFindingCheckOptions) {
  const [checks, setChecks] = useState<Record<string, HumanFindingCheck>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);

  const clearError = useCallback(() => {
    setError(null);
    setStale(false);
  }, []);

  const loadChecks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchFindingChecks(applicationId);
      if (result.ok) {
        const map: Record<string, HumanFindingCheck> = {};
        for (const item of result.data) {
          map[item.field] = item;
        }
        setChecks(map);
      } else {
        setError(result.message);
      }
    } catch {
      setError('No se pudieron cargar las comprobaciones de hallazgos.');
    } finally {
      setIsLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    void loadChecks();
  }, [loadChecks]);

  const saveCheck = useCallback(
    async (payload: SaveCheckPayload): Promise<boolean> => {
      clearError();

      if (stale) {
        setError(STALE_FINDING_MESSAGE);
        return false;
      }

      if (payload.action === 'CORREGIDO' && !payload.verifiedValue?.trim()) {
        setError('Debes ingresar el valor comprobado manualmente.');
        return false;
      }

      if (payload.action === 'NO_VERIFICABLE' && !payload.reason?.trim()) {
        setError('Debes indicar la explicación de por qué no es verificable.');
        return false;
      }

      setIsSaving(true);
      try {
        const result = await saveFindingCheck(
          applicationId,
          {
            field: payload.field,
            action: payload.action,
            verifiedValue: payload.verifiedValue?.trim(),
            reason: payload.reason?.trim(),
            author: currentAuthor,
            expectedVersion,
          },
          expectedVersion,
        );

        if (!result.ok) {
          if (result.status === 409) {
            setStale(true);
            setError(STALE_FINDING_MESSAGE);
            onRefreshNeeded?.();
            return false;
          }
          setError(result.message);
          return false;
        }

        setChecks((prev) => ({
          ...prev,
          [result.data.field]: result.data,
        }));
        onSaved?.(result.data);
        return true;
      } catch {
        setError('Ocurrió un error al guardar la comprobación humana.');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [applicationId, currentAuthor, expectedVersion, onRefreshNeeded, onSaved, stale, clearError],
  );

  const getCheckForField = useCallback(
    (field: string): HumanFindingCheck | undefined => {
      return checks[field];
    },
    [checks],
  );

  return {
    checks,
    isLoading,
    isSaving,
    error,
    stale,
    saveCheck,
    getCheckForField,
    clearError,
    reload: loadChecks,
  };
}
