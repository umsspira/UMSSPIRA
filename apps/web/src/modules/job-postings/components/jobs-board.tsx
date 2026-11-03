'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, BriefcaseBusiness, ChevronDown, CloudOff, Info, RefreshCw, Search, UserRound } from 'lucide-react';
import {
  EMPTY_FILTERS, filterOptions, filterVacancies, publicationDate, sortVacancies,
  type VacancyFilterField, type VacancyFilters, type VacancyListItem, type VacancySort,
} from '../utils/listing';

export type VacancyListingState =
  | { status: 'unavailable' }
  | { status: 'loading' }
  | { status: 'ready'; vacancies: readonly VacancyListItem[] }
  | { status: 'error'; message: string; onRetry: () => void };

const UNAVAILABLE: VacancyListingState = { status: 'unavailable' };
const filterFields: { field: VacancyFilterField; label: string; placeholder: string }[] = [
  { field: 'area', label: 'Área laboral', placeholder: 'Área: todas' },
  { field: 'modalidad', label: 'Modalidad de trabajo', placeholder: 'Modalidad: todas' },
  { field: 'ubicacion', label: 'Ubicación', placeholder: 'Ubicación: todas' },
];

/** No listing requests until the team supplies an official data source. */
export default function JobsBoard({ state = UNAVAILABLE, onRefresh, onConsultById, lookupOpen = false, offerHref, dateLabel = 'Publicación', notice }: {
  state?: VacancyListingState;
  onRefresh?: () => void;
  onConsultById?: () => void;
  lookupOpen?: boolean;
  offerHref?: (id: string) => string;
  dateLabel?: string;
  notice?: string;
}) {
  const [filters, setFilters] = useState<VacancyFilters>({ ...EMPTY_FILTERS });
  const [order, setOrder] = useState<VacancySort>('recent');
  const source = state.status === 'ready' ? state.vacancies : [];
  const vacancies = sortVacancies(filterVacancies(source, filters), order);
  const loading = state.status === 'loading';
  const ready = state.status === 'ready';
  const hasFilters = Object.values(filters).some((value) => value.trim());
  const PublicationArrow = order === 'recent' ? ArrowDown : ArrowUp;
  const updateFilter = (field: keyof VacancyFilters, value: string) => setFilters((current) => ({ ...current, [field]: value }));

  return (
    <>
      <Link href="/" className="hu8-board-back"><ArrowLeft size={16} aria-hidden="true" />Inicio</Link>
      <header className="hu8-board-heading">
        <div className="hu8-board-identity">
          <span className="hu8-board-briefcase"><BriefcaseBusiness size={25} strokeWidth={1.4} aria-hidden="true" /></span>
          <div><h1 className="hu8-board-title">Bolsa de trabajo</h1><p className="hu8-board-description">Explora las vacantes y consulta las competencias requeridas.</p></div>
        </div>
        <div className="hu8-board-headingActions">
          <button id="hu8-consult-by-id" type="button" onClick={onConsultById} disabled={!onConsultById} aria-expanded={lookupOpen} aria-controls="hu8-id-consultation" className="hu8-board-button">Consultar por ID</button>
          <button type="button" disabled className="hu8-board-button" title="El perfil todavía no está disponible"><UserRound size={15} aria-hidden="true" />Mi perfil</button>
        </div>
      </header>

      <section aria-label="Filtros de vacantes" className="hu8-board-filters" aria-describedby={state.status === 'unavailable' ? 'hu8-listing-notice' : undefined}>
        <div className="hu8-board-filter">
          <label htmlFor="vacancy-search" className="hu8-board-label">Buscar vacantes</label>
          <div className="hu8-board-fieldWrap">
            <Search size={16} aria-hidden="true" className="hu8-board-fieldIcon" />
            <input id="vacancy-search" type="search" placeholder="Buscar por título o empresa" className="hu8-board-field" value={filters.query} onChange={(event) => updateFilter('query', event.target.value)} disabled={!ready} />
          </div>
        </div>
        {filterFields.map(({ field, label, placeholder }) => (
          <div className="hu8-board-filter" key={field}>
            <label htmlFor={`vacancy-${field}`} className="hu8-board-label">{label}</label>
            <div className="hu8-board-fieldWrap">
              <ChevronDown size={16} aria-hidden="true" className="hu8-board-fieldIcon" />
              <select id={`vacancy-${field}`} className="hu8-board-field" disabled={!ready} value={filters[field]} onChange={(event) => updateFilter(field, event.target.value)}>
                <option value="">{placeholder}</option>
                {filterOptions(source, field, filters[field]).map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>
          </div>
        ))}
      </section>
      {hasFilters && ready && <div className="hu8-board-filterActions"><button type="button" className="hu8-board-textButton" onClick={() => setFilters({ ...EMPTY_FILTERS })}>Limpiar filtros</button></div>}

      <div role="note" className="hu8-board-information" id="hu8-listing-notice">
        <Info size={18} aria-hidden="true" />
        <p className="flex-1">{notice ?? (state.status === 'unavailable'
          ? 'La consulta del listado aún no está habilitada. Puedes consultar requisitos por ID.'
          : loading ? 'Consultando las ofertas…'
            : state.status === 'error' ? 'No se pudo completar la consulta de vacantes.' : 'Consulta las ofertas y sus competencias requeridas.')}</p>
        <button type="button" disabled={!ready || !onRefresh} onClick={onRefresh} className="hu8-board-refresh" aria-label="Actualizar listado" title={state.status === 'unavailable' ? 'Listado pendiente de integración' : 'Actualizar listado'}>
          <RefreshCw size={17} aria-hidden="true" />
        </button>
      </div>

      <section aria-label="Vacantes disponibles" aria-busy={loading}>
        <div className="hu8-board-toolbar">
          <p className="hu8-board-count" aria-live="polite">{ready ? `${vacancies.length} ${vacancies.length === 1 ? 'vacante' : 'vacantes'}` : loading ? 'Consultando vacantes…' : 'Listado no disponible'}</p>
          <div className="hu8-board-fieldWrap hu8-board-sort">
            <ChevronDown size={16} aria-hidden="true" className="hu8-board-fieldIcon" />
            <label htmlFor="vacancy-order" className="sr-only">{dateLabel === 'Registro (demo)' ? 'Orden de registro' : 'Orden de publicación'}</label>
            <select id="vacancy-order" className="hu8-board-field" disabled={!ready} value={order} onChange={(event) => setOrder(event.target.value as VacancySort)}>
              <option value="recent">Ordenar: más recientes</option><option value="oldest">Ordenar: más antiguas</option>
            </select>
          </div>
        </div>
        {loading && <p role="status" className="sr-only">Cargando vacantes</p>}
        {state.status === 'error' ? (
          <div role="alert" className="hu8-board-state hu8-board-loadError">
            <span className="hu8-board-errorIcon"><CloudOff size={34} aria-hidden="true" /></span>
            <h2>No pudimos cargar las vacantes</h2><p>{state.message}</p>
            <button type="button" onClick={state.onRetry} className="hu8-board-button hu8-board-errorRetry">Reintentar listado</button>
          </div>
        ) : (
          <div role="region" aria-label="Tabla de vacantes" tabIndex={0} className="hu8-board-tableWrap">
            <table className="hu8-board-table">
              <caption className="sr-only">Vacantes y empresas con acceso a la oferta y sus requisitos técnicos</caption>
              <colgroup><col style={{ width: '43%' }} /><col style={{ width: '18%' }} /><col style={{ width: '12%' }} /><col style={{ width: '14%' }} /><col style={{ width: '13%' }} /></colgroup>
              <thead><tr><th scope="col">Vacante y empresa</th><th scope="col">Área laboral</th><th scope="col">Modalidad</th><th scope="col" aria-sort={order === 'recent' ? 'descending' : 'ascending'}><span className="inline-flex items-center gap-1">{dateLabel}<PublicationArrow size={14} aria-hidden="true" /></span></th><th scope="col">Oferta</th></tr></thead>
              <tbody>
                {loading ? [1, 2, 3, 4].map((row) => (
                  <tr key={row} aria-hidden="true">{[1, 2, 3, 4, 5].map((column) => <td key={column}><div className="hu8-board-skeleton" />{column === 1 && <div className="hu8-board-skeleton hu8-board-skeletonSecondary" />}</td>)}</tr>
                )) : state.status === 'unavailable' ? (
                  <tr><td colSpan={5}><div className="hu8-listing-unavailable"><BriefcaseBusiness size={32} aria-hidden="true" /><h2>Listado aún no disponible</h2><p>Las ofertas aparecerán aquí cuando se habilite su consulta. Mientras tanto, utiliza el botón superior «Consultar por ID».</p></div></td></tr>
                ) : vacancies.length === 0 ? (
                  <tr><td colSpan={5}><div className="hu8-listing-unavailable" role="status"><Search size={32} aria-hidden="true" /><h2>{hasFilters ? 'No encontramos vacantes' : 'Sin vacantes'}</h2><p>{hasFilters ? 'Prueba con otros filtros.' : 'La consulta no devolvió vacantes.'}</p>{hasFilters && <button type="button" className="hu8-board-textButton" onClick={() => setFilters({ ...EMPTY_FILTERS })}>Limpiar filtros</button>}</div></td></tr>
                ) : vacancies.map((vacancy) => {
                  const publication = publicationDate(vacancy.fechaPublicacion ?? vacancy.fechaRegistro);
                  return (
                    <tr key={vacancy.id}>
                      <td><p className="hu8-board-vacancyTitle">{vacancy.titulo}</p><p className="hu8-board-company">{vacancy.empresa}</p>{vacancy.descripcion && <p className="hu8-board-summary">{vacancy.descripcion}</p>}</td>
                      <td>{vacancy.area || 'No especificada'}{vacancy.ubicacion && <span className="hu8-board-location">{vacancy.ubicacion}</span>}</td>
                      <td className="hu8-board-modality">{vacancy.modalidad || 'No especificada'}</td>
                      <td className="hu8-board-publication">{publication.dateTime ? <time dateTime={publication.dateTime}>{publication.label}</time> : publication.label}</td>
                      <td><Link href={offerHref ? offerHref(vacancy.id) : `/job-postings/${encodeURIComponent(vacancy.id)}`} aria-label={`Ver oferta: ${vacancy.titulo}`} className="hu8-board-button hu8-board-offer">Ver oferta</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
