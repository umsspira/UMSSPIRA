'use client';

import { useCallback, useEffect, useState } from 'react';
import { getMentorAreas } from '../services/mentor-areas-api';
import { getMentorAvailability } from '../services/mentor-availability-api';
import { getMentorInterests } from '../services/mentor-interests-api';
import { getMentorProfileInformation } from '../services/mentor-profile-info-api';

export interface MentorPublicationProgress {
  areas: boolean;
  interests: boolean;
  availability: boolean;
  profileInformation: boolean;
}

const initialProgress: MentorPublicationProgress = {
  areas: false,
  interests: false,
  availability: false,
  profileInformation: false,
};

export function useMentorPublicationProgress(enabled: boolean) {
  const [progress, setProgress] = useState(initialProgress);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setProgress(initialProgress);
      setLoading(false);
      setError('');
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError('');

    Promise.all([
      getMentorAreas(controller.signal),
      getMentorInterests(controller.signal),
      getMentorAvailability(controller.signal),
    ])
      .then(([areas, interests, availability]) => {
        if (controller.signal.aborted) return;
        setProgress((current) => ({
          ...current,
          areas: areas.selectedIds.length > 0,
          interests: interests.configuration.topicIds.length > 0,
          availability: availability.availabilityStatus === 'DISPONIBLE',
        }));
        // La información descriptiva es opcional para publicar; su consulta no debe
        // bloquear el estado de publicación ni el acceso a solicitudes recibidas.
        void getMentorProfileInformation(controller.signal)
          .then((information) => {
            if (!controller.signal.aborted) {
              setProgress((current) => ({ ...current, profileInformation: information.exists }));
            }
          })
          .catch(() => {
            if (!controller.signal.aborted) {
              setProgress((current) => ({ ...current, profileInformation: false }));
            }
          });
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : 'No se pudo cargar el avance del perfil.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [enabled, reloadKey]);

  const retry = useCallback(() => setReloadKey((key) => key + 1), []);
  const published = progress.areas && progress.interests && progress.availability;
  const completedCount = 1 + Number(progress.areas) + Number(progress.interests)
    + Number(progress.availability) + Number(progress.profileInformation);

  return { progress, published, completedCount, loading, error, retry };
}
