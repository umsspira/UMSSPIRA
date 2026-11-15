'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { MentorState } from '@umsspira/shared-types';
import { getActivationEligibility } from '../model/activation-conditions';
import { getMentorProfile } from '../services/mentorship-api';

const PARTICIPATION_CHANGED = 'umsspira:mentor-participation-changed';
const refreshIntervalMs = 4500;

interface NavigationLink {
  href: string;
  label: string;
  activeOnly?: boolean;
}

const generalLinks: NavigationLink[] = [
  { href: '/mentorship', label: 'Inicio' },
  { href: '/mentorship/directory', label: 'Explorar mentores' },
  { href: '/mentorship/requests', label: 'Mis solicitudes' },
];

const mentorLinks: NavigationLink[] = [
  { href: '/mentorship/profile', label: 'Mi perfil de mentor', activeOnly: true },
  { href: '/mentorship/profile/areas', label: 'Mis áreas técnicas', activeOnly: true },
  { href: '/mentorship/profile/interests', label: 'Mis intereses', activeOnly: true },
  { href: '/mentorship/profile/availability', label: 'Mi disponibilidad', activeOnly: true },
  { href: '/mentorship/requests/received', label: 'Solicitudes recibidas', activeOnly: true },
];

function isMentorOnlyPath(pathname: string) {
  const path = pathname.replace(/\/+$/, '') || '/';
  return path === '/mentorship/requests/received'
    || path === '/mentorship/onboarding'
    || (path.startsWith('/mentorship/profile/') && path !== '/mentorship/profile/');
}

function isLinkActive(pathname: string, href: string) {
  return pathname === href || (href !== '/mentorship' && pathname.startsWith(`${href}/`));
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'No se pudo consultar tu participación como mentor.';
}

export function MentorshipNavigation({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/mentorship';
  const router = useRouter();
  const [profile, setProfile] = useState<MentorState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const request = useRef<AbortController | null>(null);
  const redirecting = useRef(false);

  const refresh = useCallback(() => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    void getMentorProfile(controller.signal)
      .then(state => {
        if (controller.signal.aborted) return;
        setProfile(state);
        setError('');
      })
      .catch(reason => {
        if (controller.signal.aborted) return;
        setProfile(null);
        setError(errorMessage(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
  }, []);

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, refreshIntervalMs);
    const onParticipationChanged = () => refresh();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    window.addEventListener(PARTICIPATION_CHANGED, onParticipationChanged);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener(PARTICIPATION_CHANGED, onParticipationChanged);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      request.current?.abort();
    };
  }, [refresh]);

  const restricted = isMentorOnlyPath(pathname);
  const activeMentor = profile?.isActive === true;
  const blocked = restricted && !loading && !activeMentor;

  useEffect(() => {
    if (!blocked || redirecting.current) return;
    redirecting.current = true;
    setAccessDenied(true);
    router.replace('/mentorship');
  }, [blocked, router]);

  useEffect(() => {
    if (!restricted || activeMentor) redirecting.current = false;
  }, [activeMentor, restricted]);

  const eligible = profile
    ? getActivationEligibility(profile.requirements).eligible
    : false;
  const links = [
    ...generalLinks,
    ...(!activeMentor && eligible
      ? [{ href: '/mentorship/profile', label: 'Activar participación como mentor' }]
      : []),
    ...(activeMentor ? mentorLinks : []),
  ];

  return <>
    <nav className="mentorship-navigation" aria-label="Navegación de Mentorías">
      {links.map(({ href, label }) => (
        <Link
          key={`${href}-${label}`}
          href={href}
          aria-current={isLinkActive(pathname, href) ? 'page' : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
    {accessDenied && <p className="mentorship-navigation-alert" role="alert">
      Esta sección es solo para mentores.
    </p>}
    {error && <div className="mentorship-navigation-alert" role="alert">
      <span>No se pudieron cargar tus permisos de mentoría. Solo se muestran las opciones generales. </span>
      <button type="button" onClick={refresh}>Reintentar</button>
    </div>}
    {(!restricted || (!loading && activeMentor)) && children}
  </>;
}
