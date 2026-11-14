'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  ArrowLeft,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  MapPin,
  Search,
  UserRound,
} from 'lucide-react';
import PortalFooter from '../components/PortalFooter';
import {
  isVacancyAvailable,
  searchIndexedVacancies,
  type Vacancy,
} from '../../lib/api/vacantes';
import {
  parseSavedVacancies,
  type Vacancy as LocalVacancy,
} from './vacancy-data';
import {
  SERVER_STORAGE_SNAPSHOT,
  STORAGE_READ_ERROR_SNAPSHOT,
  readVacancySnapshot,
  subscribeToLocalStorage,
} from './storage';

function mapLocalVacancy(vacancy: LocalVacancy): Vacancy {
  return {
    id: String(vacancy.id),
    idEmpresa: 'local',
    empresa: vacancy.company,
    titulo: vacancy.title,
    modalidad: vacancy.modality,
    estado: vacancy.availability === 'unavailable' ? 'No disponible' : 'Disponible',
    fechaCreacion: vacancy.createdAt ?? null,
    descripcion: vacancy.description,
    ubicacion: vacancy.location,
    area: vacancy.area,
    condiciones: vacancy.conditions ?? '',
    requisitos: vacancy.requirements.map((nombre, index) => ({
      id: `${vacancy.id}-requisito-${index}`,
      nombre,
    })),
  };
}

