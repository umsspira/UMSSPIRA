import Link from 'next/link';
import { ArrowLeft, Bookmark, Info } from 'lucide-react';
import RequirementsConsultation from './requirements-consultation';
import ModeControls from './mode-controls';
import AffinityCard from './affinity-card';

export default function JobPostingDetail({ id }: { id: string }) {
  return (
    <main id="hu8-main" className="hu8-board-page hu8-detail-page">
      <div className="hu8-detail-content">
        <ModeControls />
        <Link href="/job-postings" className="hu8-board-back hu8-detail-back">
          <ArrowLeft size={16} aria-hidden="true" />
          Volver a vacantes
        </Link>
        <header className="hu8-detail-hero">
          <div className="hu8-detail-hero-top">
            <p className="hu8-detail-company">Bolsa de trabajo · Consulta por ID</p>
            <span className="hu8-detail-status">Información general pendiente</span>
          </div>
          <h1>Detalle de la vacante</h1>
          <p className="hu8-detail-hero-meta">ID consultado: {id}</p>
          <div className="hu8-detail-panorama" aria-hidden="true" />
        </header>

        <div className="hu8-detail-grid">
          <div className="hu8-detail-stack">
            <section className="hu8-detail-card">
              <h2>Acerca del puesto</h2>
              <p className="hu8-detail-muted">
                La información general de esta oferta aún no está disponible. Puedes consultar
                sus requisitos técnicos en esta página.
              </p>
              <p className="hu8-detail-muted">
                La consulta por ID no permite confirmar la existencia ni la disponibilidad de la
                vacante.
              </p>
            </section>
            <RequirementsConsultation key={id} id={id} />
            <section className="hu8-detail-card">
              <h2>Información de la empresa</h2>
              <p className="hu8-detail-muted">
                Los datos de la empresa estarán disponibles junto con la información general de la
                oferta.
              </p>
              <button className="hu8-detail-company-link" type="button" disabled>
                Ver perfil de empresa (no disponible)
              </button>
            </section>
          </div>
          <aside className="hu8-detail-sidebar" aria-label="Resumen de la oferta">
            {/* HU9: Tarjeta de afinidad con la oferta */}
            <AffinityCard vacancyId={id} />

            <section className="hu8-detail-card">
              <h2>Información de la oferta</h2>
              <dl className="hu8-detail-facts">
                <div>
                  <dt>Identificador consultado</dt>
                  <dd>{id}</dd>
                </div>
                <div>
                  <dt>Estado de la vacante</dt>
                  <dd>No disponible</dd>
                </div>
                <div>
                  <dt>Ubicación y modalidad</dt>
                  <dd>Información pendiente</dd>
                </div>
              </dl>
              <div className="hu8-detail-actions">
                <button
                  type="button"
                  className="hu8-detail-apply"
                  disabled
                  aria-describedby="hu8-actions-unavailable"
                >
                  Postular a la oferta
                </button>
                <button
                  type="button"
                  className="hu8-detail-save"
                  disabled
                  aria-describedby="hu8-actions-unavailable"
                >
                  <Bookmark size={15} aria-hidden="true" />
                  Guardar oferta
                </button>
                <p id="hu8-actions-unavailable">
                  Postulación y guardado aún no disponibles.
                </p>
              </div>
            </section>
            <div className="hu8-detail-notice">
              <Info size={17} aria-hidden="true" />
              <p>
                Las competencias se consultan de forma independiente. Si la consulta falla, puedes
                reintentar sin abandonar esta página.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
