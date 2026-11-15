import Link from 'next/link';
import type { Requirements } from '@umsspira/shared-types';
import { ArrowLeftIcon, ArrowRightIcon, AwardIcon, CirclePauseIcon, InboxIcon } from 'lucide-react';
import { ApprovedChip } from './approved-chip';
import { StatusBadge } from './status-badge';
import { MentorConfiguration } from './mentor-configuration';
import type { useMentorPublicationProgress } from '../hooks/use-mentor-publication-progress';

type PublicationState = ReturnType<typeof useMentorPublicationProgress>;

export function ActivePanel({ requirements, publication, onDeactivate }: {
  requirements: Requirements;
  publication: PublicationState;
  onDeactivate: () => void;
}) {
  const steps = [
    { label: 'Participación como mentor', complete: true },
    { label: 'Áreas técnicas', complete: publication.progress.areas },
    { label: 'Intereses de mentoría', complete: publication.progress.interests },
    { label: 'Disponibilidad', complete: publication.progress.availability },
    { label: 'Información del perfil', complete: publication.progress.profileInformation, optional: true },
  ];

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
      <section className="mentor-profile-progress" aria-labelledby="mentor-progress-title">
        <div className="mentor-profile-progress-heading">
          <h3 id="mentor-progress-title">Completa tu perfil de mentor</h3>
          <span>{publication.loading ? 'Cargando avance…' : `${publication.completedCount} de 5 pasos completados`}</span>
        </div>
        <div
          className="mentor-profile-progress-track"
          role="progressbar"
          aria-label="Avance del perfil de mentor"
          aria-valuemin={0}
          aria-valuemax={5}
          aria-valuenow={publication.completedCount}
        >
          <span style={{ width: `${publication.completedCount * 20}%` }} />
        </div>
        <ol>
          {steps.map((step, index) => (
            <li key={step.label} className={step.complete ? 'is-complete' : 'is-pending'}>
              <span aria-hidden="true" className="mentor-profile-progress-marker">{step.complete ? '✓' : ''}</span>
              <span>{index + 1}. {step.label}</span>
              {step.optional && !step.complete && <span className="mentor-profile-progress-optional">Opcional</span>}
            </li>
          ))}
        </ol>
        {publication.error && <div className="mentor-profile-progress-error" role="alert">
          <span>No se pudo consultar el avance. El directorio solo publica perfiles que cumplen las condiciones.</span>
          <button type="button" onClick={publication.retry}>Reintentar</button>
        </div>}
      </section>
      <MentorConfiguration progress={publication.progress} />
    </div>
    <div className="active-panel-footer inactive-footer">
      <Link href="/mentorship" className="inactive-back"><ArrowLeftIcon className="icon" aria-hidden="true" />Volver a Mentorías</Link>
      <button type="button" className="active-panel-deactivate" onClick={onDeactivate}><CirclePauseIcon aria-hidden="true" />Desactivar participación</button>
    </div>
  </section>;
}
