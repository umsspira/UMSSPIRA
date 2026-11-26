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
  completedSteps: readonly MentorSetupStep[];
  editingStep?: MentorSetupStep;
  focusFirstIncomplete?: boolean;
  /** Si se indica, los pasos se renderizan como botones en lugar de enlaces. */
  onNavigate?: (href: string) => void;
}

/**
 * Indicador compartido de los 3 pasos de configuración del perfil de mentor.
 * Los pasos son navegables para evitar volver al panel principal entre cada uno.
 */
export function MentorSetupSteps({ currentStep, completedSteps, editingStep, focusFirstIncomplete = false, onNavigate }: Props) {
  const completed = MENTOR_SETUP_STEPS.filter(({ step }) => completedSteps.includes(step) && step !== editingStep).length;

  return (
    <section className="mentor-setup-steps" aria-labelledby="mentor-setup-steps-title">
      <div className="mentor-setup-steps-heading">
        <h2 id="mentor-setup-steps-title">Completa tu perfil de mentor</h2>
        <span>Paso {currentStep} de {MENTOR_SETUP_STEPS.length}</span>
        <span>
          <strong>{completed}</strong> de {MENTOR_SETUP_STEPS.length} pasos completados
        </span>
      </div>
      <div className="mentor-setup-steps-track" role="progressbar" aria-label="Progreso del perfil de mentor" aria-valuemin={0} aria-valuemax={MENTOR_SETUP_STEPS.length} aria-valuenow={completed}>
        <span style={{ width: `${(completed / MENTOR_SETUP_STEPS.length) * 100}%` }} />
      </div>
      <ol>
        {MENTOR_SETUP_STEPS.map(({ step, label, href }) => {
          const isCurrent = step === currentStep;
          const isEditing = step === editingStep;
          const isDone = completedSteps.includes(step) && !isCurrent && !isEditing;
          const destination = focusFirstIncomplete ? `${href}#first-incomplete` : href;
          const content = (
            <>
              <span className="mentor-setup-step-number" aria-hidden="true">
                {isDone ? <CheckIcon size={16} /> : step}
              </span>
              <span className="mentor-setup-step-copy">
                <small>{isEditing ? 'En edición' : isCurrent ? 'Paso actual' : isDone ? 'Completado' : `Paso ${step}`}</small>
                <strong>{label}</strong>
              </span>
            </>
          );

          return (
            <li
              key={step}
              aria-current={isCurrent ? 'step' : undefined}
              className={`mentor-setup-step${isDone ? ' is-done' : ''}${isCurrent ? ' is-current' : ''}${isEditing ? ' is-editing' : ''}`}
            >
              {onNavigate ? (
                <button
                  type="button"
                  className="mentor-setup-step-link"
                  onClick={() => onNavigate(destination)}
                  aria-label={`Ir al paso ${step}: ${label}`}
                >
                  {content}
                </button>
              ) : (
                <Link href={destination} className="mentor-setup-step-link" aria-label={`Ir al paso ${step}: ${label}`}>
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
