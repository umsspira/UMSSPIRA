'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bookmark, BriefcaseBusiness, CircleAlert, FileText, Info, MapPin, RefreshCw } from 'lucide-react';
import JobsListingView from '../components/jobs-listing-view';
import ModeControls from '../components/mode-controls';
import type { VacancyListingState } from '../components/jobs-board';
import { publicationDate } from '../utils/listing';
import { getDemoVacancies } from './fixtures';
import { demoHref, type DemoScenario } from './mode';
import type { DemoVacancy } from './types';

function demoRows(scenario: DemoScenario, refreshed: boolean) {
  return getDemoVacancies(scenario === 'actualizado' || refreshed).map((vacancy) => ({
    id: vacancy.id, titulo: vacancy.titulo, empresa: vacancy.empresa,
    area: vacancy.area, modalidad: vacancy.modalidad, ubicacion: vacancy.ubicacion,
    descripcion: vacancy.descripcion, fechaRegistro: vacancy.fechaCreacion,
  }));
}

function DemoIdLookup({ scenario }: { scenario: DemoScenario }) {
  const [id, setId] = useState('');
  const [selected, setSelected] = useState<DemoVacancy | null>(null);
  const [error, setError] = useState('');
  return (
    <section className="hu8-detail-card hu8-consultation-lookup" aria-labelledby="demo-id-title">
      <h2 id="demo-id-title">Consultar una vacante de demostración por ID</h2>
      <p>Este formulario utiliza únicamente los ejemplos locales. Elige un ID para abrir su detalle.</p>
      <form className="hu8-consultation-form" aria-label="Consulta por ID de demostración" onSubmit={(event) => {
        event.preventDefault();
        const vacancy = getDemoVacancies(true).find((item) => item.id.toLowerCase() === id.trim().toLowerCase());
        setSelected(vacancy ?? null);
        setError(!id.trim() ? 'Ingresa el ID de una vacante de demostración.' : vacancy ? '' : 'Vacante de demostración no encontrada.');
      }}>
        <div className="hu8-consultation-input">
          <label htmlFor="demo-vacancy-id" className="hu8-board-label">ID de la vacante de demostración</label>
          <input id="demo-vacancy-id" list="hu8-demo-ids" className="hu8-board-field hu8-demo-id-field" value={id} onChange={(event) => { setId(event.target.value); setSelected(null); setError(''); }} aria-invalid={Boolean(error)} aria-describedby={error ? 'demo-id-error' : undefined} />
          <datalist id="hu8-demo-ids">{getDemoVacancies(true).map((item) => <option key={item.id} value={item.id}>{item.titulo}</option>)}</datalist>
        </div>
        <button type="submit" className="hu8-board-button hu8-consultation-submit">Consultar</button>
      </form>
      {error && <p id="demo-id-error" role="alert">{error}</p>}
      {selected && <p>{selected.titulo} · <Link href={demoHref(`/job-postings/${selected.id}`, scenario)} className="hu8-board-textButton">Ver oferta</Link></p>}
    </section>
  );
}

export function DemoJobsPage({ scenario }: { scenario: DemoScenario }) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<VacancyListingState>({ status: 'loading' });
  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    if (scenario === 'carga') return;
    const timer = setTimeout(() => {
      if (scenario === 'error' && attempt === 0) {
        setState({ status: 'error', message: 'Error simulado de consulta. Reintenta para recuperar el listado de demostración.', onRetry: reload });
      } else {
        setState({ status: 'ready', vacancies: scenario === 'sin-vacantes' ? [] : demoRows(scenario, attempt > 0) });
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [scenario, attempt, reload]);

  return <JobsListingView
    controls={<ModeControls scenario={scenario} />}
    lookup={<DemoIdLookup scenario={scenario} />}
    state={state} onRefresh={reload} offerHref={(id) => demoHref(`/job-postings/${encodeURIComponent(id)}`, scenario)}
    dateLabel="Registro (demo)"
    notice="Datos de demostración: los filtros y la navegación trabajan con ejemplos locales, sin consultar servicios reales."
  />;
}

type DemoDetailState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'not-found' }
  | { status: 'ready'; vacancy: DemoVacancy };

