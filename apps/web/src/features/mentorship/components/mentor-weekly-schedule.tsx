'use client';

import { useId, useState } from 'react';
import { CalendarDaysIcon, ChevronDownIcon, PlusIcon, XIcon } from 'lucide-react';
import {
  addSlot,
  removeDay,
  removeSlot,
  slotRange,
  slotsOf,
  suggestSlot,
  summarizeSchedule,
  validateNewSlot,
  WEEKDAYS,
  type ScheduleSlot,
  type SlotError,
} from '../model/mentor-schedule';

interface MentorWeeklyScheduleProps {
  schedule: ScheduleSlot[];
  onChange: (schedule: ScheduleSlot[]) => void;
  disabled?: boolean;
  /** HU 6.13: el checklist del perfil enlaza aquí cuando faltan horarios. */
  firstIncomplete?: boolean;
  /** El asistente de onboarding muestra el panel abierto para guiar al mentor. */
  expandedByDefault?: boolean;
}

type Draft = Pick<ScheduleSlot, 'start' | 'end'>;

/**
 * HU 6.18: horarios semanales del mentor. Cada día de lunes a domingo tiene un
 * interruptor (CA-FE-02, BUG-010): activo = el día tiene al menos una franja.
 */
export function MentorWeeklySchedule({ schedule, onChange, disabled = false, firstIncomplete = false, expandedByDefault = false }: MentorWeeklyScheduleProps) {
  const id = useId();
  const [expanded, setExpanded] = useState(
    schedule.length > 0 || expandedByDefault || (firstIncomplete && window.location.hash === '#first-incomplete'),
  );
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});
  const [errors, setErrors] = useState<Record<number, SlotError | null>>({});
  const panelId = `${id}-panel`;

  const draftOf = (weekday: number): Draft => {
    if (drafts[weekday]) return drafts[weekday];
    const { start, end } = suggestSlot(schedule, weekday);
    return { start, end };
  };

  function resetDay(weekday: number, next: readonly ScheduleSlot[]) {
    const { start, end } = suggestSlot(next, weekday);
    setDrafts(value => ({ ...value, [weekday]: { start, end } }));
    setErrors(value => ({ ...value, [weekday]: null }));
  }

  function toggleDay(weekday: number) {
    const active = slotsOf(schedule, weekday).length > 0;
    const next = active ? removeDay(schedule, weekday) : addSlot(schedule, suggestSlot(schedule, weekday));
    resetDay(weekday, next);
    onChange(next);
  }

  function editDraft(weekday: number, field: keyof Draft, value: string) {
    setDrafts(current => ({ ...current, [weekday]: { ...draftOf(weekday), [field]: value } }));
    setErrors(current => ({ ...current, [weekday]: null }));
  }

  function add(weekday: number) {
    const slot = { weekday, ...draftOf(weekday) };
    const problem = validateNewSlot(schedule, slot);
    setErrors(current => ({ ...current, [weekday]: problem }));
    if (problem) return;
    const next = addSlot(schedule, slot);
    resetDay(weekday, next);
    onChange(next);
  }

  function remove(slot: ScheduleSlot) {
    const next = removeSlot(schedule, slot);
    resetDay(slot.weekday, next);
    onChange(next);
  }

  return <section className="mentor-availability-schedule" aria-labelledby={`${id}-title`}>
    <div className="mentor-availability-schedule-heading">
      <span className="mentor-availability-schedule-icon"><CalendarDaysIcon aria-hidden="true" /></span>
      <div>
        <h2 id={`${id}-title`}>Horarios semanales</h2>
        <p>{summarizeSchedule(schedule)}</p>
      </div>
      <button
        type="button"
        className="mentor-schedule-toggle"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded(value => !value)}
      >
        {expanded ? 'Ocultar horarios' : 'Configurar horarios'}
        <ChevronDownIcon aria-hidden="true" className={expanded ? 'is-open' : undefined} />
      </button>
    </div>

    {expanded && <div id={panelId} className="mentor-schedule-panel">
      <p className="mentor-schedule-hint">Activa los días en los que puedes dar mentorías y define sus franjas. Hora de Bolivia. Cada sesión de mentoría dura 1 hora.</p>
      <ul className="mentor-schedule-days">
        {WEEKDAYS.map((day, index) => {
          const slots = slotsOf(schedule, day.weekday);
          const active = slots.length > 0;
          const lower = day.name.toLowerCase();
          const nameId = `${id}-day-${day.weekday}`;
          const errorId = `${nameId}-error`;
          const error = errors[day.weekday] ?? null;
          const draft = draftOf(day.weekday);
          const describedBy = (field: keyof Draft) => (error?.field === field ? errorId : undefined);
          return <li key={day.weekday} className={`mentor-schedule-day${active ? ' is-active' : ''}`}>
            <div className="mentor-schedule-day-header">
              <strong id={nameId}>{day.name}</strong>
              <button
                id={firstIncomplete && index === 0 ? 'first-incomplete' : undefined}
                type="button"
                role="switch"
                aria-checked={active}
                aria-labelledby={nameId}
                className="mentor-schedule-switch"
                onClick={() => toggleDay(day.weekday)}
                disabled={disabled}
              >
                <span className="mentor-schedule-switch-track" aria-hidden="true"><span /></span>
                <span className="mentor-schedule-switch-label" aria-hidden="true">{active ? 'Activo' : 'Inactivo'}</span>
              </button>
            </div>

            {active && <div className="mentor-schedule-day-body">
              <ul className="mentor-schedule-chips" aria-label={`Horarios del ${lower}`}>
                {slots.map(slot => <li key={slot.start} className="mentor-schedule-chip">
                  {slotRange(slot)}
                  <button
                    type="button"
                    aria-label={`Quitar ${slotRange(slot)} del ${lower}`}
                    onClick={() => remove(slot)}
                    disabled={disabled}
                  >
                    <XIcon aria-hidden="true" />
                  </button>
                </li>)}
              </ul>
              <div className="mentor-schedule-form">
                <label className="mentor-schedule-field">
                  <span>Desde</span>
                  <input
                    type="time"
                    step={1800}
                    value={draft.start}
                    aria-label={`Desde (${lower})`}
                    onChange={event => editDraft(day.weekday, 'start', event.target.value)}
                    disabled={disabled}
                    aria-invalid={error?.field === 'start' || undefined}
                    aria-describedby={describedBy('start')}
                  />
                </label>
                <label className="mentor-schedule-field">
                  <span>Hasta</span>
                  <input
                    type="time"
                    step={1800}
                    value={draft.end}
                    aria-label={`Hasta (${lower})`}
                    onChange={event => editDraft(day.weekday, 'end', event.target.value)}
                    disabled={disabled}
                    aria-invalid={error?.field === 'end' || undefined}
                    aria-describedby={describedBy('end')}
                  />
                </label>
                <button
                  type="button"
                  className="mentor-button mentor-button-secondary mentor-schedule-add"
                  aria-label={`Agregar horario al ${lower}`}
                  onClick={() => add(day.weekday)}
                  disabled={disabled}
                >
                  <PlusIcon aria-hidden="true" className="icon" /> Agregar horario
                </button>
              </div>
              {error && <p id={errorId} className="mentor-schedule-error" role="alert">{error.message}</p>}
            </div>}
          </li>;
        })}
      </ul>
    </div>}
  </section>;
}
