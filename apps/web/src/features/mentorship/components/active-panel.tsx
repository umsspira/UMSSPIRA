import Link from 'next/link';
import type { Requirements } from '@umsspira/shared-types';
import { ArrowLeftIcon, ArrowRightIcon, AwardIcon, CirclePauseIcon, InboxIcon } from 'lucide-react';
import { ApprovedChip } from './approved-chip';
import { StatusBadge } from './status-badge';
import { MentorConfiguration } from './mentor-configuration';
import { MentorConfigurationGate } from './mentor-configuration-gate';
import { MentorProfileCompleteness } from './mentor-profile-completeness';
import type { useMentorPublicationProgress } from '../hooks/use-mentor-publication-progress';

type PublicationState = ReturnType<typeof useMentorPublicationProgress>;

export function ActivePanel({ requirements, publication, onDeactivate }: {
  requirements: Requirements;
  publication: PublicationState;
  onDeactivate: () => void;
}) {
  return <section aria-labelledby="active-title" className="mentor-card active-panel-card">
    <div className="active-panel-content">
      <div className="active-panel-topbar"><StatusBadge variant="active">Activo</StatusBadge><ApprovedChip approved={requirements.egresado} /></div>
      <div className="active-panel-hero">
        <span aria-hidden="true" className="active-panel-hero-icon"><AwardIcon /></span>
        <h2 id="active-title" className="mentor-card-title active-panel-title">Tu participación como mentor está activa</h2>
        <p className="mentor-card-description active-panel-intro">Configura tus áreas técnicas, intereses y disponibilidad para aparecer en el directorio y recibir solicitudes.</p>
        {publication.published && !publication.loading && !publication.error && (
          <Link href="/mentorship/requests/received" className="mentor-button mentor-button-secondary active-panel-requests-link">
            <InboxIcon aria-hidden="true" /> Ver solicitudes recibidas <ArrowRightIcon aria-hidden="true" />
          </Link>
        )}
      </div>
      <MentorProfileCompleteness />
      <MentorConfigurationGate enabled={!publication.published} />
      <MentorConfiguration progress={publication.progress} />
    </div>
    <div className="active-panel-footer inactive-footer">
      <Link href="/mentorship" className="inactive-back"><ArrowLeftIcon className="icon" aria-hidden="true" />Volver a Mentorías</Link>
      <button type="button" className="active-panel-deactivate" onClick={onDeactivate}><CirclePauseIcon aria-hidden="true" />Desactivar participación</button>
    </div>
  </section>;
}
