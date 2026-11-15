'use client';

import { useEffect, useMemo, useState } from 'react';
import { BriefcaseBusiness, Building2, MapPin, RefreshCw, Search, X } from 'lucide-react';
import {
  getAvailableJobPostings,
  type AvailableJobPosting,
} from '@/shared/services/job-postings';

type SortMode = 'affinity' | 'recent' | 'title';

function affinityValue(value: number | null): string {
  return value === null ? 'No calculada' : `${value}% Afinidad`;
}

function publicationAge(value: string | null): string {
  if (!value) return 'Fecha no disponible';
  const publishedAt = new Date(value);
  if (Number.isNaN(publishedAt.getTime())) return 'Fecha no disponible';
  const elapsedDays = Math.max(0, Math.floor((Date.now() - publishedAt.getTime()) / 86400000));
  if (elapsedDays === 0) return 'Hoy';
  if (elapsedDays === 1) return 'Hace 1 día';
  if (elapsedDays < 7) return `Hace ${elapsedDays} días`;
  if (elapsedDays < 14) return 'Hace 1 semana';
  return publishedAt.toLocaleDateString('es-BO', { day: 'numeric', month: 'short' });
}

function affinityStyle(value: number | null): string {
  if (value === null) return 'bg-slate-100 text-slate-600';
  if (value >= 80) return 'bg-emerald-50 text-emerald-700';
  if (value >= 60) return 'bg-cyan-50 text-cyan-700';
  if (value >= 40) return 'bg-amber-50 text-amber-700';
  return 'bg-slate-100 text-slate-700';
}

function sortPostings(postings: AvailableJobPosting[], mode: SortMode): AvailableJobPosting[] {
  return [...postings].sort((left, right) => {
    if (mode === 'affinity') {
      const leftAffinity = left.porcentajeAfinidad;
      const rightAffinity = right.porcentajeAfinidad;
      if (leftAffinity === null && rightAffinity !== null) return 1;
      if (leftAffinity !== null && rightAffinity === null) return -1;
      if (leftAffinity !== null && rightAffinity !== null && leftAffinity !== rightAffinity) {
        return rightAffinity - leftAffinity;
      }
    }

    if (mode === 'recent') {
      const leftTime = left.fechaPublicacion ? Date.parse(left.fechaPublicacion) : 0;
      const rightTime = right.fechaPublicacion ? Date.parse(right.fechaPublicacion) : 0;
      if (leftTime !== rightTime) return rightTime - leftTime;
    }

    const titleOrder = left.titulo.localeCompare(right.titulo, 'es', { sensitivity: 'base' });
    return titleOrder || left.id.localeCompare(right.id);
  });
}

