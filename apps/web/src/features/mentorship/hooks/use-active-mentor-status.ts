'use client';

import { useEffect, useState } from 'react';
import { MENTOR_PARTICIPATION_CHANGED_EVENT } from '../model/participation-events';
import { getMentorProfile } from '../services/mentorship-api';

/**
 * Indica si el usuario tiene una participación de mentor activa.
 * Ante un error (por ejemplo, un estudiante sin elegibilidad) se asume inactiva,
 * de modo que la subnavegación conserva solo las opciones del solicitante.
 */
export function useActiveMentorStatus(): boolean {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let mounted = true;
    let controller: AbortController | null = null;

    const load = () => {
      controller?.abort();
      controller = new AbortController();
      const current = controller;
      getMentorProfile(current.signal)
        .then(profile => { if (mounted && !current.signal.aborted) setIsActive(profile.isActive); })
        .catch(() => { if (mounted && !current.signal.aborted) setIsActive(false); });
    };

    load();
    window.addEventListener(MENTOR_PARTICIPATION_CHANGED_EVENT, load);
    return () => {
      mounted = false;
      controller?.abort();
      window.removeEventListener(MENTOR_PARTICIPATION_CHANGED_EVENT, load);
    };
  }, []);

  return isActive;
}
