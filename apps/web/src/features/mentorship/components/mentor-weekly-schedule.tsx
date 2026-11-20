'use client';

import { useId, useState } from 'react';
import { CalendarDaysIcon, ChevronDownIcon, PlusIcon, XIcon } from 'lucide-react';
import {
  addSlot,
  configuredDays,
  dayName,
  removeSlot,
  slotRange,
  slotsOf,
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
  expandedByDefault?: boolean;
  /** HU 6.13: el checklist del perfil enlaza aquí cuando faltan horarios. */
  firstIncomplete?: boolean;
}

/** HU 6.18: horarios semanales del mentor, con la estructura del prototipo de Figma. */
export function MentorWeeklySchedule({
  schedule,
  onChange,
  disabled = false,
  expandedByDefault = false,
  firstIncomplete = false,
}: MentorWeeklyScheduleProps) {
  const id = useId();
  const [expanded, setExpanded] = useState(
    schedule.length > 0 || expandedByDefault || (firstIncomplete && window.location.hash === '#first-incomplete'),
  );
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:00');
  const [error, setError] = useState<SlotError | null>(null);
  const days = configuredDays(schedule);
  const panelId = `${id}-panel`;
  const errorId = `${id}-error`;

  function add(weekday: number) {
    const slot = { weekday, start, end };
    const problem = validateNewSlot(schedule, slot);
    setError(problem);
    if (problem) return;
    onChange(addSlot(schedule, slot));
  }

  function remove(slot: ScheduleSlot) {
    setError(null);
    onChange(removeSlot(schedule, slot));
  }

  function toggleDay(weekday: number) {
    setError(null);
    const active = days.some(day => day.weekday === weekday);
    onChange(
      active
        ? schedule.filter(slot => slot.weekday !== weekday)
        : addSlot(schedule, { weekday, start: '09:00', end: '10:00' }),
    );
  }

  const describedBy = (field: 'start' | 'end') => (error?.field === field ? errorId : undefined);

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
      <div className="mentor-schedule-form">
        <label className="mentor-schedule-field">
          <span>Desde</span>
          <input
            type="time"
            step={1800}
            value={start}
            onChange={event => { setStart(event.target.value); setError(null); }}
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
            value={end}
            onChange={event => { setEnd(event.target.value); setError(null); }}
            disabled={disabled}
            aria-invalid={error?.field === 'end' || undefined}
            aria-describedby={describedBy('end')}
          />
        </label>
      </div>
      {error && <p id={errorId} className="mentor-schedule-error" role="alert">{error.message}</p>}
      <p className="mentor-schedule-hint">Activa los días disponibles y agrega una o más franjas. Hora de Bolivia; cada sesión dura 1 hora.</p>

      <div className="mentor-schedule-list">
        <h3>Días de la semana</h3>
        <ul className="mentor-schedule-days">
          {WEEKDAYS.map(day => {
            const active = days.some(configured => configured.weekday === day.weekday);
            return <li key={day.weekday} className={`mentor-schedule-day${active ? ' is-active' : ''}`}>
              <label>
                <input
                  id={firstIncomplete && !days.length && day.weekday === 1 ? 'first-incomplete' : undefined}
                  type="checkbox"
                  role="switch"
                  checked={active}
                  onChange={() => toggleDay(day.weekday)}
                  disabled={disabled}
                  aria-label={`Disponibilidad del ${day.name.toLowerCase()}`}
                />
                <strong>{day.name}</strong>
                <span>{active ? 'Activo' : 'Inactivo'}</span>
              </label>
              {active && <div className="mentor-schedule-day-content">
                <ul className="mentor-schedule-chips" aria-label={`Horarios del ${day.name.toLowerCase()}`}>
                  {slotsOf(schedule, day.weekday).map(slot => <li key={slot.start} className="mentor-schedule-chip">
                    {slotRange(slot)}
                    <button
                      type="button"
                      aria-label={`Quitar ${slotRange(slot)} del ${dayName(slot.weekday).toLowerCase()}`}
                      onClick={() => remove(slot)}
                      disabled={disabled}
                    >
                      <XIcon aria-hidden="true" />
                    </button>
                  </li>)}
                </ul>
                <button
                  type="button"
                  className="mentor-button mentor-button-secondary mentor-schedule-add"
                  onClick={() => add(day.weekday)}
                  disabled={disabled}
                  aria-label={`Agregar horario al ${day.name.toLowerCase()}`}
                >
                  <PlusIcon aria-hidden="true" className="icon" /> Agregar horario
                </button>
              </div>}
            </li>;
          })}
        </ul>
      </div>
    </div>}
  </section>;
}
