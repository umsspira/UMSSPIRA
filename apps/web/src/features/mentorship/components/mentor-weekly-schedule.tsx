'use client';

import { useId, useState } from 'react';
import { CalendarDaysIcon, ChevronDownIcon, PlusIcon, XIcon } from 'lucide-react';
import {
  addSlot,
  configuredDays,
  dayName,
  dayOptionLabel,
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
  /** HU 6.13: el checklist del perfil enlaza aquí cuando faltan horarios. */
  firstIncomplete?: boolean;
}

/** HU 6.18: horarios semanales del mentor, con la estructura del prototipo de Figma. */
export function MentorWeeklySchedule({ schedule, onChange, disabled = false, firstIncomplete = false }: MentorWeeklyScheduleProps) {
  const id = useId();
  const [expanded, setExpanded] = useState(
    schedule.length > 0 || (firstIncomplete && window.location.hash === '#first-incomplete'),
  );
  const [weekday, setWeekday] = useState(1);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('10:00');
  const [error, setError] = useState<SlotError | null>(null);
  const days = configuredDays(schedule);
  const panelId = `${id}-panel`;
  const errorId = `${id}-error`;

  function add() {
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
          <span>Día</span>
          <select id={firstIncomplete ? 'first-incomplete' : undefined} value={weekday} onChange={event => { setWeekday(Number(event.target.value)); setError(null); }} disabled={disabled}>
            {WEEKDAYS.map(day => <option key={day.weekday} value={day.weekday}>{dayOptionLabel(schedule, day.weekday)}</option>)}
          </select>
        </label>
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
        <button type="button" className="mentor-button mentor-button-secondary mentor-schedule-add" onClick={add} disabled={disabled}>
          <PlusIcon aria-hidden="true" className="icon" /> Agregar horario
        </button>
      </div>
      {error && <p id={errorId} className="mentor-schedule-error" role="alert">{error.message}</p>}
      <p className="mentor-schedule-hint">Hora de Bolivia. Cada sesión de mentoría dura 1 hora.</p>

      <div className="mentor-schedule-list">
        <h3>Tus horarios</h3>
        {days.length ? <ul>
          {days.map(day => <li key={day.weekday} className="mentor-schedule-day">
            <strong>{day.name}</strong>
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
          </li>)}
        </ul> : <p className="mentor-schedule-empty">Aún no agregaste horarios. Elige un día y una franja para empezar.</p>}
      </div>
    </div>}
  </section>;
}
