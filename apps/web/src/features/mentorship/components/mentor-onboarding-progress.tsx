'use client';

import { CheckIcon } from 'lucide-react';
import Link from 'next/link';
import type { MentorProgressStep, MentorProgressStepNumber } from '../model/mentor-onboarding-progress';

interface Props {
  currentStep: MentorProgressStepNumber;
  steps: MentorProgressStep[];
}

export function MentorOnboardingProgress({
  currentStep,
  steps,
}: Props) {
  const completedSteps = steps.filter(({ completed }) => completed).length;
  const totalSteps = steps.length;
  const percent = totalSteps ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <section className="onboarding-progress" aria-labelledby="onboarding-progress-title">
      <div className="onboarding-progress-heading">
        <h2 id="onboarding-progress-title">Completa tu perfil de mentor</h2>
        <p aria-live="polite">
          <strong>Paso {currentStep} de {totalSteps}</strong>
          <span>{completedSteps} de {totalSteps} pasos completados</span>
          <span>{percent}%</span>
        </p>
      </div>
      <div
        className="onboarding-progress-track"
        role="progressbar"
        aria-label="Progreso del perfil de mentor"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={`${percent} por ciento, ${completedSteps} de ${totalSteps} secciones completas`}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
      <ol className="onboarding-progress-steps">
        {steps.map(({ step, label, completed, href }) => {
          const isCurrent = step === currentStep && !completed;
          return (
            <li
              key={step}
              className={`${completed ? 'is-complete' : ''}${isCurrent ? ' is-current' : ''}`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <Link
                href={href}
                aria-label={`Ir al paso ${step}: ${label}${completed ? ' (completado)' : isCurrent ? ' (paso actual)' : ' (pendiente)'}`}
              >
                <span className="onboarding-progress-number" aria-hidden="true">
                  {completed ? <CheckIcon size={16} /> : step}
                </span>
                <span className="onboarding-progress-copy">
                  <small>
                    {completed ? 'Completado' : isCurrent ? 'Paso actual' : 'Pendiente'}
                  </small>
                  <strong>{label}</strong>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
