'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '../services/api-client';
import { applyToJob, getMyJobApplication } from '../services/job-applications';

type ViewState = 'loading' | 'ready' | 'sending' | 'applied' | 'incomplete' | 'unavailable' | 'error';

export function ApplyToVacancyButton({ vacancyId }: { vacancyId: string }) {
  const [state, setState] = useState<ViewState>('loading');
  const [retryApply, setRetryApply] = useState(false);

  const loadStatus = useCallback(async () => {
    setState('loading');
    try {
      const status = await getMyJobApplication(vacancyId);
      setState(status.postulada ? 'applied' : 'ready');
    } catch {
      setRetryApply(false);
      setState('error');
    }
  }, [vacancyId]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function handleApply() {
    setState('sending');
    try {
      await applyToJob(vacancyId);
      setState('applied');
    } catch (error) {
      if (error instanceof ApiError && error.message === 'Completa tu perfil para postularte') {
        setState('incomplete');
      } else if (error instanceof ApiError && error.message === 'Esta vacante ya no está disponible') {
        setState('unavailable');
      } else {
        setRetryApply(true);
        setState('error');
      }
    }
  }

  if (state === 'loading') return <p role="status" className="text-sm text-gray-600">Consultando tu postulación…</p>;
  if (state === 'applied') return <p role="status" className="font-semibold text-emerald-700">Ya te postulaste</p>;
  if (state === 'incomplete') {
    return (
      <div role="alert" className="space-y-2">
        <p>Completa tu perfil para postularte</p>
        <Link className="font-semibold text-blue-fantastic underline" href="/profile/completar">Completar perfil</Link>
      </div>
    );
  }
  if (state === 'unavailable') return <p role="alert">Esta vacante ya no está disponible</p>;
  if (state === 'error') {
    return (
      <div role="alert" className="space-y-2">
        <p>{retryApply ? 'No pudimos registrar tu postulación' : 'No pudimos consultar tu postulación'}</p>
        <button className="font-semibold text-blue-fantastic underline" onClick={() => void (retryApply ? handleApply() : loadStatus())}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => void handleApply()}
      disabled={state === 'sending'}
      className="inline-flex min-h-11 items-center justify-center rounded-lg bg-blue-fantastic px-6 font-semibold text-white transition-colors hover:bg-abyssal-blue disabled:cursor-wait disabled:opacity-60"
    >
      {state === 'sending' ? 'Enviando…' : 'Postularme'}
    </button>
  );
}
