'use client';

import { CheckIcon } from 'lucide-react';
import type { OnboardingStep } from '../services/mentor-onboarding-api';

interface Props {
  currentStep: 1 | 2 | 3;
  totalSteps: number;
  steps: OnboardingStep[];
  completedSteps: number[];
  onSelect?: (step: 1 | 2 | 3) => void;
}

export function MentorOnboardingProgress({
  currentStep,
  totalSteps,
  steps,
  completedSteps,
  onSelect,
}: Props) {
  return (
    <section className="onboarding-progress" aria-labelledby="onboarding-progress-title">
      <div className="onboarding-progress-heading">
        <h2 id="onboarding-progress-title">Completa tu perfil de mentor</h2>
        <p aria-live="polite">
          <strong>Paso {currentStep} de {totalSteps}</strong>
          <span>{completedSteps.length} de {totalSteps} pasos completados</span>
        </p>
      </div>
      <div className="onboarding-progress-track" aria-hidden="true">
        <span style={{ width: `${(completedSteps.length / totalSteps) * 100}%` }} />
      </div>
      <ol className="onboarding-progress-steps">
        {steps.map(({ step, label, completed }) => {
          const isCurrent = step === currentStep && !completed;
          const canGoBack = completed && step !== currentStep;
          return (
            <li
              key={step}
              className={`${completed ? 'is-complete' : ''}${isCurrent ? ' is-current' : ''}`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <button
                type="button"
                onClick={() => canGoBack && onSelect?.(step)}
                disabled={!canGoBack}
                aria-label={`Paso ${step}: ${label}${completed ? ' (completado)' : isCurrent ? ' (paso actual)' : ' (pendiente)'}`}
              >
                <span className="onboarding-progress-number" aria-hidden="true">
                  {completed ? <CheckIcon size={16} /> : step}
                </span>
                <span className="onboarding-progress-copy">
                  <small>
                    {completed ? 'Completado' : isCurrent ? 'Paso actual' : `Paso ${step}`}
                  </small>
                  <strong>{label}</strong>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
