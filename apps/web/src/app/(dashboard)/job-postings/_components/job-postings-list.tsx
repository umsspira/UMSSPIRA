'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { MapPin, Search, SlidersHorizontal, X } from 'lucide-react';
import type { AvailableJobPosting, TechnicalRequirement } from '@umsspira/shared-types';
import { ErrorAlert } from '@/shared/components/error-alert';
import { Spinner } from '@/shared/components/spinner';
import { listAvailableJobPostings } from '@/shared/services/available-job-postings';
import {
  getVacanciesAffinityBatch,
  type JobPostingAffinityBatchItem,
} from '@/shared/services/job-posting-affinity';
import { jobPostingDetailRoute } from '@/shared/routes/job-postings';
import { descriptionWithoutRequirements } from '@/shared/utils/job-posting-requirements';

type ListState =
  | { status: 'loading' }
  | { status: 'loaded'; postings: AvailableJobPosting[] }
  | { status: 'error' };

type AffinityState =
  | { status: 'loading' }
  | { status: 'error'; message: string; retryable?: boolean }
  | { status: 'loaded'; results: Record<string, JobPostingAffinityBatchItem>; hasProfileIncomplete: boolean };

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
}

function publishedLabel(value: string | null): string {
  if (!value) return 'Fecha no disponible';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
  const daysAgo = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (daysAgo === 0) return 'Hoy';
  if (daysAgo > 0 && daysAgo < 7) return `Hace ${daysAgo} ${daysAgo === 1 ? 'día' : 'días'}`;
  if (daysAgo >= 7 && daysAgo < 30) {
    const weeksAgo = Math.floor(daysAgo / 7);
    return `Hace ${weeksAgo} ${weeksAgo === 1 ? 'semana' : 'semanas'}`;
  }
  return date.toLocaleDateString('es-BO', { day: 'numeric', month: 'short', year: 'numeric' });
}

function modalityLabel(value: string | null): string {
  if (!value) return 'No especificada';
  const labels: Record<string, string> = {
    HIBRIDO: 'Híbrido',
    PRESENCIAL: 'Presencial',
    REMOTO: 'Remoto',
  };
  return labels[value] ?? value;
}