function DemoRequirements({ vacancy, empty }: { vacancy: DemoVacancy; empty: boolean }) {
  const seen = new Set<string>();
  const requirements = empty ? [] : vacancy.requisitos.filter((item) => {
    const key = item.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return (
    <section className="hu8-detail-card" aria-labelledby="demo-competencies-title">
      <h2 id="demo-competencies-title"><FileText size={18} aria-hidden="true" />Competencias requeridas</h2>
      {requirements.length ? <ul className="hu8-detail-bullets hu8-detail-requirements">{requirements.map((item) => <li key={item.id}>{item.nombre}</li>)}</ul> : <p>Esta vacante de demostración no requiere conocimientos técnicos específicos.</p>}
      {!empty && vacancy.detailContent.desirable && <div className="hu8-detail-desirable"><h3>Competencia deseable</h3><p>{vacancy.detailContent.desirable}</p></div>}
    </section>
  );
}

function DemoDetailContent({ vacancy, scenario }: { vacancy: DemoVacancy; scenario: DemoScenario }) {
  const content = vacancy.detailContent;
  const registered = publicationDate(vacancy.fechaCreacion);
  const closing = publicationDate(content.closingDate);
  return (
    <>
      <header className="hu8-detail-hero">
        <div className="hu8-detail-hero-top"><p className="hu8-detail-company">{vacancy.empresa}</p><span className="hu8-detail-status hu8-detail-status-open">Disponible · Demo</span></div>
        <h1>{vacancy.titulo}</h1>
        <p className="hu8-detail-location"><MapPin size={20} aria-hidden="true" />{content.locationDetail || vacancy.ubicacion} · {vacancy.modalidad}</p>
        <p className="hu8-detail-hero-meta">{[vacancy.area, content.experience, content.schedule].filter(Boolean).join(' · ')}</p>
        <div className="hu8-detail-panorama" aria-hidden="true" />
      </header>
      <div className="hu8-detail-grid">
        <div className="hu8-detail-stack">
          <section className="hu8-detail-card"><h2>Acerca del puesto</h2><p>{vacancy.descripcion}</p>{content.about?.map((text) => <p key={text}>{text}</p>)}{content.experienceNote && <p className="hu8-detail-muted">{content.experienceNote}</p>}</section>
          {!!content.responsibilities?.length && <section className="hu8-detail-card"><h2><BriefcaseBusiness size={18} aria-hidden="true" />Responsabilidades</h2><ul className="hu8-detail-bullets">{content.responsibilities.map((text) => <li key={text}>{text}</li>)}</ul></section>}
          <DemoRequirements vacancy={vacancy} empty={scenario === 'sin-requisitos'} />
          {!!content.benefits?.length && <section className="hu8-detail-card"><h2>Lo que ofrecemos</h2><ul className="hu8-detail-bullets">{content.benefits.map((text) => <li key={text}>{text}</li>)}</ul></section>}
          <section className="hu8-detail-card"><h2>{vacancy.empresa}</h2>{content.companyDescription && <p>{content.companyDescription}</p>}{content.companyFacts && <p className="hu8-detail-company-facts">{content.companyFacts}</p>}<button type="button" className="hu8-detail-company-link" disabled>Ver perfil de empresa (no disponible)</button></section>
        </div>
        <aside className="hu8-detail-sidebar" aria-label="Resumen de la oferta">
          <section className="hu8-detail-card">
            <h2>Información de la oferta</h2>
            <dl className="hu8-detail-facts">
              <div><dt>ID de demostración</dt><dd>{vacancy.id}</dd></div>
              <div><dt>Ubicación</dt><dd>{content.locationDetail || vacancy.ubicacion}</dd></div>
              <div><dt>Modalidad</dt><dd>{vacancy.modalidad}</dd></div>
              <div><dt>Área laboral</dt><dd>{vacancy.area}</dd></div>
              {content.experience && <div><dt>Experiencia</dt><dd>{content.experience}</dd></div>}
              {content.schedule && <div><dt>Jornada</dt><dd>{content.schedule}</dd></div>}
              <div><dt>Registro (demo)</dt><dd><time dateTime={registered.dateTime}>{registered.label}</time></dd></div>
              {closing.dateTime && <div><dt>Cierre (demo)</dt><dd><time dateTime={closing.dateTime}>{closing.label}</time></dd></div>}
            </dl>
            <div className="hu8-detail-actions"><button type="button" className="hu8-detail-apply" disabled>Postular a la oferta</button><button type="button" className="hu8-detail-save" disabled><Bookmark size={15} aria-hidden="true" />Guardar oferta</button><p>La demostración permite consultar; no crea postulaciones ni guarda ofertas.</p></div>
          </section>
          <div className="hu8-detail-notice"><Info size={17} aria-hidden="true" /><p>Datos de demostración. Los nombres, fechas y competencias son ejemplos del frontend anterior; no proceden de Supabase.</p></div>
        </aside>
      </div>
    </>
  );
}

export function DemoJobDetail({ id, scenario }: { id: string; scenario: DemoScenario }) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<DemoDetailState>({ status: 'loading' });
  useEffect(() => {
    if (scenario === 'carga') return;
    const timer = setTimeout(() => {
      if (scenario === 'error' && attempt === 0) { setState({ status: 'error' }); return; }
      const vacancy = scenario === 'inexistente' ? undefined : getDemoVacancies(true).find((item) => item.id.toLowerCase() === id.toLowerCase());
      setState(vacancy ? { status: 'ready', vacancy } : { status: 'not-found' });
    }, 250);
    return () => clearTimeout(timer);
  }, [id, scenario, attempt]);
  return (
    <main id="hu8-main" className="hu8-board-page hu8-detail-page">
      <div className="hu8-detail-content">
        <ModeControls scenario={scenario} path={`/job-postings/${encodeURIComponent(id)}`} />
        <Link href={demoHref('/job-postings', scenario)} className="hu8-board-back hu8-detail-back"><ArrowLeft size={16} aria-hidden="true" />Volver a vacantes</Link>
        {state.status === 'loading' ? (
          <section aria-busy="true"><h1 className="sr-only">Detalle de vacante de demostración</h1><p role="status">Cargando detalle de demostración...</p><div className="hu8-detail-hero hu8-detail-loading-hero" aria-hidden="true"><div className="hu8-board-skeleton" /><div className="hu8-board-skeleton hu8-demo-hero-skeleton" /></div><div className="hu8-detail-grid" aria-hidden="true"><div className="hu8-detail-card hu8-demo-card-skeleton"><div className="hu8-board-skeleton" /></div><div className="hu8-detail-card hu8-demo-card-skeleton"><div className="hu8-board-skeleton" /></div></div></section>
        ) : state.status === 'ready' ? <DemoDetailContent vacancy={state.vacancy} scenario={scenario} /> : (
          <section className="hu8-board-state" role={state.status === 'error' ? 'alert' : 'status'}>
            <CircleAlert size={36} aria-hidden="true" className="hu8-board-stateIcon" />
            <h1>{state.status === 'error' ? 'No se pudo cargar la vacante' : 'Vacante no encontrada'}</h1>
            <p>{state.status === 'error' ? 'Error simulado de consulta. Reintenta para recuperar el detalle de demostración.' : 'Esta vacante no existe entre los datos de demostración.'}</p>
            {state.status === 'error' && <button type="button" className="hu8-board-button hu8-board-errorRetry" onClick={() => { setState({ status: 'loading' }); setAttempt((value) => value + 1); }}><RefreshCw size={16} aria-hidden="true" />Reintentar</button>}
            <Link href={demoHref('/job-postings', 'listado')} className="hu8-board-button">Volver al listado de demostración</Link>
          </section>
        )}
      </div>
    </main>
  );
}
