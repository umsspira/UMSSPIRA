import Link from 'next/link';
import type { Requirements } from '@umsspira/shared-types';
import { ArrowLeftIcon, ArrowRightIcon, AwardIcon, CirclePauseIcon } from 'lucide-react';
import { useState } from 'react';
import { ApprovedChip } from './approved-chip';
import { StatusBadge } from './status-badge';
import { MentorConfiguration } from './mentor-configuration';
import { MentorProfileCompleteness, type MentorProfileCompletion } from './mentor-profile-completeness';

export function ActivePanel({ requirements, onDeactivate }: { requirements: Requirements; onDeactivate: () => void }) {
  const [completion, setCompletion] = useState<MentorProfileCompletion | null>(null);

  return <section aria-labelledby="active-title" className="mentor-card active-panel-card">
    <div className="active-panel-content">
      <div className="active-panel-topbar"><StatusBadge variant="active">Activo</StatusBadge><ApprovedChip approved={requirements.egresado} /></div>
      <div className="active-panel-hero">
        <span aria-hidden="true" className="active-panel-hero-icon"><AwardIcon /></span>
        <h2 id="active-title" className="mentor-card-title active-panel-title">Tu participación como mentor está activa</h2>
        <p className="mentor-card-description active-panel-intro">Ahora puedes configurar las &aacute;reas e intereses en los que deseas brindar orientaci&oacute;n a otros miembros de la comunidad.</p>
        <Link href="/mentorship/profile/areas" className="mentor-button mentor-button-secondary active-panel-configure-link">
          Comenzar mi configuraci&oacute;n <ArrowRightIcon aria-hidden="true" />
        </Link>
      </div>
      <MentorProfileCompleteness onCompletionChange={setCompletion} />
      <MentorConfiguration completion={completion} />
    </div>
    <div className="active-panel-footer inactive-footer">
      <Link href="/mentorship" className="inactive-back"><ArrowLeftIcon className="icon" aria-hidden="true" />Volver a Mentorías</Link>
      <button type="button" className="active-panel-deactivate" onClick={onDeactivate}><CirclePauseIcon aria-hidden="true" />Desactivar participación</button>
    </div>
  </section>;
}
