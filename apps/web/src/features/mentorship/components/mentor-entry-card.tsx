'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRightIcon, UserRoundCogIcon } from 'lucide-react';
import { ActiveMentorRequestsLink } from './active-mentor-requests-link';
import { getMentorProfile } from '../services/mentorship-api';
import {
  getMentorOnboarding,
  type MentorOnboardingState,
} from '../services/mentor-onboarding-api';

export function MentorEntryCard() {
  const [profileActive, setProfileActive] = useState<boolean | null>(null);
  const [onboarding, setOnboarding] = useState<MentorOnboardingState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    getMentorProfile(controller.signal)
      .then(async (profile) => {
        if (controller.signal.aborted) return;
        setProfileActive(profile.isActive);
        if (!profile.isActive) return;
        try {
          const state = await getMentorOnboarding(controller.signal);
          if (!controller.signal.aborted) setOnboarding(state);
        } catch {
          // La tarjeta conserva el acceso al perfil; la API impone la autorización real.
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setProfileActive(false);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const hasProgress = Boolean(onboarding && onboarding.completedSteps.length > 0);
  const isComplete = onboarding?.isComplete === true;

  const action = isComplete
    ? { href: '/mentorship/profile', label: 'Editar mi configuración' }
    : profileActive
      ? {
          href: '/mentorship/onboarding',
          label: hasProgress ? 'Continuar mi configuración' : 'Comenzar mi configuración',
        }
      : { href: '/mentorship/profile', label: 'Configurar mi perfil de mentor' };

  return (
    <article className="mentor-card">
      <span aria-hidden="true" className="mentor-card-icon mentor-card-icon-primary">
        <UserRoundCogIcon className="icon-lg" />
      </span>
      <h2 className="mentor-card-title">Comparte tu experiencia</h2>
      <p className="mentor-card-description">
        {profileActive
          ? isComplete
            ? 'Tu perfil de mentor está completo. Puedes editar cada sección desde tu perfil.'
            : 'Completa el asistente de configuración para elegir tus áreas, intereses y disponibilidad.'
          : 'Activa tu participación como mentor y configura las áreas e intereses en los que deseas orientar a otros miembros de la comunidad.'}
      </p>
      <div className="mentor-card-actions">
        <Link
          href={action.href}
          className="mentor-button mentor-button-primary mentor-card-button"
          aria-busy={loading || undefined}
        >
          {loading ? 'Cargando…' : action.label}
          <ArrowRightIcon className="icon" aria-hidden="true" />
        </Link>
        <ActiveMentorRequestsLink />
        <p aria-hidden="true" className="mentor-card-notice" />
      </div>
    </article>
  );
}