export default function JobPostingsPage() {
  const [postings, setPostings] = useState<AvailableJobPosting[]>([]);
  const [search, setSearch] = useState('');
  const [area, setArea] = useState('Todas');
  const [modality, setModality] = useState('Todas');
  const [location, setLocation] = useState('Todas');
  const [sortMode, setSortMode] = useState<SortMode>('affinity');
  const [selectedPosting, setSelectedPosting] = useState<AvailableJobPosting | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadPostings() {
      setLoading(true);
      setError(false);
      try {
        const result = await getAvailableJobPostings();
        if (!cancelled) setPostings(result);
      } catch {
        if (!cancelled) {
          setPostings([]);
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void loadPostings();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const areas = useMemo(
    () => Array.from(new Set(postings.map((posting) => posting.area).filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b, 'es')),
    [postings],
  );
  const modalities = useMemo(
    () => Array.from(new Set(postings.map((posting) => posting.modalidad).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es')),
    [postings],
  );
  const locations = useMemo(
    () => Array.from(new Set(postings.map((posting) => posting.ubicacion).filter((value): value is string => Boolean(value)))).sort((a, b) => a.localeCompare(b, 'es')),
    [postings],
  );

  const visiblePostings = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es');
    const filtered = postings.filter((posting) => {
      const searchableText = [
        posting.titulo,
        posting.empresa,
        posting.descripcion,
        posting.area ?? '',
        posting.ubicacion ?? '',
      ].join(' ').toLocaleLowerCase('es');
      return (
        (!query || searchableText.includes(query)) &&
        (area === 'Todas' || posting.area === area) &&
        (modality === 'Todas' || posting.modalidad === modality) &&
        (location === 'Todas' || posting.ubicacion === location)
      );
    });
    return sortPostings(filtered, sortMode);
  }, [postings, search, area, modality, location, sortMode]);

  function refreshPostings() {
    setRefreshing(true);
    setReloadKey((key) => key + 1);
  }

  function clearFilters() {
    setSearch('');
    setArea('Todas');
    setModality('Todas');
    setLocation('Todas');
    setSortMode('affinity');
  }

  return (
    <main className="min-h-[calc(100vh-7rem)] bg-[#f7f6f2] px-4 py-8 text-[#1b2632] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Oportunidades profesionales</p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Bolsa de trabajo</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
                Explora oportunidades y prioriza las vacantes que mejor coinciden con tu perfil.
              </p>
            </div>
            <button
              type="button"
              onClick={refreshPostings}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-[#e7e2d8] bg-white px-4 py-2.5 text-sm font-semibold shadow-sm transition hover:border-orange-300 hover:text-orange-700 disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              Actualizar resultados
            </button>
          </div>
        </header>

        <section className="rounded-2xl border border-[#ebe7df] bg-white p-4 shadow-sm sm:p-5" aria-label="Filtros de vacantes">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(240px,1.6fr)_repeat(4,minmax(145px,1fr))]">
            <label className="relative block">
              <span className="sr-only">Buscar por cargo, palabra clave o empresa</span>
              <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por cargo, palabra clave o empresa..."
                className="h-11 w-full rounded-lg border border-[#e3e7ed] bg-[#fbfcfd] pl-10 pr-3 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />
            </label>
            <label className="sr-only" htmlFor="job-area">Filtrar por área</label>
            <select id="job-area" value={area} onChange={(event) => setArea(event.target.value)} className="h-11 rounded-lg border border-[#e3e7ed] bg-white px-3 text-sm outline-none focus:border-orange-400">
              <option value="Todas">Todas las áreas</option>
              {areas.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <label className="sr-only" htmlFor="job-modality">Filtrar por modalidad</label>
            <select id="job-modality" value={modality} onChange={(event) => setModality(event.target.value)} className="h-11 rounded-lg border border-[#e3e7ed] bg-white px-3 text-sm outline-none focus:border-orange-400">
              <option value="Todas">Modalidad: Todas</option>
              {modalities.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <label className="sr-only" htmlFor="job-location">Filtrar por ciudad</label>
            <select id="job-location" value={location} onChange={(event) => setLocation(event.target.value)} className="h-11 rounded-lg border border-[#e3e7ed] bg-white px-3 text-sm outline-none focus:border-orange-400">
              <option value="Todas">Todas las ciudades</option>
              {locations.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <label className="sr-only" htmlFor="job-sort">Ordenar vacantes</label>
            <select id="job-sort" value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className="h-11 rounded-lg border border-orange-200 bg-orange-50 px-3 text-sm font-semibold text-orange-900 outline-none focus:ring-2 focus:ring-orange-100">
              <option value="affinity">Ordenar: mayor afinidad</option>
              <option value="recent">Ordenar: más recientes</option>
              <option value="title">Ordenar: título A-Z</option>
            </select>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500">
              {!error && <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">{visiblePostings.length} vacantes encontradas</span>}
              {!error && <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700"><span className="h-2 w-2 rounded-full bg-emerald-500" />Ordenadas por afinidad con tu perfil</span>}
            </div>
            {(search || area !== 'Todas' || modality !== 'Todas' || location !== 'Todas' || sortMode !== 'affinity') && (
              <button type="button" onClick={clearFilters} className="font-semibold text-slate-500 hover:text-orange-700">Limpiar filtros</button>
            )}
          </div>
        </section>

        {loading && (
          <div className="rounded-2xl border border-[#ebe7df] bg-white p-12 text-center text-sm font-medium text-slate-600" role="status">
            Cargando vacantes disponibles...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-100 bg-white p-10 text-center" role="alert">
            <p className="font-semibold text-[#1b2632]">No se pudieron cargar las vacantes.</p>
            <p className="mt-1 text-sm text-slate-500">Comprueba tu conexión e inténtalo nuevamente.</p>
            <button type="button" onClick={refreshPostings} className="mt-4 rounded-lg bg-[#1b2632] px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">Reintentar</button>
          </div>
        )}

        {!loading && !error && visiblePostings.length === 0 && (
          <div className="rounded-2xl border border-[#ebe7df] bg-white px-6 py-14 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-50 text-orange-600"><BriefcaseBusiness size={22} /></div>
            <h2 className="mt-4 text-lg font-bold">{postings.length ? 'No hay vacantes con esos filtros' : 'Aún no hay vacantes disponibles'}</h2>
            <p className="mt-1 text-sm text-slate-500">{postings.length ? 'Prueba cambiando o limpiando los filtros.' : 'Vuelve más tarde para revisar nuevas oportunidades.'}</p>
            {postings.length > 0 && <button type="button" onClick={clearFilters} className="mt-4 text-sm font-bold text-orange-700 hover:underline">Limpiar filtros</button>}
          </div>
        )}

        {!loading && !error && visiblePostings.length > 0 && (
          <>
            <div className="overflow-hidden rounded-2xl border border-[#ebe7df] bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="border-b border-[#ebe7df] bg-[#fcfbf9] text-[11px] font-bold uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="px-5 py-4">Vacante</th>
                      <th className="px-4 py-4">Empresa</th>
                      <th className="px-4 py-4">Afinidad <span aria-hidden="true">↕</span></th>
                      <th className="px-4 py-4">Descripción breve</th>
                      <th className="px-4 py-4">Área laboral</th>
                      <th className="px-4 py-4">Modalidad</th>
                      <th className="px-4 py-4">Publicación</th>
                      <th className="px-4 py-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0ede7]">
                    {visiblePostings.map((posting) => (
                      <tr key={posting.id} className="transition hover:bg-[#fffdfa]">
                        <td className="max-w-[190px] px-5 py-4">
                          <div className="font-bold text-[#1b2632]">{posting.titulo}</div>
                          <div className="mt-1 text-xs text-slate-400">{posting.nivelExperiencia}</div>
                        </td>
                        <td className="px-4 py-4 font-medium text-slate-700">{posting.empresa}</td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${affinityStyle(posting.porcentajeAfinidad)}`}>
                            {affinityValue(posting.porcentajeAfinidad)}
                          </span>
                        </td>
                        <td className="max-w-[280px] px-4 py-4 text-xs leading-5 text-slate-600">
                          <p className="line-clamp-2">{posting.descripcion || 'Descripción no disponible'}</p>
                        </td>
                        <td className="px-4 py-4 text-xs text-slate-600">{posting.area || 'Área no especificada'}</td>
                        <td className="px-4 py-4 text-xs text-slate-600">
                          <div>{posting.modalidad}</div>
                          {posting.ubicacion && <div className="mt-1 inline-flex items-center gap-1 text-slate-400"><MapPin size={12} />{posting.ubicacion}</div>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">{publicationAge(posting.fechaPublicacion)}</td>
                        <td className="px-4 py-4 text-right">
                          <button type="button" onClick={() => setSelectedPosting(posting)} className="rounded-lg border border-[#dfe4ea] bg-white px-3 py-2 text-xs font-bold text-[#1b2632] transition hover:border-orange-300 hover:bg-orange-50 hover:text-orange-800">Ver oferta</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="text-center text-xs text-slate-400">Los porcentajes se muestran cuando hay un cálculo disponible para tu perfil.</p>
          </>
        )}

        {selectedPosting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedPosting(null); }}>
            <section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8" role="dialog" aria-modal="true" aria-labelledby="posting-dialog-title">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-700"><Building2 size={20} /></div>
                  <p className="text-sm font-semibold text-orange-700">{selectedPosting.empresa}</p>
                  <h2 id="posting-dialog-title" className="mt-1 text-2xl font-extrabold text-[#1b2632]">{selectedPosting.titulo}</h2>
                </div>
                <button type="button" onClick={() => setSelectedPosting(null)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100" aria-label="Cerrar detalle"><X size={20} /></button>
              </div>
              <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                <span className={`rounded-full px-3 py-1.5 ${affinityStyle(selectedPosting.porcentajeAfinidad)}`}>{affinityValue(selectedPosting.porcentajeAfinidad)}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5">{selectedPosting.modalidad}</span>
                <span className="rounded-full bg-slate-100 px-3 py-1.5">{selectedPosting.nivelExperiencia}</span>
                {selectedPosting.ubicacion && <span className="rounded-full bg-slate-100 px-3 py-1.5">{selectedPosting.ubicacion}</span>}
              </div>
              <h3 className="mt-7 text-sm font-bold text-[#1b2632]">Descripción de la oferta</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{selectedPosting.descripcion || 'La empresa no añadió una descripción.'}</p>
              <div className="mt-7 flex justify-end">
                <button type="button" onClick={() => setSelectedPosting(null)} className="rounded-lg bg-[#1b2632] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700">Cerrar</button>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
