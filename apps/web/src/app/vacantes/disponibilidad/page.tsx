'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  Building2,
  CheckCircle2,
  Clock3,
  Search,
  X,
} from 'lucide-react';
import {
  getVacanciesIn,
  parseSavedVacancies,
  updateVacancyAvailability,
  type Vacancy,
} from '../vacancy-data';
import {
  SERVER_STORAGE_SNAPSHOT,
  STORAGE_READ_ERROR_SNAPSHOT,
  readVacancySnapshot,
  subscribeToLocalStorage,
} from '../storage';

type AvailabilityFilter = 'all' | 'available' | 'unavailable';

export default function DisponibilidadVacantesPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<AvailabilityFilter>('all');
  const [selectedVacancy, setSelectedVacancy] = useState<Vacancy | null>(null);
  const [notice, setNotice] = useState('');
  const [mutationError, setMutationError] = useState('');
  const snapshot = useSyncExternalStore(
    subscribeToLocalStorage,
    readVacancySnapshot,
    () => SERVER_STORAGE_SNAPSHOT,
  );

  const { vacancies, loaded, loadError } = useMemo(() => {
    if (snapshot === SERVER_STORAGE_SNAPSHOT) {
      return { vacancies: [], loaded: false, loadError: '' };
    }

    if (snapshot === STORAGE_READ_ERROR_SNAPSHOT) {
      return {
        vacancies: [],
        loaded: true,
        loadError: 'No se pudo acceder al almacenamiento local del navegador.',
      };
    }

    try {
      return {
        vacancies: getVacanciesIn(parseSavedVacancies(snapshot), {
          includeUnavailable: true,
        }),
        loaded: true,
        loadError: '',
      };
    } catch {
      return {
        vacancies: [],
        loaded: true,
        loadError: 'No se pudieron leer las vacantes guardadas en este navegador.',
      };
    }
  }, [snapshot]);

  const activeVacancies = vacancies.filter(
    (vacancy) => vacancy.availability !== 'unavailable',
  );
  const unavailableVacancies = vacancies.filter(
    (vacancy) => vacancy.availability === 'unavailable',
  );
  const normalizedSearch = search.trim().toLocaleLowerCase('es');
  const filteredVacancies = vacancies.filter((vacancy) => {
    const matchesSearch = `${vacancy.title} ${vacancy.company} ${vacancy.id}`
      .toLocaleLowerCase('es')
      .includes(normalizedSearch);
    const matchesAvailability =
      filter === 'all' ||
      (filter === 'available' && vacancy.availability !== 'unavailable') ||
      (filter === 'unavailable' && vacancy.availability === 'unavailable');

    return matchesSearch && matchesAvailability;
  });

  const confirmAvailabilityChange = () => {
    if (!selectedVacancy) return;

    const nextAvailability =
      selectedVacancy.availability === 'unavailable'
        ? 'available'
        : 'unavailable';

    try {
      updateVacancyAvailability(String(selectedVacancy.id), nextAvailability);
      setNotice(
        nextAvailability === 'available'
          ? 'La vacante fue reactivada y volvió al conjunto activo.'
          : 'La vacante se marcó como no disponible. Su registro se conserva.',
      );
      setMutationError('');
      setSelectedVacancy(null);
    } catch (error) {
      setMutationError(
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar la disponibilidad de la vacante.',
      );
    }
  };

  const clearSearch = () => setSearch('');

  return (
    <main className="min-h-screen bg-[#f3efe5] px-5 py-8 text-[#17384b] sm:px-8 lg:py-10">
      <div className="mx-auto max-w-7xl">
        <nav aria-label="Ruta de navegación" className="mb-6 text-sm text-gray-600">
          <Link href="/vacantes" className="hover:underline">
            Vacantes
          </Link>
          <span aria-hidden="true" className="mx-2">/</span>
          <span aria-current="page" className="font-semibold text-[#17384b]">
            Disponibilidad
          </span>
        </nav>

        <header className="mb-7">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-[#bd7627]">
            UMSSPIRA / Gestión de vacantes
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Disponibilidad de vacantes
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
            Administra qué oportunidades permanecen visibles y habilitadas para
            consultas y postulaciones.
          </p>
        </header>

        {notice && (
          <p
            role="status"
            className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
          >
            {notice}
          </p>
        )}

        {mutationError && (
          <p
            role="alert"
            className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {mutationError}
          </p>
        )}

        <section
          aria-label="Resumen de vacantes"
          className="mb-5 grid gap-3 sm:grid-cols-3"
        >
          <SummaryCard label="Total de vacantes" value={vacancies.length} />
          <SummaryCard
            label="Disponibles"
            value={activeVacancies.length}
            tone="green"
          />
          <SummaryCard
            label="No disponibles"
            value={unavailableVacancies.length}
            tone="amber"
          />
        </section>

        <aside className="mb-7 rounded-xl bg-[#17384b] p-5 text-white shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-6">
          <div>
            <h2 className="font-bold">Visibilidad de las vacantes</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-white/80">
              Las vacantes no disponibles se conservan para trazabilidad, pero
              dejan de aparecer en búsquedas, comparaciones y postulaciones.
              Puedes reactivarlas en cualquier momento.
            </p>
          </div>
          <Link
            href="/vacantes"
            className="mt-4 inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-bold text-[#17384b] hover:bg-[#edf1f3] sm:mt-0"
          >
            Ver vacantes activas
          </Link>
        </aside>

        <section className="overflow-hidden rounded-2xl border border-[#e7e0d4] bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-[#eee9df] p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
            <div>
              <h2 className="text-lg font-bold">Mis vacantes</h2>
              <p className="mt-1 text-sm text-gray-500">
                {loaded
                  ? `${filteredVacancies.length} ${
                      filteredVacancies.length === 1
                        ? 'registro'
                        : 'registros'
                    }`
                  : 'Cargando vacantes...'}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(220px,1fr)_190px]">
              <label className="flex min-h-11 items-center gap-2 rounded-lg border border-gray-200 px-3 focus-within:border-[#ed9635]">
                <Search size={17} className="shrink-0 text-gray-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar vacante o empresa..."
                  aria-label="Buscar vacantes"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400"
                />
                {search && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    aria-label="Limpiar búsqueda"
                    className="rounded p-1 text-gray-400 hover:bg-gray-100"
                  >
                    <X size={15} />
                  </button>
                )}
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-gray-500">
                  Filtrar por estado
                </span>
                <select
                  value={filter}
                  onChange={(event) =>
                    setFilter(event.target.value as AvailabilityFilter)
                  }
                  aria-label="Filtrar por estado de disponibilidad"
                  className="min-h-11 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-[#ed9635]"
                >
                  <option value="all">Todos los estados</option>
                  <option value="available">Disponible</option>
                  <option value="unavailable">No disponible</option>
                </select>
              </label>
            </div>
          </div>

          {loadError ? (
            <p role="alert" className="m-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">
              {loadError}
            </p>
          ) : !loaded ? (
            <p className="p-10 text-center text-sm text-gray-500">
              Cargando vacantes...
            </p>
          ) : filteredVacancies.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <p className="font-semibold text-[#17384b]">
                No encontramos vacantes
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Prueba con otra búsqueda o selecciona otro estado.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-[#fcfbf8] text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">Vacante</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Estado</th>
                    <th scope="col" className="px-5 py-3 font-semibold">Actualización</th>
                    <th scope="col" className="px-5 py-3 text-right font-semibold">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eee9df]">
                  {filteredVacancies.map((vacancy) => {
                    const available = vacancy.availability !== 'unavailable';
                    const updatedAt = vacancy.availabilityUpdatedAt
                      ? new Date(vacancy.availabilityUpdatedAt)
                      : null;

                    return (
                      <tr key={String(vacancy.id)} className="hover:bg-[#fcfbf8]">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-[#17384b]">
                            {vacancy.title}
                          </p>
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                            <Building2 size={13} />
                            {vacancy.company}
                          </p>
                          <p className="mt-1 text-xs text-gray-400">
                            ID: {vacancy.id}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                              available
                                ? 'bg-emerald-50 text-emerald-800'
                                : 'bg-amber-50 text-amber-800'
                            }`}
                          >
                            {available ? (
                              <CheckCircle2 size={14} />
                            ) : (
                              <Clock3 size={14} />
                            )}
                            {available ? 'Disponible' : 'No disponible'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-500">
                          {updatedAt && !Number.isNaN(updatedAt.getTime())
                            ? updatedAt.toLocaleDateString('es-BO')
                            : 'Sin cambios'}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setMutationError('');
                              setSelectedVacancy(vacancy);
                            }}
                            className={`min-h-10 rounded-lg px-4 py-2 text-xs font-bold transition ${
                              available
                                ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                                : 'bg-[#ed9635] text-white hover:bg-[#d98223]'
                            }`}
                          >
                            {available ? 'Cambiar estado' : 'Reactivar'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="mt-5 text-xs leading-5 text-gray-500">
          Esta demostración guarda los cambios en el almacenamiento local de
          este navegador. Los registros de vacantes permanecen guardados aunque
          su estado cambie.
        </p>
      </div>

      {selectedVacancy && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[#000b21]/45 p-5"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedVacancy(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="availability-dialog-title"
            aria-describedby="availability-dialog-description"
            className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl sm:p-8"
          >
            <p className="mb-3 inline-flex rounded-full bg-[#edf1f3] px-3 py-1 text-xs font-bold text-[#294d60]">
              VAC-{String(selectedVacancy.id).toUpperCase()}
            </p>
            <h2
              id="availability-dialog-title"
              className="text-xl font-bold text-[#17384b]"
            >
              {selectedVacancy.availability === 'unavailable'
                ? '¿Reactivar esta vacante?'
                : '¿Marcar la vacante como no disponible?'}
            </h2>
            <p
              id="availability-dialog-description"
              className="mt-2 text-sm leading-6 text-gray-600"
            >
              {selectedVacancy.availability === 'unavailable'
                ? 'La vacante volverá a aparecer en las búsquedas y consultas disponibles.'
                : 'La vacante dejará de aparecer en “Mis vacantes” para postulantes, pero su registro se conservará y podrás reactivarla después.'}
            </p>
            <p className="mt-4 rounded-lg bg-[#fcfbf8] p-3 text-sm font-semibold text-[#17384b]">
              {selectedVacancy.title} · {selectedVacancy.company}
            </p>
            <div className="mt-6 flex flex-col-reverse justify-end gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setSelectedVacancy(null)}
                className="min-h-11 rounded-lg border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmAvailabilityChange}
                className="min-h-11 rounded-lg bg-[#ed9635] px-5 py-2 text-sm font-bold text-white hover:bg-[#d98223]"
              >
                {selectedVacancy.availability === 'unavailable'
                  ? 'Reactivar vacante'
                  : 'Marcar no disponible'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function SummaryCard({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'green' | 'amber';
}) {
  const valueColor =
    tone === 'green'
      ? 'text-emerald-700'
      : tone === 'amber'
        ? 'text-amber-700'
        : 'text-[#17384b]';

  return (
    <article className="rounded-xl border border-[#e7e0d4] bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${valueColor}`}>{value}</p>
    </article>
  );
}