function getPublicationDate(vacancy: Vacancy) {
  if (!vacancy.fechaCreacion) return 'Sin fecha';
  const date = new Date(vacancy.fechaCreacion);
  return Number.isNaN(date.getTime())
    ? 'Sin fecha'
    : date.toLocaleDateString('es-BO', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
}

function getPublicationTimestamp(vacancy: Vacancy) {
  if (!vacancy.fechaCreacion) return Number.NEGATIVE_INFINITY;
  const timestamp = new Date(vacancy.fechaCreacion).getTime();
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

export default function VacantesPage() {
  const [remoteVacancies, setRemoteVacancies] = useState<Vacancy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [area, setArea] = useState('Todas');
  const [modality, setModality] = useState('Todas');
  const [location, setLocation] = useState('Todas');
  const snapshot = useSyncExternalStore(
    subscribeToLocalStorage,
    readVacancySnapshot,
    () => SERVER_STORAGE_SNAPSHOT,
  );
  const { localVacancies, localStorageError } = useMemo(() => {
    if (snapshot === SERVER_STORAGE_SNAPSHOT) {
      return { localVacancies: [], localStorageError: '' };
    }
    if (snapshot === STORAGE_READ_ERROR_SNAPSHOT) {
      return {
        localVacancies: [],
        localStorageError:
          'No se pudo acceder a las vacantes guardadas en este navegador.',
      };
    }

    try {
      return {
        localVacancies: parseSavedVacancies(snapshot).map(mapLocalVacancy),
        localStorageError: '',
      };
    } catch {
      return {
        localVacancies: [],
        localStorageError:
          'No se pudieron leer las vacantes guardadas en este navegador.',
      };
    }
  }, [snapshot]);

  useEffect(() => {
    const controller = new AbortController();

    searchIndexedVacancies('', controller.signal)
      .then((results) => {
        setRemoteVacancies(
          results.filter((vacancy) => isVacancyAvailable(vacancy.estado)),
        );
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No se pudieron consultar las vacantes disponibles.',
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  const vacancies = useMemo(() => {
    const byId = new Map(
      remoteVacancies.map((vacancy) => [vacancy.id, vacancy]),
    );
    localVacancies.forEach((vacancy) => byId.set(vacancy.id, vacancy));
    return Array.from(byId.values());
  }, [localVacancies, remoteVacancies]);

  const areas = useMemo(
    () => ['Todas', ...new Set(vacancies.map((vacancy) => vacancy.area))],
    [vacancies],
  );
  const modalities = useMemo(
    () => ['Todas', ...new Set(vacancies.map((vacancy) => vacancy.modalidad))],
    [vacancies],
  );
  const locations = useMemo(
    () => ['Todas', ...new Set(vacancies.map((vacancy) => vacancy.ubicacion))],
    [vacancies],
  );

  const filteredVacancies = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('es');

    return vacancies
      .filter((vacancy) => {
        const text = [
          vacancy.titulo,
          vacancy.empresa,
          vacancy.descripcion,
          vacancy.ubicacion,
          vacancy.area,
          vacancy.modalidad,
        ]
          .join(' ')
          .toLocaleLowerCase('es');

        return (
          text.includes(normalizedSearch) &&
          (area === 'Todas' || vacancy.area === area) &&
          (modality === 'Todas' || vacancy.modalidad === modality) &&
          (location === 'Todas' || vacancy.ubicacion === location)
        );
      })
      .sort(
        (first, second) =>
          getPublicationTimestamp(second) - getPublicationTimestamp(first),
      );
  }, [area, location, modality, search, vacancies]);

  const hasFilters =
    Boolean(search) ||
    area !== 'Todas' ||
    modality !== 'Todas' ||
    location !== 'Todas';

  const clearFilters = () => {
    setSearch('');
    setArea('Todas');
    setModality('Todas');
    setLocation('Todas');
  };

  return (
    <div className="flex min-h-[calc(100vh-84px)] flex-col bg-[#f5f2ec]">
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-5 pb-8 pt-5 sm:px-8 lg:px-10">
        <Link
          href="/"
          className="mb-5 inline-flex items-center gap-2 text-xs text-[#35556b] hover:underline"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Inicio
        </Link>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#fff0e1] text-[#a8602d]">
              <BriefcaseBusiness size={21} aria-hidden="true" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-[#142237] sm:text-3xl">
                Bolsa de trabajo
              </h1>
              <p className="mt-1 text-xs text-[#617184] sm:text-sm">
                Explora las vacantes disponibles y conoce sus principales
                características.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/perfil/experiencia-laboral"
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-[#d9d0c3] bg-white px-3 text-xs font-medium text-[#142237] hover:bg-[#fcfaf6]"
            >
              <UserRound size={14} aria-hidden="true" />
              Mi perfil
            </Link>
            <Link
              href="/vacantes/nueva"
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#ffb162] px-3 text-xs font-semibold text-[#142237] hover:bg-[#f6a34f]"
            >
              <BriefcaseBusiness size={14} aria-hidden="true" />
              Registrar vacante
            </Link>
          </div>
        </div>

        <section
          aria-label="Buscar y filtrar vacantes"
          className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        >
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-[#142237]">
              Buscar vacantes
            </span>
            <span className="flex h-10 items-center gap-2 rounded-md border border-[#d9d0c3] bg-white px-3 focus-within:border-[#b87543]">
              <Search size={14} className="shrink-0 text-[#617184]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por cargo, empresa o ubicación"
                className="w-full bg-transparent text-xs text-[#142237] outline-none placeholder:text-[#8c98a5]"
                aria-label="Buscar por cargo, empresa o ubicación"
              />
            </span>
          </label>

          {[
            {
              label: 'Área laboral',
              value: area,
              options: areas,
              onChange: setArea,
              allLabel: 'Área: todas',
            },
            {
              label: 'Modalidad de trabajo',
              value: modality,
              options: modalities,
              onChange: setModality,
              allLabel: 'Modalidad: todas',
            },
            {
              label: 'Ubicación',
              value: location,
              options: locations,
              onChange: setLocation,
              allLabel: 'Ubicación: todas',
            },
          ].map((filter) => (
            <label key={filter.label} className="flex flex-col gap-1">
              <span className="text-[11px] font-medium text-[#142237]">
                {filter.label}
              </span>
              <span className="relative">
                <select
                  value={filter.value}
                  onChange={(event) => filter.onChange(event.target.value)}
                  className="h-10 w-full appearance-none rounded-md border border-[#d9d0c3] bg-white px-3 pr-9 text-xs text-[#617184] outline-none focus:border-[#b87543]"
                  aria-label={filter.label}
                >
                  {filter.options.map((option) => (
                    <option key={option} value={option}>
                      {option === 'Todas' ? filter.allLabel : option}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#617184]"
                />
              </span>
            </label>
          ))}
        </section>

        {localStorageError && (
          <p role="alert" className="mb-4 rounded-md bg-[#fff0e1] px-4 py-3 text-xs text-[#8a4b27]">
            {localStorageError}
          </p>
        )}

        {error && localVacancies.length > 0 && (
          <p role="status" className="mb-4 rounded-md bg-[#fff0e1] px-4 py-3 text-xs text-[#8a4b27]">
            No se pudo consultar el servicio; se muestran las vacantes guardadas
            en este navegador.
          </p>
        )}

        {error && localVacancies.length === 0 ? (
          <section
            role="alert"
            className="rounded-lg border border-[#e6c6ba] bg-white px-5 py-10 text-center"
          >
            <h2 className="text-base font-semibold text-[#142237]">
              No se pudieron cargar las vacantes
            </h2>
            <p className="mt-2 text-sm text-[#617184]">{error}</p>
            <Link
              href="/vacantes/nueva"
              className="mt-5 inline-flex min-h-10 items-center justify-center rounded-md bg-[#ffb162] px-4 text-xs font-semibold text-[#142237] hover:bg-[#f6a34f]"
            >
              Crear vacante de prueba
            </Link>
          </section>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2
                className="text-xs font-semibold text-[#142237]"
                aria-live="polite"
              >
                {loading
                  ? 'Cargando vacantes...'
                  : `${filteredVacancies.length} ${
                      filteredVacancies.length === 1
                        ? 'vacante disponible'
                        : 'vacantes disponibles'
                    }`}
              </h2>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-xs font-medium text-[#a8602d] hover:underline"
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            <section
              aria-label="Listado de vacantes"
              aria-busy={loading}
              className="overflow-hidden rounded-lg border border-[#d9d0c3] bg-white"
            >
              {loading ? (
                <p role="status" className="px-5 py-12 text-center text-sm text-[#617184]">
                  Cargando vacantes disponibles...
                </p>
              ) : filteredVacancies.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <Search
                    size={24}
                    aria-hidden="true"
                    className="mx-auto mb-3 text-[#8c98a5]"
                  />
                  <h3 className="text-base font-semibold text-[#142237]">
                    No encontramos vacantes
                  </h3>
                  <p className="mt-2 text-sm text-[#617184]">
                    Prueba con otra búsqueda o cambia los filtros seleccionados.
                  </p>
                  <Link
                    href="/vacantes/nueva"
                    className="mt-4 inline-flex min-h-10 items-center justify-center rounded-md bg-[#ffb162] px-4 text-xs font-semibold text-[#142237] hover:bg-[#f6a34f]"
                  >
                    Crear vacante
                  </Link>
                </div>
              ) : (
                <>
                  <div className="hidden grid-cols-[minmax(0,3.2fr)_1fr_0.6fr_0.8fr_auto] gap-4 bg-[#eee8dd] px-4 py-3 text-[11px] font-semibold text-[#142237] md:grid">
                    <span>Vacante y empresa</span>
                    <span>Área laboral</span>
                    <span>Modalidad</span>
                    <span>Publicación</span>
                    <span>Oferta</span>
                  </div>
                  {filteredVacancies.map((vacancy) => (
                    <article
                      key={vacancy.id}
                      className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-3 border-t border-[#e7dfd3] px-4 py-4 first:border-t-0 md:grid-cols-[minmax(0,3.2fr)_1fr_0.6fr_0.8fr_auto] md:items-center md:gap-4"
                    >
                      <div className="min-w-0">
                        <h3 className="text-xs font-semibold text-[#142237]">
                          {vacancy.titulo}
                        </h3>
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-[#35556b]">
                          <Building2 size={12} aria-hidden="true" />
                          {vacancy.empresa}
                        </p>
                        <p className="mt-1 text-[11px] leading-4 text-[#617184]">
                          {vacancy.descripcion}
                        </p>
                        <p className="mt-1 flex items-center gap-1 text-[10px] text-[#8793a0] md:hidden">
                          <MapPin size={11} aria-hidden="true" />
                          {vacancy.ubicacion}
                        </p>
                      </div>
                      <div className="text-[11px] text-[#142237]">
                        <span className="mr-1 text-[#8793a0] md:hidden">Área:</span>
                        {vacancy.area}
                        <p className="mt-1 hidden text-[10px] text-[#8793a0] md:block">
                          {vacancy.ubicacion}
                        </p>
                      </div>
                      <p className="text-[11px] text-[#35556b]">
                        <span className="mr-1 text-[#8793a0] md:hidden">
                          Modalidad:
                        </span>
                        {vacancy.modalidad}
                      </p>
                      <p className="text-[11px] text-[#617184]">
                        <span className="mr-1 text-[#8793a0] md:hidden">
                          Publicación:
                        </span>
                        {getPublicationDate(vacancy)}
                      </p>
                      <Link
                        href={`/vacantes/${encodeURIComponent(vacancy.id)}`}
                        className="inline-flex min-h-9 items-center justify-center rounded-md border border-[#d9d0c3] bg-white px-3 text-[11px] font-semibold text-[#142237] transition hover:border-[#b87543] hover:bg-[#fcfaf6]"
                      >
                        Ver oferta
                      </Link>
                    </article>
                  ))}
                </>
              )}
            </section>
          </>
        )}
      </main>
      <PortalFooter />
    </div>
  );
}
