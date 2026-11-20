'use client';

import { CalendarDaysIcon, CheckIcon } from 'lucide-react';
import type {
  OnboardingArea,
  OnboardingAvailabilityStatus,
  OnboardingInterestGroup,
  OnboardingSchedule,
} from '../services/mentor-onboarding-api';
import { MentorWeeklySchedule } from './mentor-weekly-schedule';

const STATUS_OPTIONS: { value: OnboardingAvailabilityStatus; title: string; description: string }[] = [
  {
    value: 'DISPONIBLE',
    title: 'Disponible',
    description: 'Tu perfil aparece en el directorio y puedes recibir solicitudes.',
  },
  {
    value: 'EN_PAUSA',
    title: 'En pausa',
    description: 'Tu perfil sigue visible, pero no recibes nuevas solicitudes.',
  },
  {
    value: 'NO_DISPONIBLE',
    title: 'No disponible',
    description: 'Tu ficha se oculta del directorio temporalmente.',
  },
];

function ErrorMessage({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="onboarding-field-error" role="alert">{messages.join('. ')}</p>;
}

interface AreasStepProps {
  catalog: OnboardingArea[];
  selectedIds: string[];
  errors: Record<string, string[]>;
  disabled: boolean;
  onChange: (ids: string[]) => void;
}

export function OnboardingAreasStep({
  catalog,
  selectedIds,
  errors,
  disabled,
  onChange,
}: AreasStepProps) {
  const toggle = (id: string) => {
    if (disabled) return;
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((selected) => selected !== id)
        : [...selectedIds, id].slice(0, 5),
    );
  };

  return (
    <section className="onboarding-step-panel" aria-labelledby="onboarding-areas-title">
      <div className="onboarding-step-heading">
        <span aria-hidden="true"><CheckIcon /></span>
        <div>
          <h3 id="onboarding-areas-title">Áreas técnicas</h3>
          <p>Elige al menos un área en la que puedas orientar. Puedes seleccionar hasta 5.</p>
        </div>
      </div>
      <p className="onboarding-counter" aria-live="polite">
        {selectedIds.length} de 5 áreas seleccionadas
      </p>
      {catalog.length === 0 ? (
        <p role="alert" className="onboarding-empty">
          No hay áreas técnicas disponibles. Contacta al administrador.
        </p>
      ) : (
        <ul className="onboarding-option-list" aria-label="Áreas técnicas disponibles">
          {catalog.map((area) => {
            const selected = selectedIds.includes(area.id);
            return (
              <li key={area.id}>
                <label className={`onboarding-option${selected ? ' is-selected' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selected}
                    disabled={disabled || (!selected && selectedIds.length >= 5)}
                    onChange={() => toggle(area.id)}
                  />
                  <span>
                    <strong>{area.nombre}</strong>
                    {area.descripcion && <small>{area.descripcion}</small>}
                  </span>
                  <em>{selected ? 'Seleccionada' : 'Agregar'}</em>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      <ErrorMessage messages={errors.areaIds} />
    </section>
  );
}

interface InterestsStepProps {
  groups: OnboardingInterestGroup[];
  selectedIds: string[];
  errors: Record<string, string[]>;
  disabled: boolean;
  onChange: (ids: string[]) => void;
}

export function OnboardingInterestsStep({
  groups,
  selectedIds,
  errors,
  disabled,
  onChange,
}: InterestsStepProps) {
  const toggle = (id: string) => {
    if (disabled) return;
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((selected) => selected !== id)
        : [...selectedIds, id],
    );
  };

  return (
    <section className="onboarding-step-panel" aria-labelledby="onboarding-interests-title">
      <div className="onboarding-step-heading">
        <span aria-hidden="true"><CheckIcon /></span>
        <div>
          <h3 id="onboarding-interests-title">Intereses de mentoría</h3>
          <p>Selecciona los temas sobre los que deseas orientar dentro de tus áreas técnicas.</p>
        </div>
      </div>
      {groups.length === 0 ? (
        <p role="alert" className="onboarding-empty">
          Primero debes guardar al menos un área técnica.
        </p>
      ) : (
        <div className="onboarding-interest-groups">
          {groups.map((group) => (
            <section key={group.area.id} aria-labelledby={`onboarding-interest-${group.area.id}`}>
              <h4 id={`onboarding-interest-${group.area.id}`}>{group.area.nombre}</h4>
              {group.intereses.length === 0 ? (
                <p className="onboarding-empty">Esta área aún no tiene intereses disponibles.</p>
              ) : (
                <ul className="onboarding-option-list">
                  {group.intereses.map((interest) => {
                    const selected = selectedIds.includes(interest.id);
                    return (
                      <li key={interest.id}>
                        <label className={`onboarding-option${selected ? ' is-selected' : ''}`}>
                          <input
                            type="checkbox"
                            checked={selected}
                            disabled={disabled}
                            onChange={() => toggle(interest.id)}
                          />
                          <span><strong>{interest.nombre}</strong></span>
                          <em>{selected ? 'Seleccionado' : 'Agregar'}</em>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
      <ErrorMessage messages={errors.interestIds} />
    </section>
  );
}

interface AvailabilityStepProps {
  status: OnboardingAvailabilityStatus | null;
  schedules: OnboardingSchedule[];
  errors: Record<string, string[]>;
  disabled: boolean;
  onStatusChange: (status: OnboardingAvailabilityStatus) => void;
  onSchedulesChange: (schedules: OnboardingSchedule[]) => void;
}

export function OnboardingAvailabilityStep({
  status,
  schedules,
  errors,
  disabled,
  onStatusChange,
  onSchedulesChange,
}: AvailabilityStepProps) {
  return (
    <section className="onboarding-step-panel" aria-labelledby="onboarding-availability-title">
      <div className="onboarding-step-heading">
        <span aria-hidden="true"><CalendarDaysIcon /></span>
        <div>
          <h3 id="onboarding-availability-title">Disponibilidad</h3>
          <p>Indica los días y horarios en los que puedes atender mentorías.</p>
        </div>
      </div>

      <fieldset className="onboarding-fieldset" disabled={disabled}>
        <legend>Estado de disponibilidad</legend>
        <div className="onboarding-status-options">
          {STATUS_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`onboarding-status${status === option.value ? ' is-selected' : ''}`}
            >
              <input
                type="radio"
                name="onboarding-availability-status"
                value={option.value}
                checked={status === option.value}
                onChange={() => onStatusChange(option.value)}
              />
              <strong>{option.title}</strong>
              <small>{option.description}</small>
            </label>
          ))}
        </div>
        <ErrorMessage messages={errors.availabilityStatus} />
      </fieldset>

      <div className="onboarding-schedule-list">
        <MentorWeeklySchedule
          schedule={schedules}
          onChange={onSchedulesChange}
          disabled={disabled}
          expandedByDefault
        />
        <ErrorMessage messages={errors.schedules} />
      </div>
    </section>
  );
}
