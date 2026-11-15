'use client';

import Link from 'next/link';
import { CheckIcon } from 'lucide-react';

export type MentorSetupStep = 1 | 2 | 3;

export const MENTOR_SETUP_STEPS: { step: MentorSetupStep; label: string; href: string }[] = [
  { step: 1, label: 'Áreas técnicas', href: '/mentorship/profile/areas' },
  { step: 2, label: 'Intereses de mentoría', href: '/mentorship/profile/interests' },
  { step: 3, label: 'Disponibilidad', href: '/mentorship/profile/availability' },
];

interface Props {
  currentStep: MentorSetupStep;
  completedSteps: number;
  /** Si se indica, los pasos se renderizan como botones en lugar de enlaces. */
  onNavigate?: (href: string) => void;
}

/**
 * Indicador compartido de los 3 pasos de configuración del perfil de mentor.
 * Los pasos son navegables para evitar volver al panel principal entre cada uno.
 */
export function MentorSetupSteps({ currentStep, completedSteps, onNavigate }: Props) {
  const completed = Math.min(Math.max(completedSteps, 0), MENTOR_SETUP_STEPS.length);

  return (
    <section className="mentor-setup-steps" aria-labelledby="mentor-setup-steps-title">
      <div className="mentor-setup-steps-heading">
        <h2 id="mentor-setup-steps-title">Completa tu perfil de mentor</h2>
        <span>
          <strong>{completed}</strong> de {MENTOR_SETUP_STEPS.length} pasos completados
        </span>
      </div>
      <div className="mentor-setup-steps-track" aria-hidden="true">
        <span style={{ width: `${(completed / MENTOR_SETUP_STEPS.length) * 100}%` }} />
      </div>
      <ol>
        {MENTOR_SETUP_STEPS.map(({ step, label, href }) => {
          const isCurrent = step === currentStep;
          const isDone = step < currentStep;
          const content = (
            <>
              <span className="mentor-setup-step-number" aria-hidden="true">
                {isDone ? <CheckIcon size={16} /> : step}
              </span>
              <span className="mentor-setup-step-copy">
                <small>{isCurrent ? 'Paso actual' : isDone ? 'Completado' : `Paso ${step}`}</small>
                <strong>{label}</strong>
              </span>
            </>
          );

          return (
            <li
              key={step}
              aria-current={isCurrent ? 'step' : undefined}
              className={`mentor-setup-step${isDone ? ' is-done' : ''}${isCurrent ? ' is-current' : ''}`}
            >
              {onNavigate ? (
                <button
                  type="button"
                  className="mentor-setup-step-link"
                  onClick={() => onNavigate(href)}
                  aria-label={`Ir al paso ${step}: ${label}`}
                >
                  {content}
                </button>
              ) : (
                <Link href={href} className="mentor-setup-step-link" aria-label={`Ir al paso ${step}: ${label}`}>
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
