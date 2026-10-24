'use client';

import { useState } from 'react';
import type { BoardPeriod, PeriodFilters } from '@/modules/applications/frontend/services/applications-board.service';

const periods: { value: BoardPeriod; label: string }[] = [
  { value: 'last15', label: 'Últimos 15 días' },
  { value: 'last30', label: 'Últimos 30 días' },
  { value: 'semester1', label: 'Semestre I' },
  { value: 'semester2', label: 'Semestre II' },
];

export function PeriodFiltersForm({ filters, onApply }: {
  filters: PeriodFilters;
  onApply: (filters: PeriodFilters) => void;
}) {
  const [year, setYear] = useState(String(filters.year ?? new Date().toLocaleDateString('en-US', { timeZone: 'America/La_Paz', year: 'numeric' })));
  const [from, setFrom] = useState(filters.from ?? '');
  const [to, setTo] = useState(filters.to ?? '');
  const [error, setError] = useState('');
  const semester = filters.period === 'semester1' || filters.period === 'semester2';
  const validYear = Number.isInteger(Number(year)) && Number(year) >= 2000 && Number(year) <= 2100;
  const inputClass = 'h-9 min-w-0 rounded-md border border-oatmeal bg-palladian px-2 text-xs text-abyssal-blue focus:outline-blue-fantastic';

  function applyPeriod(period: BoardPeriod) {
    const isSemester = period === 'semester1' || period === 'semester2';
    if (isSemester && !validYear) { setError('Introduce una gestión entre 2000 y 2100.'); return; }
    setError('');
    onApply({ period, year: isSemester ? Number(year) : undefined, from: '', to: '' });
  }

  return (
    <div className="border-t border-oatmeal/70 pt-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <div role="group" aria-label="Periodo de registro" className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-abyssal-blue/75">Periodo:</span>
          {periods.map(({ value, label }) => (
            <button key={value} type="button" aria-pressed={filters.period === value} onClick={() => applyPeriod(value)}
              className={`h-9 rounded-md border px-3 text-xs transition-colors ${filters.period === value ? 'border-burning-flame bg-burning-flame font-semibold text-abyssal-blue' : 'border-oatmeal bg-palladian text-abyssal-blue hover:bg-oatmeal/40'}`}>
              {label}
            </button>
          ))}
        </div>
        {semester && <label className="flex items-center gap-2 text-xs text-abyssal-blue">
          Gestión
          <input className={`${inputClass} w-20`} type="number" min="2000" max="2100" required value={year} onChange={(event) => {
            const value = event.target.value;
            setYear(value);
            if (Number.isInteger(Number(value)) && Number(value) >= 2000 && Number(value) <= 2100) {
              setError('');
              onApply({ period: filters.period, year: Number(value), from: '', to: '' });
            }
          }} />
        </label>}
        <form aria-label="Filtrar por periodo" className="flex flex-wrap items-center gap-2 lg:ml-auto" onSubmit={(event) => {
          event.preventDefault();
          if ((!from && !to) || (from && to && from > to)) {
            setError(!from && !to ? 'Selecciona al menos una fecha.' : 'Desde no puede ser posterior a Hasta.');
            return;
          }
          setError('');
          onApply({ period: 'custom', year: undefined, from, to });
        }}>
          <span className="text-xs text-abyssal-blue/75">Rango personalizado:</span>
          <input aria-label="Desde" className={inputClass} type="date" value={from} onChange={(event) => { setFrom(event.target.value); setError(''); }} />
          <span aria-hidden="true" className="text-abyssal-blue/50">—</span>
          <input aria-label="Hasta" className={inputClass} type="date" value={to} onChange={(event) => { setTo(event.target.value); setError(''); }} />
          <button type="submit" className={`h-9 rounded-md border px-3 text-xs font-medium ${filters.period === 'custom' ? 'border-burning-flame bg-burning-flame' : 'border-oatmeal bg-palladian hover:bg-oatmeal/40'}`}>Aplicar fechas</button>
        </form>
      </div>
      {semester && <p className="mt-2 text-xs text-abyssal-blue/60">Semestres provisionales: enero–junio y julio–diciembre.</p>}
      {error && <p role="alert" className="mt-2 text-sm text-truffle-trouble">{error}</p>}
    </div>
  );
}
