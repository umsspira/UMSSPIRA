import Link from 'next/link';
import { ArrowRightIcon, BrainCogIcon, CalendarDaysIcon, ContactIcon, MessagesSquareIcon } from 'lucide-react';
import type { MentorProfileCompletion } from './mentor-profile-completeness';

const options = [
  {
    key: 'areas',
    title: 'Áreas técnicas',
    description: 'Define las áreas técnicas en las que puedes brindar orientación.',
    icon: BrainCogIcon,
    action: 'Configurar áreas',
    href: '/mentorship/profile/areas',
  },
  {
    key: 'interests',
    title: 'Intereses de mentoría',
    description: 'Selecciona los temas específicos sobre los que deseas orientar.',
    icon: MessagesSquareIcon,
    action: 'Configurar intereses',
    href: '/mentorship/profile/interests',
  },
  {
    key: 'availability',
    title: 'Disponibilidad',
    description: 'Indica si puedes atender nuevas solicitudes de orientación.',
    icon: CalendarDaysIcon,
    action: 'Configurar disponibilidad',
    href: '/mentorship/profile/availability',
  },
  {
    key: 'information',
    title: 'Información del perfil',
    description: 'Presenta tu descripción, experiencia e información relevante para la mentoría.',
    icon: ContactIcon,
    action: 'Agregar información',
    href: '/mentorship/profile/information',
  },
] as const;

/** Tarjetas para continuar la configuración del perfil del mentor. */
export function MentorConfiguration({ completion = null }: { completion?: MentorProfileCompletion | null } = {}) {
  return (
    <section className="active-panel-settings" aria-labelledby="mentor-configuration-title">
      <h3 id="mentor-configuration-title" className="active-panel-section-title">Configuración del perfil</h3>
      <div className="active-panel-options">
        {options.map(({ key, title, description, icon: Icon, action, href }) => {
          const complete = completion?.[key] ?? false;
          const actionStyle = complete || key === 'areas' ? 'mentor-button-secondary' : 'mentor-button-primary';

          return (
            <article key={key} className="mentor-card active-panel-option">
              <div className="active-panel-option-top">
                <span aria-hidden="true" className="mentor-card-icon">
                  <Icon className="icon-lg" />
                </span>
                <span className={`active-panel-option-status${complete ? ' is-complete' : ''}`}>
                  {complete ? 'Configurado' : 'Pendiente de configurar'}
                </span>
              </div>
              <h4
                id={key === 'areas' ? 'mentor-areas-title' : undefined}
                className="mentor-card-title active-panel-option-title"
              >
                {title}
              </h4>
              <p className="mentor-card-description">{description}</p>
              <div className="active-panel-option-action">
                <Link href={href} className={`mentor-button ${actionStyle}`}>
                  {action} <ArrowRightIcon className="icon" aria-hidden="true" />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
