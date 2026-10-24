'use client';

import { RotateCcw, Search } from 'lucide-react';
import { Button } from '@/shared/components/button';
import { Input } from '@/shared/components/input';
import type { BoardStatus } from '@/modules/applications/frontend/services/applications-board.service';

export interface BoardFilters {
  period?: string;
  search: string;
  career: string;
  status: '' | BoardStatus;
}

export const EMPTY_FILTERS: BoardFilters = { search: '', career: '', status: '' };

const STATUS_OPTIONS: { value: '' | BoardStatus; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDIENTE', label: 'Pendiente de validación' },
  { value: 'OBSERVADA', label: 'Observado' },
  { value: 'APROBADA', label: 'Aprobado' },
  { value: 'RECHAZADA', label: 'Rechazado' },
];

export interface RequestsFiltersProps {
  filters: BoardFilters;
  careers: { id: string; nombre: string }[];
  onChange: (filters: BoardFilters) => void;
  onClear: () => void;
}

// Barra de búsqueda y filtros combinados (CA-04.2).
export function RequestsFilters({ filters, careers, onChange, onClear }: RequestsFiltersProps) {
  const hasActiveFilters = filters.search !== '' || filters.career !== '' || filters.status !== '' || Boolean(filters.period);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,2.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
      <div className="relative sm:col-span-2 lg:col-span-1">
        <Input
          label="Buscar"
          placeholder="Buscar por nombre, C.I. o Código SIS..."
          className="h-10 pl-9"
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
        />
        <Search aria-hidden="true" className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 text-abyssal-blue/50" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="filter-career" className="text-[13px] font-semibold text-abyssal-blue">
          Carrera
        </label>
        <select
          id="filter-career"
          value={filters.career}
          onChange={(event) => onChange({ ...filters, career: event.target.value })}
          className="h-10 min-w-0 w-full rounded-lg border border-oatmeal bg-palladian px-3 text-sm text-abyssal-blue outline-none focus:border-2 focus:border-blue-fantastic focus:bg-white"
        >
          <option value="">Todas las carreras</option>
          {careers.map((career) => (
            <option key={career.id} value={career.nombre}>
              {career.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="filter-status" className="text-[13px] font-semibold text-abyssal-blue">
          Estado
        </label>
        <select
          id="filter-status"
          value={filters.status}
          onChange={(event) => onChange({ ...filters, status: event.target.value as BoardFilters['status'] })}
          className="h-10 min-w-0 w-full rounded-lg border border-oatmeal bg-palladian px-3 text-sm text-abyssal-blue outline-none focus:border-2 focus:border-blue-fantastic focus:bg-white"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <Button type="button" variant="secondary" onClick={onClear} disabled={!hasActiveFilters} className="flex h-10 items-center justify-center gap-2 px-3 text-xs">
        <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
        Limpiar filtros
      </Button>
    </div>
  );
}
