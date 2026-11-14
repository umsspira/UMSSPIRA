'use client';

import { useCallback, useRef, useState } from 'react';
import { ApiError } from '@/shared/services/api-client';
import {
  updateMySurveyResponse,
  type SurveySubmitInput,
} from '../services/surveys.service';

export type SurveyEditStatus = 'idle' | 'success' | 'error';

export type SurveyEditErrorKind =
  | 'already-edited'
  | 'expired'
  | 'connection'
  | 'http'
  | null;

export function useSurveyEdit() {
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<SurveyEditStatus>('idle');
  const [errorKind, setErrorKind] =
    useState<SurveyEditErrorKind>(null);

  const inFlight = useRef(false);

  const saveChanges = useCallback(
    async (values: SurveySubmitInput): Promise<boolean> => {
      if (inFlight.current) return false;

      inFlight.current = true;
      setIsSaving(true);
      setStatus('idle');
      setErrorKind(null);

      try {
        await updateMySurveyResponse(values);

        setStatus('success');
        return true;
      } catch (error) {
        if (error instanceof ApiError) {
          if (error.status === 409) {
            setErrorKind('already-edited');
          } else if (error.status === 410) {
            setErrorKind('expired');
          } else if (error.status === 0) {
            setErrorKind('connection');
          } else {
            setErrorKind('http');
          }
        } else {
          setErrorKind('http');
        }

        setStatus('error');
        return false;
      } finally {
        inFlight.current = false;
        setIsSaving(false);
      }
    },
    [],
  );

  const resetFeedback = useCallback(() => {
    setStatus('idle');
    setErrorKind(null);
  }, []);

  return {
    isSaving,
    status,
    errorKind,
    saveChanges,
    resetFeedback,
  };
}