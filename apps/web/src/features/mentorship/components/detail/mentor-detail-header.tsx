'use client';

import Link from 'next/link';
import { InfoIcon, SendIcon } from 'lucide-react';
import {
  availabilityBadgeConfig,
  formatProfession,
  mentorInitials,
  type MentorDetailProfile,
} from '../../model/mentor-detail';

export function MentorDetailHeader({ mentor }: { mentor: MentorDetailProfile }) {
  const badge = availabilityBadgeConfig(mentor.availability);
  const profession = formatProfession(mentor.jobTitle, mentor.company);
  const isAvailable = mentor.availability === 'AVAILABLE';

  return (
    <header className="mentor-detail-header-card" aria-label={`Perfil de ${mentor.fullName}`}>
      <div className="mentor-detail-header-main">
        <div className="mentor-detail-header-info">
          <div className="mentor-detail-avatar">
            <span
              className="mentor-detail-avatar-initials"
              role="img"
              aria-label={`Avatar de ${mentor.fullName}`}
            >
              {mentorInitials(mentor.fullName)}
            </span>
          </div>

          <div className="mentor-detail-identity">
            <h2 className="mentor-detail-name">{mentor.fullName}</h2>
            {profession && <p className="mentor-detail-profession">{profession}</p>}

            <div className="mentor-detail-status-pill-wrap">
              <span className={`mentor-detail-badge ${badge.className}`}>
                <span className="mentor-detail-badge-dot" aria-hidden="true" />
                {badge.label}
              </span>
            </div>
          </div>
        </div>

        <div className="mentor-detail-header-action">
          {/* Con el mentor disponible abre el flujo de solicitud de la HU 6.10 */}
          {isAvailable ? (
            <Link
              href={`/mentorship/request/${encodeURIComponent(mentor.id)}`}
              className="mentor-button mentor-button-primary mentor-detail-request-btn"
            >
              <SendIcon className="icon" aria-hidden="true" />
              Solicitar mentoría
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="mentor-button mentor-button-disabled mentor-detail-request-btn"
            >
              <SendIcon className="icon" aria-hidden="true" />
              Solicitar mentoría
            </button>
          )}
        </div>
      </div>

      {!isAvailable && (
        <aside
          className="mentor-detail-notice"
          aria-label="Aviso de disponibilidad para solicitudes"
        >
          <InfoIcon className="mentor-detail-notice-icon icon" aria-hidden="true" />
          <div className="mentor-detail-notice-content">
            <p className="mentor-detail-notice-title">
              Este mentor no está recibiendo nuevas solicitudes en este momento.
            </p>
            <p className="mentor-detail-notice-text">
              Puedes revisar su perfil o volver al directorio para encontrar otros mentores disponibles.
            </p>
          </div>
        </aside>
      )}
    </header>
  );
}
