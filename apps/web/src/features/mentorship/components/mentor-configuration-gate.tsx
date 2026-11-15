'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRightIcon, ListChecksIcon } from 'lucide-react';
import { MentorConfiguration } from './mentor-configuration';
import { SecondaryButton } from './mentor-button';
import {
  getMentorOnboarding,
  type MentorOnboardingState,
} from '../services/mentor-onboarding-api';

/**
 * CAF-01/CAF-13: mientras el asistente no termina se muestra un único acceso;
 * las tarjetas de edición aparecen cuando la configuración ya está completa.
 */
export function MentorConfigurationGate() {
  const [state, setState] = useState<MentorOnboardingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    getMentorOnboarding(controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) setState(next);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError('No se pudo consultar el avance de tu configuración.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [attempt]);

  if (loading) {
    return <p role="status" className="onboarding-gate-loading">Cargando configuración…</p>;
  }

  if (error || !state) {
    return (
      <section className="active-panel-settings" aria-labelledby="mentor-configuration-title">
        <h3 id="mentor-configuration-title" className="active-panel-section-title">Configuración del perfil</h3>
        <div role="alert" className="mentor-api-error">
          <p>{error || 'No se pudo consultar el avance de tu configuración.'}</p>
          <SecondaryButton onClick={() => setAttempt((value) => value + 1)}>Reintentar</SecondaryButton>
        </div>
      </section>
    );
  }

  if (state.isComplete) {
    return <MentorConfiguration />;
  }

  const hasProgress = state.completedSteps.length > 0;
  return (
    <section className="active-panel-settings" aria-labelledby="mentor-configuration-title">
      <h3 id="mentor-configuration-title" className="active-panel-section-title">Configuración del perfil</h3>
      <div className="onboarding-gate">
        <span aria-hidden="true" className="onboarding-gate-icon"><ListChecksIcon /></span>
        <div>
          <h4>{hasProgress ? 'Continúa tu configuración' : 'Comienza tu configuración'}</h4>
          <p>
            {hasProgress
              ? `Completaste ${state.completedSteps.length} de ${state.totalSteps} pasos. Retoma el asistente donde lo dejaste.`
              : 'Completa el asistente de tres pasos: áreas técnicas, intereses y disponibilidad.'}
          </p>
        </div>
        <Link href="/mentorship/onboarding" className="mentor-button mentor-button-primary">
          {hasProgress ? 'Continuar mi configuración' : 'Comenzar mi configuración'}
          <ArrowRightIcon className="icon" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