function shortDescription(value: string | null): string {
  const clean = (descriptionWithoutRequirements(value) || value || '')
    .replace(/\*{1,2}|#{1,6}\s?/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (clean.length <= 190) return clean || 'Descripción no disponible';
  const excerpt = clean.slice(0, 187);
  const lastSpace = excerpt.lastIndexOf(' ');
  return `${excerpt.slice(0, lastSpace > 120 ? lastSpace : 187).trimEnd()}…`;
}

function requirementsFor(posting: AvailableJobPosting): TechnicalRequirement[] {
  return posting.requisitos;
}

function affinityBadge(item: JobPostingAffinityBatchItem | undefined) {
  if (!item) return { text: 'Calculando…', className: 'border-slate-200 bg-white text-slate-500' };
  if (item.error) {
    return { text: 'Error de cálculo', className: 'border-red-200 bg-red-50 text-red-700' };
  }
  const result = item.result;
  if (result.status === 'no-requirements') {
    return { text: 'Sin requisitos', className: 'border-slate-200 bg-white text-slate-500' };
  }
  if (result.status === 'profile-incomplete') {
    return { text: 'Sin calcular', className: 'border-slate-200 bg-white text-slate-500' };
  }
  if (result.status === 'ready') {
    const color = result.percentage >= 80
      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
      : result.percentage >= 50
        ? 'border-blue-200 bg-blue-50 text-blue-800'
        : 'border-amber-300 bg-amber-50 text-amber-800';
    return { text: `${result.percentage}% Afinidad`, className: color };
  }
  return {
    text: 'Sin calcular',
    className: 'border-slate-200 bg-white text-slate-500',
  };
}

export function JobPostingsList() {
  const [state, setState] = useState<ListState>({ status: 'loading' });
  const [affinityState, setAffinityState] = useState<AffinityState>({ status: 'loading' });
  const [retryCount, setRetryCount] = useState(0);
  const [affinityRetryCount, setAffinityRetryCount] = useState(0);
  const [query, setQuery] = useState('');
  const [modality, setModality] = useState('');
  const [area, setArea] = useState('');
  const [city, setCity] = useState('');
  const [sortByAffinity, setSortByAffinity] = useState(true);

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    listAvailableJobPostings().then(
      (postings) => active && setState({ status: 'loaded', postings }),
      () => active && setState({ status: 'error' }),
    );
    return () => {
      active = false;
    };
  }, [retryCount]);

  useEffect(() => {
    if (state.status !== 'loaded') return;
    if (state.postings.length === 0) {
      setAffinityState({ status: 'loaded', results: {}, hasProfileIncomplete: false });
      return;
    }
    let active = true;
    setAffinityState({ status: 'loading' });
    const ids = state.postings.map((posting) => posting.id);
    getVacanciesAffinityBatch(ids).then(
      (results) => {
        if (!active) return;
        const hasProfileIncomplete = Object.values(results).some(
          (item) => item.result?.status === 'profile-incomplete',
        );
        setAffinityState({ status: 'loaded', results, hasProfileIncomplete });
      },
      (error: unknown) => {
        if (!active) return;
        const message = error instanceof Error ? error.message : 'No se pudo cargar la afinidad.';
        setAffinityState({
          status: 'error',
          message,
          retryable: (error as any)?.status === 503 || (error as any)?.retryable !== false,
        });
      },
    );
    return () => { active = false; };
  }, [state, affinityRetryCount]);

  const postings = useMemo(
    () => (state.status === 'loaded' ? state.postings : []),
    [state],
  );
  const modalities = useMemo(
    () => Array.from(new Set(postings.map((posting) => posting.modalidad).filter((item): item is string => Boolean(item)))).sort(),
    [postings],
  );
  const areas = useMemo(
    () => Array.from(new Set(postings.map((posting) => posting.areaLaboral).filter((item): item is string => Boolean(item)))).sort(),
    [postings],
  );
  const cities = useMemo(
    () => Array.from(new Set(postings.map((posting) => posting.ubicacion).filter((item): item is string => Boolean(item)))).sort(),
    [postings],
  );
  const filtered = useMemo(() => {
    const needle = normalize(query.trim());
    const matching = postings.filter((posting) => {
      const matchesQuery = !needle || normalize(`${posting.titulo} ${posting.empresa ?? ''} ${posting.descripcionTecnica ?? ''} ${posting.areaLaboral ?? ''} ${posting.ubicacion ?? ''}`).includes(needle);
      return matchesQuery && (!modality || posting.modalidad === modality)
        && (!area || posting.areaLaboral === area) && (!city || posting.ubicacion === city);
    });
    return matching.sort((left, right) => {
      if (sortByAffinity && affinityState.status === 'loaded') {
        const leftResult = affinityState.results[left.id];
        const rightResult = affinityState.results[right.id];
        const leftScore = leftResult?.result?.status === 'ready' ? leftResult.result.percentage : -1;
        const rightScore = rightResult?.result?.status === 'ready' ? rightResult.result.percentage : -1;
        if (leftScore !== rightScore) return rightScore - leftScore;
      }

      const publicationTime = (value: string | null): number => {
        const timestamp = value ? Date.parse(value) : 0;
        return Number.isFinite(timestamp) ? timestamp : 0;
      };

      const dateDifference =
        publicationTime(right.fechaPublicacion) -
        publicationTime(left.fechaPublicacion);

      if (dateDifference !== 0) return dateDifference;

      return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
    });
  }, [postings, query, modality, area, city, sortByAffinity, affinityState]);

  const clearFilters = () => {
    setQuery('');
    setModality('');
    setArea('');
    setCity('');
  };

  return (
    <main className="min-h-screen bg-[#F7F5EF] px-4 py-6 text-[#172238] sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto max-w-[1500px]">
        <nav aria-label="Ruta de navegación" className="mb-4 text-xs text-slate-500">
          <Link href="/portal" className="hover:text-slate-800">Inicio</Link>
          <span className="mx-3" aria-hidden="true">›</span>
          <span aria-current="page" className="font-semibold text-slate-800">Vacantes disponibles</span>
        </nav>

        <header className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Bolsa de trabajo</h1>
          <p className="mt-1 max-w-4xl text-sm leading-5 text-slate-600">
            Explora oportunidades laborales adaptadas a tu perfil académico y profesional con cálculo automático de afinidad.
          </p>
                    <button
            type="button"
            disabled={state.status === 'loading'}
            onClick={() => setRetryCount((count) => count + 1)}
            className="mt-3 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            Actualizar vacantes
          </button>
        </header>

        {state.status === 'loading' && (
          <section aria-label="Vacantes disponibles" className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <Spinner size="lg" text="Cargando vacantes disponibles. Espera un momento..." className="py-8" />
          </section>
        )}

        {state.status === 'error' && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <ErrorAlert
              title="No pudimos cargar las vacantes"
              message="Ocurrió un problema al buscar vacantes disponibles."
              onRetry={() => setRetryCount((count) => count + 1)}
            />
          </section>
        )}

        {state.status === 'loaded' && (
          <>
            <section aria-label="Filtros de vacantes" className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,2fr)_minmax(130px,.95fr)_minmax(140px,1fr)_minmax(140px,1fr)_minmax(190px,auto)]">
                <label className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 text-slate-400 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100">
                  <Search size={16} aria-hidden="true" />
                  <span className="sr-only">Buscar vacante</span>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Buscar por cargo, palabra clave o empresa..."
                    className="min-w-0 flex-1 bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400"
                  />
                </label>
                <label className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 text-slate-600">
                  <SlidersHorizontal size={16} aria-hidden="true" />
                  <span className="sr-only">Filtrar por área laboral</span>
                  <select aria-label="Filtrar por área laboral" value={area} onChange={(event) => setArea(event.target.value)} className="w-full bg-transparent text-xs outline-none">
                    <option value="">Todas las áreas</option>
                    {areas.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 text-slate-600">
                  <SlidersHorizontal size={16} aria-hidden="true" />
                  <span className="sr-only">Filtrar por modalidad</span>
                  <select value={modality} onChange={(event) => setModality(event.target.value)} className="w-full bg-transparent text-xs outline-none">
                    <option value="">Modalidad: Todas</option>
                    {modalities.map((item) => <option key={item} value={item}>{modalityLabel(item)}</option>)}
                  </select>
                </label>
                <label className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 text-slate-600">
                  <MapPin size={16} aria-hidden="true" />
                  <span className="sr-only">Filtrar por ciudad</span>
                  <select aria-label="Filtrar por ciudad" value={city} onChange={(event) => setCity(event.target.value)} className="w-full bg-transparent text-xs outline-none">
                    <option value="">Todas las ciudades</option>
                    {cities.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>
                <label className="flex min-h-10 items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3 text-xs font-semibold text-orange-950">
                  <span aria-hidden="true">✦</span>
                  <span className="sr-only">Ordenar vacantes</span>
                  <select aria-label="Ordenar vacantes" disabled={postings.length === 0} value={sortByAffinity ? 'affinity' : 'recent'} onChange={(event) => setSortByAffinity(event.target.value === 'affinity')} className="w-full bg-transparent outline-none">
                    <option value="affinity">Ordenar: mayor afinidad</option>
                    <option value="recent">Ordenar: más recientes</option>
                  </select>
                </label>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-slate-100 pt-3 text-xs">
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                  {filtered.length} {filtered.length === 1 ? 'vacante encontrada' : 'vacantes encontradas'}
                </span>
                <span className="text-slate-400" aria-hidden="true">•</span>
                <span className={sortByAffinity && affinityState.status === 'loaded' && !affinityState.hasProfileIncomplete ? 'text-emerald-700' : 'text-slate-500'}>
                  {!sortByAffinity
                    ? 'Ordenadas por fecha de publicación'
                    : affinityState.status === 'loading'
                      ? 'Calculando afinidad con tu perfil…'
                      : affinityState.status === 'loaded' && !affinityState.hasProfileIncomplete
                        ? 'Ordenadas automáticamente según afinidad con tu perfil'
                        : affinityState.status === 'loaded'
                          ? 'Selecciona temas técnicos en Mentorías para calcular la afinidad'
                          : `No se pudo cargar el perfil del titulado: ${affinityState.message}`}
                </span>
                {affinityState.status === 'error' && (
                  <button
                    type="button"
                    onClick={() => setAffinityRetryCount((count) => count + 1)}
                    className="font-semibold text-orange-800 underline underline-offset-2"
                  >
                    Reintentar afinidad
                  </button>
                )}
                {affinityState.status === 'loaded' && affinityState.hasProfileIncomplete && (
                  <Link href="/mentorship/onboarding" className="font-semibold text-orange-800 underline underline-offset-2">
                    Configura temas técnicos en Mentorías
                  </Link>
                )}
                {(query || modality || area || city) && (
                  <button type="button" onClick={clearFilters} className="ml-auto inline-flex items-center gap-1 text-slate-500 hover:text-slate-900">
                    <X size={16} aria-hidden="true" /> Limpiar filtros
                  </button>
                )}
              </div>
            </section>

            {postings.length === 0 ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                <h2 className="text-xl font-semibold">Aún no hay vacantes disponibles</h2>
                <Link href="/portal" className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-[#172238] px-5 font-semibold text-white hover:bg-slate-700">
                  Volver al inicio
                </Link>
              </section>
            ) : filtered.length === 0 ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                <h2 className="text-lg font-semibold">No encontramos vacantes con esos filtros</h2>
                <button type="button" onClick={clearFilters} className="mt-4 font-semibold text-orange-700 underline underline-offset-4">Limpiar filtros</button>
              </section>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px] table-fixed border-collapse text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600">
                      <tr>
                        <th scope="col" className="w-[13%] px-3 py-3 font-semibold">Vacante</th>
                        <th scope="col" className="w-[10%] px-3 py-3 font-semibold">Empresa</th>
                        <th scope="col" className="w-[11%] border-x border-orange-100 bg-orange-50/60 px-3 py-3 font-semibold text-orange-950">Afinidad</th>
                        <th scope="col" className="w-[20%] px-3 py-3 font-semibold">Descripción breve</th>
                        <th scope="col" className="w-[12%] px-3 py-3 font-semibold">Área laboral</th>
                        <th scope="col" className="w-[13%] px-3 py-3 font-semibold">Modalidad</th>
                        <th scope="col" className="w-[12%] px-3 py-3 font-semibold">Publicación</th>
                        <th scope="col" className="w-[9%] px-3 py-3 text-right font-semibold">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filtered.map((posting) => (
                        <tr key={posting.id} className="align-middle hover:bg-slate-50/70">
                          <th scope="row" className="break-words px-3 py-4 font-bold text-slate-900">{posting.titulo}</th>
                          <td className="break-words px-3 py-4 text-slate-700">{posting.empresa ?? 'Empresa no disponible'}</td>
                          <td className="border-x border-orange-100 bg-orange-50/30 px-2 py-4">
                            {affinityState.status === 'error' ? (
                              <span className="inline-flex whitespace-nowrap rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800">Sin calcular</span>
                            ) : (
                              (() => {
                                const badge = affinityBadge(affinityState.status === 'loaded' ? affinityState.results[posting.id] : undefined);
                                return <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-semibold ${badge.className}`}>{badge.text}</span>;
                              })()
                            )}
                          </td>
                          <td className="break-words px-3 py-4 leading-4 text-slate-600">{shortDescription(posting.descripcionTecnica)}</td>
                          <td className="break-words px-3 py-4 text-slate-600">{posting.areaLaboral ?? 'No especificada'}</td>
                          <td className="break-words px-3 py-4 text-slate-600">{modalityLabel(posting.modalidad)}{posting.ubicacion ? ` (${posting.ubicacion})` : ''}</td>
                          <td className="px-3 py-4 text-slate-500">{publishedLabel(posting.fechaPublicacion)}</td>
                          <td className="px-2 py-4 text-right">
                            <Link href={jobPostingDetailRoute(posting.id)} className="inline-flex min-h-8 items-center rounded-md border border-slate-300 px-2 text-[10px] font-medium text-slate-700 transition hover:border-slate-500 hover:bg-slate-50">Ver oferta</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
