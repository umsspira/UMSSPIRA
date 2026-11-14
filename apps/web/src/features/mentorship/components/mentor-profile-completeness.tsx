'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2Icon, CircleIcon } from 'lucide-react';
import { getMentorProfile } from '../services/mentorship-api';
import { getMentorAreas } from '../services/mentor-areas-api';
import { getMentorInterests } from '../services/mentor-interests-api';
import { getMentorAvailability } from '../services/mentor-availability-api';
import { getMentorProfileInformation } from '../services/mentor-profile-info-api';
import { SecondaryButton } from './mentor-button';

type Completion = { participation: boolean; areas: boolean; interests: boolean; availability: boolean; information: boolean };
export type MentorProfileCompletion = Completion;

const sections: { key: keyof Completion; label: string; href: string }[] = [
  { key: 'participation', label: 'Participación como mentor', href: '/mentorship/profile#first-incomplete' },
  { key: 'areas', label: 'Áreas técnicas', href: '/mentorship/profile/areas#first-incomplete' },
  { key: 'interests', label: 'Intereses de mentoría', href: '/mentorship/profile/interests#first-incomplete' },
  { key: 'availability', label: 'Disponibilidad', href: '/mentorship/profile/availability#first-incomplete' },
  { key: 'information', label: 'Información del perfil', href: '/mentorship/profile/information?edit=1#first-incomplete' },
];

export function MentorProfileCompleteness({
  onCompletionChange,
}: {
  onCompletionChange?: (completion: MentorProfileCompletion) => void;
} = {}) {
  const [completion, setCompletion] = useState<Completion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const [profile, areas, interests, availability, information] = await Promise.all([
        getMentorProfile(signal),
        getMentorAreas(signal),
        getMentorInterests(signal),
        getMentorAvailability(signal),
        getMentorProfileInformation(signal),
      ]);
      if (signal?.aborted) return;
      const nextCompletion: Completion = {
        participation: profile.isActive,
        areas: areas.selectedIds.length > 0,
        interests: interests.configuration.topicIds.length > 0,
        availability: availability.availabilityStatus !== null,
        information: Boolean(
          information.exists
          && information.profile?.descripcion?.trim()
          && information.profile?.experiencia?.trim(),
        ),
      };
      setCompletion(nextCompletion);
      onCompletionChange?.(nextCompletion);
    } catch (reason) {
      if (!signal?.aborted) {
        setError(reason instanceof Error ? reason.message : 'No se pudo cargar el estado de tu perfil.');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [onCompletionChange]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    let currentController = controller;
    const refresh = () => {
      currentController.abort();
      currentController = new AbortController();
      void load(currentController.signal);
    };
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) refresh();
    };
    window.addEventListener('popstate', refresh);
    window.addEventListener('pageshow', handlePageShow);
    return () => {
      currentController.abort();
      window.removeEventListener('popstate', refresh);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [attempt, load]);

  const completed = completion ? Object.values(completion).filter(Boolean).length : 0;
  const percent = Math.round((completed / sections.length) * 100);

  return (
    <section className="mentor-completeness" aria-labelledby="mentor-completeness-title">
      <div className="mentor-completeness-heading">
        <h3 id="mentor-completeness-title">Completa tu perfil de mentor</h3>
        {!loading && !error && <span>{completed} de {sections.length} pasos completados &middot; {percent}%</span>}
      </div>
      {loading ? (
        <p className="mentor-completeness-message" role="status">Cargando el estado de tu perfil…</p>
      ) : error ? (
        <div className="mentor-completeness-error" role="alert">
          <p>{error}</p>
          <SecondaryButton onClick={() => setAttempt(value => value + 1)}>Reintentar</SecondaryButton>
        </div>
      ) : completion ? (
        <>
          <div
            className="mentor-completeness-track"
            role="progressbar"
            aria-label="Progreso del perfil de mentor"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-valuetext={`${percent} por ciento, ${completed} de ${sections.length} secciones completas`}
          >
            <span style={{ width: `${percent}%` }} />
          </div>
          <ol className="mentor-completeness-list">
            {sections.map(section => {
              const done = completion[section.key];
              return (
                <li key={section.key}>
                  {done
                    ? <CheckCircle2Icon aria-hidden="true" className="is-complete" />
                    : <CircleIcon aria-hidden="true" className="is-pending" />}
                  <span className="mentor-completeness-label">
                    <span>{section.label}</span>
                    {!done && <small>Pendiente</small>}
                  </span>
                  {done
                    ? <span className="mentor-completeness-status">Completo</span>
                    : <Link href={section.href} className="mentor-completeness-link">Completar {section.label.toLocaleLowerCase('es')}</Link>}
                </li>
              );
            })}
          </ol>
          {percent === 100 && <p className="mentor-completeness-success" role="status">¡Tu perfil de mentor está completo!</p>}
        </>
      ) : null}
    </section>
  );
}
