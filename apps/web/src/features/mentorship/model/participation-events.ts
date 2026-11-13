export const MENTOR_PARTICIPATION_CHANGED_EVENT = 'mentorship:participation-changed';

/** Avisa a la subnavegación persistente para que vuelva a consultar la participación. */
export function notifyMentorParticipationChanged(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(MENTOR_PARTICIPATION_CHANGED_EVENT));
}
